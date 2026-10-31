// Import is already correct, no changes needed
import {
  AddPageButton,
  AppSidebar,
  MenuItem,
  MenuLinkItem,
  QuickSearchInput,
  SidebarContainer,
  SidebarScrollableContainer,
} from '@affine/core/modules/app-sidebar/views';
import { ExternalMenuLinkItem } from '@affine/core/modules/app-sidebar/views/menu-item/external-menu-link-item';
import { AuthService } from '@affine/core/modules/cloud';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import {
  CollapsibleSection,
  ExplorerCollections,
  ExplorerFavorites,
  ExplorerMigrationFavorites,
  ExplorerOrganize,
} from '@affine/core/modules/explorer';
import { ExplorerTags } from '@affine/core/modules/explorer/views/sections/tags';
import { CMDKQuickSearchService } from '@affine/core/modules/quicksearch/services/cmdk';
import type { Workspace } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import type { Store } from '@blocksuite/affine/store';
import {
  AllDocsIcon,
  ImportIcon,
  JournalIcon,
  SettingsIcon,
} from '@blocksuite/icons/rc';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { useLiveData, useService, useServices } from '@toeverything/infra';
import type { ReactElement } from 'react';
import { memo, useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { WorkbenchService } from '../../modules/workbench';
import { WorkspaceNavigator } from '../workspace-selector';
import {
  bottomContainer,
  quickSearch,
  quickSearchAndNewPage,
  workspaceAndUserWrapper,
  workspaceWrapper,
} from './index.css';
import { AppSidebarJournalButton } from './journal-button';
import { NotificationButton } from './notification-button';
import { SidebarAudioPlayer } from './sidebar-audio-player';
import { TemplateDocEntrance } from './template-doc-entrance';
import { TrashButton } from './trash-button';
import { UserInfo } from './user-info';

export type RootAppSidebarProps = {
  isPublicWorkspace: boolean;
  onOpenQuickSearchModal: () => void;
  onOpenSettingModal: () => void;
  currentWorkspace: Workspace;
  openPage: (pageId: string) => void;
  createPage: () => Store;
  paths: {
    all: (workspaceId: string) => string;
    trash: (workspaceId: string) => string;
    shared: (workspaceId: string) => string;
  };
};

const AllDocsButton = () => {
  const t = useI18n();
  const { workbenchService } = useServices({
    WorkbenchService,
  });
  const workbench = workbenchService.workbench;
  const allPageActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/all')
  );

  return (
    <MenuLinkItem icon={<AllDocsIcon />} active={allPageActive} to={'/all'}>
      <span data-testid="all-pages">
        {t['com.IntoAI.workspaceSubPath.all']()}
      </span>
    </MenuLinkItem>
  );
};

const ProjectsButton = () => {
  const { workbenchService } = useServices({
    WorkbenchService,
  });
  const workbench = workbenchService.workbench;
  const projectsActive = useLiveData(
    workbench.location$.selector(location => location.pathname.startsWith('/projects'))
  );

  return (
    <MenuLinkItem
      icon={
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      }
      active={projectsActive}
      to={'/projects'}
    >
      <span data-testid="projects-tab">
        Projects
      </span>
    </MenuLinkItem>
  );
};

