import { DNDContext } from '@affine/component';
import { AffineOtherPageLayout } from '@affine/component/affine-other-page-layout';
import { workbenchRoutes } from '@affine/core/desktop/workbench-router';
import {
  DefaultServerService,
  ServersService,
} from '@affine/core/modules/cloud';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { DndService } from '@affine/core/modules/dnd/services';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { OpenInAppGuard } from '@affine/core/modules/open-in-app';
import {
  getAFFiNEWorkspaceSchema,
  type Workspace,
  type WorkspaceMetadata,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { ZipTransformer } from '@blocksuite/affine/widgets/linked-doc';
import {
  FrameworkScope,
  LiveData,
  useLiveData,
  useService,
  useServices,
} from '@toeverything/infra';
import type { PropsWithChildren, ReactElement } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  matchPath,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { map } from 'rxjs';
import * as _Y from 'yjs';

import { AffineErrorBoundary } from '../../../components/affine/affine-error-boundary';
import { WorkbenchRoot } from '../../../modules/workbench';
import { AppContainer } from '../../components/app-container';
import { PageNotFound } from '../404';
import { WorkspaceLayout } from './layouts/workspace-layout';
import { SharePage } from './share/share-page';
import { PresentationRoomPage } from './present';
import { CopilotContextProvider } from '../../components/copilot/copilot-context-provider';
import { WorkspaceCopilotDrawer } from '../../components/copilot/workspace-copilot-drawer';

declare global {
  // eslint-disable-next-line no-var
  var currentWorkspace: Workspace | undefined;
  // eslint-disable-next-line no-var
  var exportWorkspaceSnapshot: (docs?: string[]) => Promise<void>;
  // eslint-disable-next-line no-var
  var importWorkspaceSnapshot: () => Promise<void>;
  // eslint-disable-next-line no-var
  var Y: typeof _Y;
  interface WindowEventMap {
    'affine:workspace:change': CustomEvent<{ id: string }>;
  }
}

globalThis.Y = _Y;

export const Component = (): ReactElement => {
  const {
    workspacesService,
    globalDialogService,
    serversService,
    defaultServerService,
    globalContextService,
    featureFlagService,
  } = useServices({
    WorkspacesService,
    GlobalDialogService,
    ServersService,
    DefaultServerService,
    GlobalContextService,
    FeatureFlagService,
  });

  const params = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const enableLocal = useLiveData(
    featureFlagService.flags.enable_local_workspace.$
  );

  // check if we are in detail doc route, if so, maybe render share page
  const detailDocRoute = useMemo(() => {
    const match = matchPath(
      '/workspace/:workspaceId/:docId',
      location.pathname
    );
    if (
      match &&
      match.params.docId &&
      match.params.workspaceId &&
      // TODO(eyhn): need a better way to check if it's a docId
      workbenchRoutes.find(route =>
        matchPath(route.path, '/' + match.params.docId)
      )?.path === '/:pageId'
    ) {
      return {
        docId: match.params.docId,
        workspaceId: match.params.workspaceId,
      };
    } else {
      return null;
    }
  }, [location.pathname]);

  const [workspaceNotFound, setWorkspaceNotFound] = useState(false);
  const listLoading = useLiveData(workspacesService.list.isRevalidating$);
  const workspaces = useLiveData(workspacesService.list.workspaces$);
  const isShareProjectsMode = useMemo(() => {
    return location.pathname.includes('/projects') && (location.search.includes('shareKey=') || !!searchParams.get('shareKey'));
  }, [location.pathname, location.search, searchParams]);

  const meta = useMemo(() => {
    let found = workspaces.find(({ id }) => id === params.workspaceId);
    if (!found && isShareProjectsMode && params.workspaceId) {
      found = {
        id: params.workspaceId,
        flavour: 'affine-cloud',
        version: 1,
      } as any;
    }
    if (found && found.flavour === 'local' && !enableLocal) {
      return undefined;
    }
    return found;
  }, [workspaces, params.workspaceId, enableLocal, isShareProjectsMode]);

  // if listLoading is false, we can show 404 page, otherwise we should show loading page.
  useEffect(() => {
    if (listLoading === false && meta === undefined) {
      setWorkspaceNotFound(true);
    }
    if (meta) {
      setWorkspaceNotFound(false);
    }
  }, [listLoading, meta, workspacesService]);

  // if workspace is not found, we should retry
  const retryTimesRef = useRef(3);
  useEffect(() => {
    if (params.workspaceId) {
      retryTimesRef.current = 3; // reset retry times
      workspacesService.list.revalidate();
    }
  }, [params.workspaceId, workspacesService]);
  useEffect(() => {
    if (listLoading === false && meta === undefined) {
      const timer = setTimeout(() => {
        if (retryTimesRef.current > 0) {
          workspacesService.list.revalidate();
          retryTimesRef.current--;
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
    return;
  }, [listLoading, meta, workspaceNotFound, workspacesService]);

  // server search params
  const serverFromSearchParams = useLiveData(
    searchParams.has('server')
      ? serversService.serverByBaseUrl$(searchParams.get('server') as string)
      : undefined
  );
  // server from workspace
  const serverFromWorkspace = useLiveData(
    meta?.flavour && meta.flavour !== 'local'
      ? serversService.server$(meta?.flavour)
      : undefined
  );
  const server = serverFromWorkspace ?? serverFromSearchParams;

  useEffect(() => {
    if (server) {
      globalContextService.globalContext.serverId.set(server.id);
      return () => {
        globalContextService.globalContext.serverId.set(
          defaultServerService.server.id
        );
      };
    }
    return;
  }, [
    defaultServerService.server.id,
    globalContextService.globalContext.serverId,
    server,
  ]);

  // if server is not found, and we have server in search params, we should show add selfhosted dialog
  const needAddSelfhosted = server === undefined && searchParams.has('server');
  // use ref to avoid useEffect trigger twice
  const addSelfhostedDialogOpened = useRef<boolean>(false);

  useEffect(() => {
    if (addSelfhostedDialogOpened.current) {
      return;
    }
    addSelfhostedDialogOpened.current = true;
    if (BUILD_CONFIG.isElectron && needAddSelfhosted) {
      globalDialogService.open('sign-in', {
        server: searchParams.get('server') as string,
      });
    }
    return;
  }, [
    globalDialogService,
    needAddSelfhosted,
    searchParams,
    serverFromSearchParams,
  ]);

  const activeScope = server?.scope ?? defaultServerService.server.scope;

  if (workspaceNotFound) {
    const presentMatch = matchPath(
      '/workspace/:workspaceId/present/:roomId',
      location.pathname
    );
    if (presentMatch) {
      return (
        <FrameworkScope scope={activeScope}>
          <PresentationRoomPage
            roomId={presentMatch.params.roomId!}
            workspaceId={presentMatch.params.workspaceId!}
            isSharedMode={true}
          />
        </FrameworkScope>
      );
    }
    if (detailDocRoute) {
      return (
        <FrameworkScope scope={activeScope}>
          <SharePage
            docId={detailDocRoute.docId}
            workspaceId={detailDocRoute.workspaceId}
          />
        </FrameworkScope>
      );
    }
    return (
      <FrameworkScope scope={activeScope}>
        <AffineOtherPageLayout>
          <PageNotFound noPermission />
        </AffineOtherPageLayout>
      </FrameworkScope>
    );
  }
  if (!meta) {
    return <AppContainer fallback />;
  }

  return (
    <FrameworkScope scope={activeScope}>
      <WorkspacePage meta={meta} />
    </FrameworkScope>
  );
};

const DNDContextProvider = ({ children }: PropsWithChildren) => {
  const dndService = useService(DndService);
  const contextValue = useMemo(() => {
    return {
      fromExternalData: dndService.fromExternalData,
      toExternalData: dndService.toExternalData,
    };
  }, [dndService.fromExternalData, dndService.toExternalData]);
  return (
    <DNDContext.Provider value={contextValue}>{children}</DNDContext.Provider>
  );
};

const WorkspacePage = ({ meta }: { meta: WorkspaceMetadata }) => {
  const { workspacesService, globalContextService } = useServices({
    WorkspacesService,
    GlobalContextService,
  });

  const location = useLocation();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  useLayoutEffect(() => {
    const ref = workspacesService.open({ metadata: meta });
    setWorkspace(ref.workspace);
    return () => {
      ref.dispose();
    };
  }, [meta, workspacesService]);

  const isRootDocReady =
    useLiveData(
      useMemo(
        () =>
          workspace
            ? LiveData.from(
                workspace.engine.doc
                  .docState$(workspace.id)
                  .pipe(map(v => v.ready)),
                false
              )
            : null,
        [workspace]
      )
    ) ?? false;

  useEffect(() => {
    if (workspace) {
      // for debug purpose
      window.currentWorkspace = workspace ?? undefined;
      window.dispatchEvent(
        new CustomEvent('affine:workspace:change', {
          detail: {
            id: workspace.id,
          },
        })
      );
      window.exportWorkspaceSnapshot = async (docs?: string[]) => {
        await ZipTransformer.exportDocs(
          workspace.docCollection,
          getAFFiNEWorkspaceSchema(),
          Array.from(workspace.docCollection.docs.values())
            .filter(doc => (docs ? docs.includes(doc.id) : true))
            .map(doc => doc.getStore())
        );
      };
      window.importWorkspaceSnapshot = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.onchange = async () => {
          if (input.files && input.files.length > 0) {
            const file = input.files[0];
            const blob = new Blob([file], { type: 'application/zip' });
            await ZipTransformer.importDocs(
              workspace.docCollection,
              getAFFiNEWorkspaceSchema(),
              blob
            );
          }
        };
        input.click();
      };
      localStorage.setItem('last_workspace_id', workspace.id);
      globalContextService.globalContext.workspaceId.set(workspace.id);
      globalContextService.globalContext.workspaceFlavour.set(
        workspace.flavour
      );
      return () => {
        window.currentWorkspace = undefined;
        globalContextService.globalContext.workspaceId.set(null);
        globalContextService.globalContext.workspaceFlavour.set(null);
      };
    }
    return;
  }, [globalContextService, workspace]);

  if (!workspace) {
    return null; // skip this, workspace will be set in layout effect
  }

  const isPresentRoute =
    location.pathname.includes('/present') ||
    (typeof window !== 'undefined' && window.location.pathname.includes('/present'));

  const presentMatch = matchPath(
    '/workspace/:workspaceId/present/:roomId',
    location.pathname
  ) || matchPath('/workspace/:workspaceId/present', location.pathname);

  if (workspace && (presentMatch || isPresentRoute)) {
    const roomId =
      (presentMatch?.params as any)?.roomId ||
      location.pathname.split('/present/')[1]?.split('?')[0] ||
      (typeof window !== 'undefined' ? window.location.pathname.split('/present/')[1]?.split('?')[0] : '') ||
      '';
    return (
      <FrameworkScope scope={workspace.scope}>
        <PresentationRoomPage
          roomId={roomId}
          workspaceId={workspace.id}
          workspace={workspace}
          isSharedMode={false}
        />
      </FrameworkScope>
    );
  }

  const isShareProjectsMode = location.pathname.includes('/projects') && location.search.includes('shareKey=');

  if (!isRootDocReady && !isShareProjectsMode) {
    return (
      <FrameworkScope scope={workspace.scope}>
        <DNDContextProvider>
          <OpenInAppGuard>
            <AppContainer fallback />
          </OpenInAppGuard>
        </DNDContextProvider>
      </FrameworkScope>
    );
  }

  return (
    <FrameworkScope scope={workspace.scope}>
      <DNDContextProvider>
        <CopilotContextProvider>
          <OpenInAppGuard>
            <AffineErrorBoundary height="100vh">
              <WorkspaceLayout>
                <WorkbenchRoot />
                <WorkspaceCopilotDrawer workspaceId={workspace.id} />
              </WorkspaceLayout>
            </AffineErrorBoundary>
          </OpenInAppGuard>
        </CopilotContextProvider>
      </DNDContextProvider>
    </FrameworkScope>
  );
};
