import { useEffect, useRef, useCallback } from 'react';
import { useWorkspaceCopilot } from './copilot-context-provider';

export interface ProjectCopilotSyncParams {
  selectedProjectId?: string;
  searchParams: URLSearchParams;
  projects?: Array<{ id: string; name: string; category?: string | null; [key: string]: any }>;
  workspaceMembers?: Array<{ id: string; name?: string | null; email?: string | null }>;
  cycles?: Array<{ id: string; name: string; [key: string]: any }>;
  modules?: Array<{ id: string; name: string; [key: string]: any }>;
  releases?: Array<{ id: string; name: string; [key: string]: any }>;
  issues?: Array<{ id: string; title: string; status: string; [key: string]: any }>;
  categories?: string[];
  onExecuteAction?: (action: string, data: Record<string, any>) => Promise<void>;
}

const isArrayEqual = (arr1?: any[], arr2?: any[], keys: string[] = ['id']) => {
  if (!arr1 && !arr2) return true;
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  return arr1.every((item, idx) => {
    const other = arr2[idx];
    return keys.every(k => item[k] === other[k]);
  });
};

/**
 * Custom hook to sync Projects Context (projects, members, cycles, modules, releases, issues) with Workspace Copilot.
 */
export const useProjectCopilotSync = ({
  selectedProjectId,
  searchParams,
  projects,
  workspaceMembers,
  cycles,
  modules,
  releases,
  issues,
  categories,
  onExecuteAction,
}: ProjectCopilotSyncParams) => {
  const { setCopilotContext } = useWorkspaceCopilot();

  const actionRef = useRef(onExecuteAction);
  useEffect(() => {
    actionRef.current = onExecuteAction;
  }, [onExecuteAction]);

  const stableExecuteAction = useCallback(
    (action: string, data: Record<string, any>) => {
      if (actionRef.current) {
        return actionRef.current(action, data);
      }
      return Promise.resolve();
    },
    []
  );

  useEffect(() => {
    const activeSubTab = (searchParams.get('tab') || 'overview') as any;
    const activeProjectId = selectedProjectId || undefined;

    const nextProjects = (projects || []).map((p: any) => ({ id: p.id, name: p.name }));
    const nextMembers = (workspaceMembers || []).map((m: any) => ({
      id: m.id,
      name: m.name || m.email || '',
      email: m.email || '',
    }));
    const nextCycles = (cycles || []).map((c: any) => ({ id: c.id, name: c.name }));
    const nextModules = (modules || []).map((m: any) => ({ id: m.id, name: m.name }));
    const nextReleases = (releases || []).map((r: any) => ({ id: r.id, name: r.name }));
    const nextIssues = (issues || []).map((i: any) => ({ id: i.id, title: i.title, status: i.status }));
    const nextCategories = categories || Array.from(new Set((projects || []).map((p: any) => p.category).filter(Boolean)));

    setCopilotContext(prev => {
      const isTabEqual = prev.activeTab === 'projects';
      const isProjectEqual = prev.activeProjectId === activeProjectId;
      const isSubTabEqual = prev.activeSubTab === activeSubTab;
      const isActionEqual = Boolean(prev.onExecuteAction);

      const projectsEqual = isArrayEqual(prev.projects, nextProjects, ['id', 'name']);
      const membersEqual = isArrayEqual(prev.workspaceMembers, nextMembers, ['id', 'name', 'email']);
      const cyclesEqual = isArrayEqual(prev.cycles, nextCycles, ['id', 'name']);
      const modulesEqual = isArrayEqual(prev.modules, nextModules, ['id', 'name']);
      const releasesEqual = isArrayEqual(prev.releases, nextReleases, ['id', 'name']);
      const issuesEqual = isArrayEqual(prev.issues, nextIssues, ['id', 'title', 'status']);
      const categoriesEqual = JSON.stringify(prev.categories || []) === JSON.stringify(nextCategories);

      if (
        isTabEqual &&
        isProjectEqual &&
        isSubTabEqual &&
        isActionEqual &&
        projectsEqual &&
        membersEqual &&
        cyclesEqual &&
        modulesEqual &&
        releasesEqual &&
        issuesEqual &&
        categoriesEqual
      ) {
        return prev;
      }

      return {
        ...prev,
        activeTab: 'projects',
        activeProjectId,
        activeSubTab,
        projects: nextProjects,
        workspaceMembers: nextMembers,
        cycles: nextCycles,
        modules: nextModules,
        releases: nextReleases,
        issues: nextIssues,
        categories: nextCategories,
        onExecuteAction: stableExecuteAction,
      };
    });
  }, [
    selectedProjectId,
    searchParams,
    projects,
    workspaceMembers,
    cycles,
    modules,
    releases,
    issues,
    categories,
    stableExecuteAction,
    setCopilotContext,
  ]);
};