const SubscriptionSuiteDropdown = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { workbenchService } = useServices({
    WorkbenchService,
  });
  const workbench = workbenchService.workbench;

  const dashboardActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/dashboard')
  );
  const productsActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/products')
  );
  const plansActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/plans')
  );
  const quotesActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/quotes')
  );
  const subscriptionsActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/subscriptions')
  );
  const invoicesActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/invoices')
  );
  const paymentsActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/payments')
  );
  const discountsActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/discounts')
  );

  const active =
    dashboardActive ||
    productsActive ||
    plansActive ||
    quotesActive ||
    subscriptionsActive ||
    invoicesActive ||
    paymentsActive ||
    discountsActive;

  return (
    <div>
      <MenuItem
        icon={
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        }
        active={active}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: 'pointer' }}
      >
        <span data-testid="subscriptions-suite-tab" style={{ fontWeight: 600 }}>
          Brightloop ERP
        </span>
      </MenuItem>
      {!collapsed && (
        <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px' }}>
          <MenuLinkItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            }
            active={dashboardActive}
            to={'/dashboard'}
          >
            <span style={{ fontSize: '12px' }}>Dashboard</span>
          </MenuLinkItem>

          <MenuLinkItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            active={productsActive}
            to={'/products'}
          >
            <span style={{ fontSize: '12px' }}>Products & Variants</span>
          </MenuLinkItem>

          <MenuLinkItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            active={plansActive}
            to={'/plans'}
          >
            <span style={{ fontSize: '12px' }}>Subscription Plans</span>
          </MenuLinkItem>

          <MenuLinkItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
              </svg>
            }
            active={quotesActive}
            to={'/quotes'}
          >
            <span style={{ fontSize: '12px' }}>Quotations</span>
          </MenuLinkItem>

          <MenuLinkItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            }
            active={subscriptionsActive}
            to={'/subscriptions'}
          >
            <span style={{ fontSize: '12px' }}>Subscriptions</span>
          </MenuLinkItem>

          <MenuLinkItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            }
            active={invoicesActive}
            to={'/invoices'}
          >
            <span style={{ fontSize: '12px' }}>Invoices</span>
          </MenuLinkItem>

          <MenuLinkItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            }
            active={paymentsActive}
            to={'/payments'}
          >
            <span style={{ fontSize: '12px' }}>Payments</span>
          </MenuLinkItem>

          <MenuLinkItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            }
            active={discountsActive}
            to={'/discounts'}
          >
            <span style={{ fontSize: '12px' }}>Discounts</span>
          </MenuLinkItem>
        </div>
      )}
    </div>
  );
};

const DocumentsDropdown = () => {
  const [collapsed, setCollapsed] = useState(true);
  const { workbenchService } = useServices({
    WorkbenchService,
  });
  const workbench = workbenchService.workbench;

  const proposalsActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/proposals')
  );
  const quotesActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/quotes')
  );
  const invoicesActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/invoices')
  );
  const letterheadsActive = useLiveData(
    workbench.location$.selector(location => location.pathname === '/letterheads')
  );

  const active = proposalsActive || quotesActive || invoicesActive || letterheadsActive;

  // Auto-expand if one of the pages is active on load
  useEffect(() => {
    if (proposalsActive || quotesActive || invoicesActive || letterheadsActive) {
      setCollapsed(false);
    }
  }, [proposalsActive, quotesActive, invoicesActive, letterheadsActive]);

  return (
    <div>
      <MenuItem
        icon={
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        }
        active={active}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: 'pointer' }}
      >
        <span data-testid="documents-tab">
          Documents
        </span>
      </MenuItem>
      {!collapsed && (
        <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
          <MenuLinkItem
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
            active={proposalsActive}
            to={'/proposals'}
          >
            <span style={{ fontSize: '12px' }}>Proposals</span>
          </MenuLinkItem>
          <MenuLinkItem
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
              </svg>
            }
            active={quotesActive}
            to={'/quotes'}
          >
            <span style={{ fontSize: '12px' }}>Quotes</span>
          </MenuLinkItem>
          <MenuLinkItem
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            }
            active={invoicesActive}
            to={'/invoices'}
          >
            <span style={{ fontSize: '12px' }}>Invoices</span>
          </MenuLinkItem>
          <MenuLinkItem
            icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            }
            active={letterheadsActive}
            to={'/letterheads'}
          >
            <span style={{ fontSize: '12px' }}>Letterhead</span>
          </MenuLinkItem>
        </div>
      )}
    </div>
  );
};


const PresentationsButton = () => {
  const workspaceDialogService = useService(WorkspaceDialogService);
  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);

  if (!isOwner) {
    return null;
  }

  const handleOpenPresentations = () => {
    workspaceDialogService.open('presentations', undefined);
  };

  return (
    <MenuItem
      data-testid="slider-bar-presentations-button"
      icon={
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
          <path d="M8 21h8M12 17v4" />
          <path d="M17 7l4-4m0 0h-4m4 0v4" />
        </svg>
      }
      onClick={handleOpenPresentations}
    >
      <span data-testid="presentations-modal-trigger">
        Presentations
      </span>
    </MenuItem>
  );
};