export interface DocumentCopilotSyncParams {
  docId?: string;
  docTitle?: string;
  docContent?: string;
  isActive?: boolean;
}

/**
 * Custom hook to sync Document Context (document ID, title, and content) with Workspace Copilot.
 */
export const useDocumentCopilotSync = ({
  docId,
  docTitle,
  docContent,
  isActive = true,
}: DocumentCopilotSyncParams) => {
  const { setCopilotContext } = useWorkspaceCopilot();

  useEffect(() => {
    if (isActive && (docId || docTitle || docContent)) {
      const nextDocId = docId || 'project-doc-draft';
      const nextDocTitle = docTitle || 'Project Document';
      const nextDocContent = docContent || '';

      setCopilotContext(prev => {
        if (
          prev.activeTab === 'documents' &&
          prev.activeDocId === nextDocId &&
          prev.activeDocTitle === nextDocTitle &&
          prev.activeDocContent === nextDocContent
        ) {
          return prev;
        }

        return {
          ...prev,
          activeTab: 'documents',
          activeDocId: nextDocId,
          activeDocTitle: nextDocTitle,
          activeDocContent: nextDocContent,
        };
      });
    }
  }, [docId, docTitle, docContent, isActive, setCopilotContext]);
};

export interface BlueprintCopilotSyncParams {
  selectedBlockId?: string | null;
  releaseId?: string;
  releaseName?: string;
  nodes?: Array<{ id: string; label: string; role?: string; status?: string }>;
}

/**
 * Custom hook to sync Blueprint Context (release, nodes, and selected block) with Workspace Copilot.
 */
export const useBlueprintCopilotSync = (paramsOrBlockId?: BlueprintCopilotSyncParams | string | null) => {
  const { setCopilotContext } = useWorkspaceCopilot();

  const params: BlueprintCopilotSyncParams =
    typeof paramsOrBlockId === 'string' || paramsOrBlockId === null || paramsOrBlockId === undefined
      ? { selectedBlockId: paramsOrBlockId }
      : paramsOrBlockId;

  const { selectedBlockId, releaseId, releaseName, nodes } = params;

  useEffect(() => {
    const nextBlockId = selectedBlockId || undefined;
    const nextReleaseId = releaseId || undefined;
    const nextReleaseName = releaseName || undefined;
    const nextNodes = (nodes || []).map(n => ({
      id: n.id,
      label: n.label,
      role: n.role,
      status: n.status,
    }));

    setCopilotContext(prev => {
      if (
        prev.selectedBlockId === nextBlockId &&
        prev.activeReleaseId === nextReleaseId &&
        prev.activeReleaseName === nextReleaseName &&
        isArrayEqual(prev.blueprintNodes, nextNodes, ['id', 'label', 'status', 'role'])
      ) {
        return prev;
      }

      return {
        ...prev,
        selectedBlockId: nextBlockId,
        activeReleaseId: nextReleaseId,
        activeReleaseName: nextReleaseName,
        blueprintNodes: nextNodes,
      };
    });
  }, [selectedBlockId, releaseId, releaseName, nodes, setCopilotContext]);
};