/**
 * This is for the whole affine app sidebar.
 * This component wraps the app sidebar in `@affine/component` with logic and data.
 *
 */
export const RootAppSidebar = memo((): ReactElement => {
  const { workbenchService, cMDKQuickSearchService, authService } = useServices(
    {
      WorkbenchService,
      CMDKQuickSearchService,
      AuthService,
    }
  );

  const sessionStatus = useLiveData(authService.session.status$);
  const t = useI18n();
  const workspaceDialogService = useService(WorkspaceDialogService);
  const workbench = workbenchService.workbench;
  const onOpenQuickSearchModal = useCallback(() => {
    cMDKQuickSearchService.toggle();
  }, [cMDKQuickSearchService]);

  const onOpenSettingModal = useCallback(() => {
    workspaceDialogService.open('setting', {
      activeTab: 'appearance',
    });
    track.$.navigationPanel.$.openSettings();
  }, [workspaceDialogService]);

  const handleOpenDocs = useCallback(
    (result: {
      docIds: string[];
      entryId?: string;
      isWorkspaceFile?: boolean;
    }) => {
      const { docIds, entryId, isWorkspaceFile } = result;
      // If the imported file is a workspace file, open the entry page.
      if (isWorkspaceFile && entryId) {
        workbench.openDoc(entryId);
      } else if (!docIds.length) {
        return;
      }
      // Open all the docs when there are multiple docs imported.
      if (docIds.length > 1) {
        workbench.openAll();
      } else {
        // Otherwise, open the only doc.
        workbench.openDoc(docIds[0]);
      }
    },
    [workbench]
  );

  const onOpenImportModal = useCallback(() => {
    track.$.navigationPanel.importModal.open();
    workspaceDialogService.open('import', undefined, payload => {
      if (!payload) {
        return;
      }
      handleOpenDocs(payload);
    });
  }, [workspaceDialogService, handleOpenDocs]);

  return (
    <AppSidebar>
      <SidebarContainer>
        <div className={workspaceAndUserWrapper}>
          <div className={workspaceWrapper}>
            <WorkspaceNavigator showEnableCloudButton showSyncStatus />
          </div>
          <UserInfo />
        </div>
        <div className={quickSearchAndNewPage}>
          <QuickSearchInput
            className={quickSearch}
            data-testid="slider-bar-quick-search-button"
            data-event-props="$.navigationPanel.$.quickSearch"
            onClick={onOpenQuickSearchModal}
          />
          <AddPageButton />
        </div>
        <AllDocsButton />
        <SubscriptionSuiteDropdown />
        <ProjectsButton />
        <DocumentsDropdown />
        <AppSidebarJournalButton />
        {sessionStatus === 'authenticated' && <NotificationButton />}
        <PresentationsButton />
        <MenuItem
          data-testid="slider-bar-workspace-setting-button"
          icon={<SettingsIcon />}
          onClick={onOpenSettingModal}
        >
          <span data-testid="settings-modal-trigger">
            {t['com.IntoAI.settingSidebar.title']()}
          </span>
        </MenuItem>
      </SidebarContainer>
      <SidebarScrollableContainer>
        <ExplorerFavorites />
        <ExplorerOrganize />
        <ExplorerMigrationFavorites />
        <ExplorerCollections />
        <ExplorerTags />
        <CollapsibleSection
          name="others"
          title={t['com.IntoAI.rootAppSidebar.others']()}
          contentStyle={{ padding: '6px 8px 0 8px' }}
        >
          <TrashButton />
          <MenuItem
            data-testid="slider-bar-import-button"
            icon={<ImportIcon />}
            onClick={onOpenImportModal}
          >
            <span data-testid="import-modal-trigger">{t['Import']()}</span>
          </MenuItem>
          <TemplateDocEntrance />
          <ExternalMenuLinkItem
            href="https://brightloop.local"
            icon={<JournalIcon />}
            label={t['com.IntoAI.app-sidebar.learn-more']()}
          />
        </CollapsibleSection>
      </SidebarScrollableContainer>
      <SidebarContainer className={bottomContainer}>
        <SidebarAudioPlayer />
      </SidebarContainer>
    </AppSidebar>
  );
});

RootAppSidebar.displayName = 'memo(RootAppSidebar)';
