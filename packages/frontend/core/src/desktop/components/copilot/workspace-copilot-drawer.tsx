import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useLiveData, useServices } from '@toeverything/infra';
import { WorkbenchService } from '../../../modules/workbench';
import { cssVar } from '@toeverything/theme';
import { AiIcon, CloseIcon } from '@blocksuite/icons/rc';
import { useMutation, useMutateQueryResource } from '../../../components/hooks/use-mutation';
import {
  projectsQuery,
  createProjectMutation,
  updateProjectMutation,
  deleteProjectMutation,
  projectAnalyticsQuery,
  projectModulesQuery,
  createProjectModuleMutation,
  updateProjectModuleMutation,
  deleteProjectModuleMutation,
  projectCyclesQuery,
  createProjectCycleMutation,
  updateProjectCycleMutation,
  deleteProjectCycleMutation,
  projectReleasesQuery,
  createProjectReleaseMutation,
  updateProjectReleaseMutation,
  deleteProjectReleaseMutation,
  projectIssuesQuery,
  projectIssueQuery,
  createProjectIssueMutation,
  updateProjectIssueMutation,
  deleteProjectIssueMutation,
} from '@affine/graphql';
import { useWorkspaceCopilot } from './copilot-context-provider';
import { ActionConfirmationCard, type PendingActionPayload } from './action-confirmation-card';
import { PresentMarkdown } from './copilot-markdown';
import { useCompanyProfile } from '../../../components/hooks/use-company-profile';

interface ChatMessageItem {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  pendingAction?: PendingActionPayload;
}

interface CopilotSessionItem {
  id: string;
  title: string;
  updatedAt: string | Date;
  messages: ChatMessageItem[];
}

interface WorkspaceCopilotDrawerProps {
  workspaceId: string;
  onExecuteAction?: (action: string, data: Record<string, any>) => Promise<void>;
}

const HistoryIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </svg>
);

const ChatBubbleIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const TrashIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PlusIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const REASONING_STEPS = [
  'Initializing LangGraph reasoning agent...',
  'Analyzing workspace context & active page...',
  'Formulating solution graph & tools...',
  'Executing step-by-step reasoning...',
  'Synthesizing final copilot response...',
];

const INITIAL_GREETING_MESSAGE: ChatMessageItem = {
  role: 'assistant',
  content:
    '**Hello! I am your Workspace Copilot.**\nI can help you create & manage projects, work items, blueprint content, cycles, releases, modules, and edit documents!\nHow can I help you today?',
};

const GUEST_GREETING_MESSAGE: ChatMessageItem = {
  role: 'assistant',
  content:
    '**Not Authorized**\nWorkspace Copilot AI assistant is not authorized for guest accounts. Guests have read-only access to view project details, documents, and blueprint content.',
};

export const WorkspaceCopilotDrawer: React.FC<WorkspaceCopilotDrawerProps> = ({
  workspaceId,
  onExecuteAction,
}) => {
  const { copilotContext, isCopilotOpen, setIsCopilotOpen } = useWorkspaceCopilot();

  const isGuestMode = typeof window !== 'undefined' && (
    !!localStorage.getItem('affine-project-share-key') ||
    window.location.search.includes('shareKey=') ||
    window.location.search.includes('share_key=') ||
    window.location.pathname.includes('/share')
  );

  const initialMsg = isGuestMode ? GUEST_GREETING_MESSAGE : INITIAL_GREETING_MESSAGE;
  const [messages, setMessages] = useState<ChatMessageItem[]>([initialMsg]);
  const [sessions, setSessions] = useState<CopilotSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `session_${Date.now()}`);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const companyProfile = useCompanyProfile();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [reasoningStepIndex, setReasoningStepIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null);
  const streamTimerRef = useRef<any>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeRequestSessionIdRef = useRef<string | null>(null);

  // Auto-resize prompt textarea as content grows
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollH = inputRef.current.scrollHeight;
      const targetHeight = Math.min(Math.max(scrollH, 22), 180);
      inputRef.current.style.height = `${targetHeight}px`;
    }
  }, [input]);

  // Close sidebar when clicking outside of it
  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleClickOutsideSidebar = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        hamburgerBtnRef.current &&
        !hamburgerBtnRef.current.contains(e.target as Node)
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideSidebar);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSidebar);
    };
  }, [isSidebarOpen]);

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const handleOpenWebsite = () => {
    let websiteUrl = '';
    try {
      const raw = localStorage.getItem('intoai_company_profile');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.websiteUrl && typeof parsed.websiteUrl === 'string' && parsed.websiteUrl.trim()) {
          websiteUrl = parsed.websiteUrl.trim();
        }
      }
    } catch {}
    if (websiteUrl) {
      let finalUrl = websiteUrl.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    window.open('https://intoai.ai', '_blank', 'noopener,noreferrer');
  };

  const location = useLocation();
  const { workbenchService } = useServices({ WorkbenchService });
  const workbenchLocation = useLiveData(workbenchService?.workbench?.location$);

  const activeExecuteAction = onExecuteAction || copilotContext.onExecuteAction;

  const fullPath = (
    (location?.pathname || '') +
    ' ' +
    (workbenchLocation?.pathname || '') +
    ' ' +
    (typeof window !== 'undefined' ? window.location.pathname : '')
  ).toLowerCase();

  // Workspace Copilot is ONLY enabled for Projects and Business Modules (/projects, /proposals, /quotes, /invoices, /letterheads)
  // It is hidden on regular documents, journals, collections, tags, settings, trash, and meeting (/present) pages.
  const isMeetingRoute =
    fullPath.includes('/present') ||
    (typeof window !== 'undefined' && window.location.pathname.includes('/present'));

  const isSpecialModuleRoute =
    fullPath.includes('/projects') ||
    fullPath.includes('/proposals') ||
    fullPath.includes('/quotes') ||
    fullPath.includes('/invoices') ||
    fullPath.includes('/letterheads');

  const isAllowedPage = isSpecialModuleRoute && !isMeetingRoute;
  const isProjectsRoute = fullPath.includes('/projects') && !isMeetingRoute;

  // Auto-focus input box whenever Copilot drawer is opened
  useEffect(() => {
    if (isCopilotOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isCopilotOpen]);

  // Load chat history & sessions from database
  const fetchHistory = (targetSessId?: string) => {
    if (!workspaceId) return;
    if (isGuestMode) {
      setMessages([GUEST_GREETING_MESSAGE]);
      return;
    }
    const url = targetSessId
      ? `/api/copilot/history?workspaceId=${encodeURIComponent(workspaceId)}&sessionId=${encodeURIComponent(targetSessId)}`
      : `/api/copilot/history?workspaceId=${encodeURIComponent(workspaceId)}`;

    fetch(url)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.sessions && Array.isArray(data.sessions)) {
          const loadedSessions: CopilotSessionItem[] = data.sessions.map((s: any) => ({
            id: s.id,
            title: s.title || 'Chat Thread',
            updatedAt: s.updatedAt || new Date(),
            messages: Array.isArray(s.messages)
              ? s.messages.map((m: any) => ({
                  id: m.id,
                  role: m.role === 'user' ? 'user' : 'assistant',
                  content: m.content,
                  pendingAction: m.pendingAction || undefined,
                }))
              : [],
          }));
          setSessions(loadedSessions);

          if (!targetSessId && loadedSessions.length > 0) {
            setActiveSessionId(loadedSessions[0].id);
          }
        }

        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          const loadedMsgs: ChatMessageItem[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            pendingAction: m.pendingAction || undefined,
          }));
          setMessages(loadedMsgs);
        } else {
          setMessages([INITIAL_GREETING_MESSAGE]);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (workspaceId) {
      fetchHistory();
    }
  }, [workspaceId]);

  // Select a session thread
  const handleSelectSession = (sessId: string) => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('SESSION_SWITCH');
      activeAbortControllerRef.current = null;
    }
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setIsLoading(false);
    setIsExecutingAction(false);
    setReasoningStepIndex(0);

    setActiveSessionId(sessId);
    const found = sessions.find(s => s.id === sessId);
    if (found && found.messages && found.messages.length > 0) {
      setMessages(found.messages);
    } else {
      fetchHistory(sessId);
    }
    setIsSidebarOpen(false);
  };

  // Create a new chat thread
  const handleCreateNewSession = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('SESSION_SWITCH');
      activeAbortControllerRef.current = null;
    }
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setIsLoading(false);
    setIsExecutingAction(false);
    setReasoningStepIndex(0);

    const newSessId = `session_${Date.now()}`;
    setActiveSessionId(newSessId);
    setMessages([isGuestMode ? GUEST_GREETING_MESSAGE : INITIAL_GREETING_MESSAGE]);
    setIsSidebarOpen(false);
    if (!isGuestMode) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Delete a single thread
  const handleDeleteSession = async (sessId: string) => {
    if (!workspaceId) return;
    try {
      await fetch(
        `/api/copilot/history?workspaceId=${encodeURIComponent(workspaceId)}&sessionId=${encodeURIComponent(sessId)}`,
        { method: 'DELETE' }
      );
      const updated = sessions.filter(s => s.id !== sessId);
      setSessions(updated);
      if (activeSessionId === sessId) {
        if (updated.length > 0) {
          handleSelectSession(updated[0].id);
        } else {
          handleCreateNewSession();
        }
      }
    } catch (_) {}
  };

  // Clear ALL chat history
  const handleClearHistory = async () => {
    if (!workspaceId) return;
    try {
      await fetch(`/api/copilot/history?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: 'DELETE',
      });
      setSessions([]);
      handleCreateNewSession();
    } catch (_) {}
  };

  // Cycle animated reasoning steps during Copilot execution
  useEffect(() => {
    if (!isLoading) {
      setReasoningStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setReasoningStepIndex(prev => (prev + 1) % REASONING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, reasoningStepIndex]);

  const handleSend = async () => {
    if (isGuestMode || !input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');

    const targetSessId = activeSessionId;
    activeRequestSessionIdRef.current = targetSessId;

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort('NEW_PROMPT');
    }
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    const newMessages: ChatMessageItem[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    // 1-minute (60 seconds) auto-cancel timeout
    let isTimedOut = false;
    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      abortController.abort('TIMEOUT');
    }, 60000);

    try {
      const history = newMessages.slice(1).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          workspaceId,
          sessionId: targetSessId,
          message: userMsg,
          history,
          context: {
            ...copilotContext,
            activeTab: isProjectsRoute ? 'projects' : 'documents',
          },
        }),
      });

      clearTimeout(timeoutTimer);

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errorText = errJson?.message || errJson?.reply || `AI Service HTTP ${res.status} error.`;
        if (errorText.includes('429') || errorText.includes('RESOURCE_EXHAUSTED') || errorText.includes('quota')) {
          throw new Error('Gemini API rate limit or quota exceeded. Please wait a few seconds before retrying, or contact support if the issue persists.');
        }
        throw new Error(errorText);
      }

      const data = await res.json();
      let replyText = data.reply || 'Request processed.';

      // If user switched sessions while request was in-flight, discard
      if (activeRequestSessionIdRef.current !== targetSessId) {
        return;
      }

      if (data.sessionId) {
        setActiveSessionId(data.sessionId);
      }

      if (replyText.includes('RESOURCE_EXHAUSTED') || replyText.includes('generativelanguage.googleapis.com')) {
        replyText = 'Gemini API rate limit or quota exceeded. Please wait a few seconds before retrying, or contact support if the issue persists.';
      }

      // Stream text response progressively to model message bubble
      const pendingAction = data.pendingAction || undefined;
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          pendingAction,
        },
      ]);
      setIsLoading(false);

      let currentLength = 0;
      const totalLength = replyText.length;
      const chunkSize = Math.max(2, Math.floor(totalLength / 50));

      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }

      const streamTimer = setInterval(() => {
        currentLength += chunkSize;
        if (currentLength >= totalLength) {
          currentLength = totalLength;
          if (streamTimerRef.current) clearInterval(streamTimerRef.current);
        }
        const chunkContent = replyText.substring(0, currentLength);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: chunkContent,
            };
          }
          return updated;
        });
      }, 20);
      streamTimerRef.current = streamTimer;

      // Refresh sessions list
      setTimeout(() => {
        fetchHistory(targetSessId);
      }, 500);

    } catch (err: any) {
      clearTimeout(timeoutTimer);
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);

      // If user switched to another session, do not leak error into new session
      if (activeRequestSessionIdRef.current !== targetSessId && !isTimedOut) {
        return;
      }

      let cleanErr = err.message || 'Failed to reach AI service.';
      if (isTimedOut || (err.name === 'AbortError' && isTimedOut)) {
        cleanErr = 'Request took longer than 1 minute to complete and was automatically cancelled. Please try again or rephrase your request.';
      } else if (err.name === 'AbortError') {
        setIsLoading(false);
        return;
      } else if (cleanErr.includes('429') || cleanErr.includes('RESOURCE_EXHAUSTED') || cleanErr.includes('quota')) {
        cleanErr = 'Gemini API rate limit or quota exceeded. Please wait a few seconds before retrying, or contact support if the issue persists.';
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `**Copilot Notice:** ${cleanErr}`,
        },
      ]);
      setIsLoading(false);
    } finally {
      activeAbortControllerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  const mutateQuery = useMutateQueryResource();

  const { trigger: triggerCreateIssue } = useMutation({ mutation: createProjectIssueMutation });
  const { trigger: triggerUpdateIssue } = useMutation({ mutation: updateProjectIssueMutation });
  const { trigger: triggerDeleteIssue } = useMutation({ mutation: deleteProjectIssueMutation });

  const { trigger: triggerCreateProject } = useMutation({ mutation: createProjectMutation });
  const { trigger: triggerUpdateProject } = useMutation({ mutation: updateProjectMutation });
  const { trigger: triggerDeleteProject } = useMutation({ mutation: deleteProjectMutation });

  const { trigger: triggerCreateCycle } = useMutation({ mutation: createProjectCycleMutation });
  const { trigger: triggerUpdateCycle } = useMutation({ mutation: updateProjectCycleMutation });
  const { trigger: triggerDeleteCycle } = useMutation({ mutation: deleteProjectCycleMutation });

  const { trigger: triggerCreateRelease } = useMutation({ mutation: createProjectReleaseMutation });
  const { trigger: triggerUpdateRelease } = useMutation({ mutation: updateProjectReleaseMutation });
  const { trigger: triggerDeleteRelease } = useMutation({ mutation: deleteProjectReleaseMutation });

  const { trigger: triggerCreateModule } = useMutation({ mutation: createProjectModuleMutation });
  const { trigger: triggerUpdateModule } = useMutation({ mutation: updateProjectModuleMutation });
  const { trigger: triggerDeleteModule } = useMutation({ mutation: deleteProjectModuleMutation });

  const defaultExecuteAction = async (action: string, data: Record<string, any>) => {
    const members = copilotContext.workspaceMembers || [];
    const cycles = copilotContext.cycles || [];
    const modules = copilotContext.modules || [];
    const releases = copilotContext.releases || [];
    const projects = copilotContext.projects || [];
    const issues = copilotContext.issues || [];
    const activeProjectId = copilotContext.activeProjectId || (projects.length > 0 ? projects[0].id : '');

    if (action === 'CREATE_WORK_ITEM' || action === 'CREATE_ISSUE') {
      if (!activeProjectId) {
        throw new Error('No active project found. Please select or create a project first.');
      }
      const assignee = data.assigneeName ? members.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.assigneeName.toLowerCase())) : null;
      const cycle = data.cycleName ? cycles.find(c => c.name.toLowerCase().includes(data.cycleName.toLowerCase())) : null;
      const mo = data.moduleName ? modules.find(m => m.name.toLowerCase().includes(data.moduleName.toLowerCase())) : null;
      const re = data.releaseName ? releases.find(r => r.name.toLowerCase().includes(data.releaseName.toLowerCase())) : null;

      if (cycle && (cycle as any).status === 'Completed') {
        await triggerUpdateCycle({ workspaceId, id: cycle.id, status: 'Active' });
        mutateQuery(projectCyclesQuery);
      }

      await triggerCreateIssue({
        workspaceId,
        input: {
          projectId: activeProjectId,
          title: data.title,
          description: data.description || '',
          type: data.type || 'Task',
          priority: data.priority || 'Medium',
          status: data.status || 'Todo',
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
          estimatedTime: Number(data.estimatedTime) || 1,
          cycleId: cycle?.id || undefined,
          moduleId: mo?.id || undefined,
          releaseId: re?.id || undefined,
          assigneeIds: assignee ? [assignee.id] : [],
        },
      });

      mutateQuery(projectIssuesQuery);
      mutateQuery(projectAnalyticsQuery);
    } else if (action === 'UPDATE_WORK_ITEM' || action === 'UPDATE_ISSUE') {
      const searchTitle = data.issueTitle || data.title || '';
      const issue = issues.find(i => i.title.toLowerCase().includes(searchTitle.toLowerCase()));
      if (!issue) {
        throw new Error(`Could not find a work item with title containing "${searchTitle}".`);
      }
      const assignee = data.assigneeName ? members.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.assigneeName.toLowerCase())) : null;
      const cycle = data.cycleName ? cycles.find(c => c.name.toLowerCase().includes(data.cycleName.toLowerCase())) : null;
      const mo = data.moduleName ? modules.find(m => m.name.toLowerCase().includes(data.moduleName.toLowerCase())) : null;
      const re = data.releaseName ? releases.find(r => r.name.toLowerCase().includes(data.releaseName.toLowerCase())) : null;

      const updateInput: any = {};
      if (data.newTitle) updateInput.title = data.newTitle;
      if (data.description !== undefined) updateInput.description = data.description;
      if (data.type) updateInput.type = data.type;
      if (data.priority) updateInput.priority = data.priority;
      if (data.status) updateInput.status = data.status;
      if (data.dueDate) updateInput.dueDate = new Date(data.dueDate).toISOString();
      if (data.estimatedTime) updateInput.estimatedTime = Number(data.estimatedTime);
      if (cycle) updateInput.cycleId = cycle.id;
      if (mo) updateInput.moduleId = mo.id;
      if (re) updateInput.releaseId = re.id;
      if (assignee) updateInput.assigneeIds = [assignee.id];

      await triggerUpdateIssue({
        workspaceId,
        id: issue.id,
        input: updateInput,
      });

      mutateQuery(projectIssuesQuery);
      mutateQuery(projectIssueQuery);
    } else if (action === 'DELETE_WORK_ITEM' || action === 'DELETE_ISSUE') {
      const searchTitle = data.issueTitle || data.title || '';
      const issue = issues.find(i => i.title.toLowerCase().includes(searchTitle.toLowerCase()));
      if (!issue) {
        throw new Error(`Could not find a work item with title containing "${searchTitle}".`);
      }
      await triggerDeleteIssue({ workspaceId, id: issue.id });
      mutateQuery(projectIssuesQuery);
    } else if (action === 'CREATE_PROJECT') {
      const visRaw = String(data.visibility || '').toLowerCase();
      const isRestricted = (visRaw === 'restricted' || visRaw === 'private') && !visRaw.includes('unrestricted');
      const visibilityValue = isRestricted ? 'Restricted' : 'WorkspaceWide';

      const resolvedMembers = (data.restrictedMembers || []).map((m: string) => {
        const found = members.find(
          (wm: any) =>
            wm.id === m ||
            (wm.name && wm.name.toLowerCase().includes(m.toLowerCase())) ||
            (wm.email && wm.email.toLowerCase().includes(m.toLowerCase()))
        );
        return found ? found.id : m;
      });

      await triggerCreateProject({
        workspaceId,
        input: {
          name: data.name,
          description: data.description || '',
          status: data.status || 'Active',
          visibility: visibilityValue,
          color: data.color || '#3b82f6',
          category: data.category || '',
          restrictedMembers: isRestricted ? resolvedMembers : [],
        },
      });
      mutateQuery(projectsQuery);
    } else if (action === 'UPDATE_PROJECT') {
      const projectId = data.projectId || activeProjectId;
      if (!projectId) throw new Error('No project selected to update.');
      const updateVisRaw = data.visibility ? String(data.visibility).toLowerCase() : undefined;
      const updateVisValue = updateVisRaw
        ? ((updateVisRaw === 'restricted' || updateVisRaw === 'private') && !updateVisRaw.includes('unrestricted') ? 'Restricted' : 'WorkspaceWide')
        : undefined;

      await triggerUpdateProject({
        workspaceId,
        id: projectId,
        input: {
          name: data.name,
          description: data.description,
          status: data.status,
          visibility: updateVisValue,
          color: data.color,
          category: data.category,
        },
      });
      mutateQuery(projectsQuery);
    } else if (action === 'DELETE_PROJECT') {
      const projectId = data.projectId || activeProjectId;
      if (!projectId) throw new Error('No project selected to delete.');
      await triggerDeleteProject({ workspaceId, id: projectId });
      mutateQuery(projectsQuery);
    } else if (action === 'CREATE_CYCLE') {
      if (!activeProjectId) throw new Error('No active project found.');
      await triggerCreateCycle({
        workspaceId,
        projectId: activeProjectId,
        name: data.name,
        goal: data.goal || '',
        status: data.status || 'Planned',
        startDate: new Date(data.startDate || Date.now()).toISOString(),
        endDate: new Date(data.endDate || Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
      mutateQuery(projectCyclesQuery);
    } else if (action === 'UPDATE_CYCLE') {
      const cycle = cycles.find(c => (data.cycleId && c.id === data.cycleId) || (data.name && c.name.toLowerCase().includes(data.name.toLowerCase())));
      if (!cycle) throw new Error('Could not find cycle to update.');
      await triggerUpdateCycle({
        workspaceId,
        id: cycle.id,
        name: data.newName || data.name,
        goal: data.goal,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      });
      mutateQuery(projectCyclesQuery);
    } else if (action === 'DELETE_CYCLE') {
      const cycle = cycles.find(c => (data.cycleId && c.id === data.cycleId) || (data.name && c.name.toLowerCase().includes(data.name.toLowerCase())));
      if (!cycle) throw new Error('Could not find cycle to delete.');
      await triggerDeleteCycle({ workspaceId, id: cycle.id });
      mutateQuery(projectCyclesQuery);
    } else if (action === 'CREATE_RELEASE') {
      if (!activeProjectId) throw new Error('No active project found.');
      await triggerCreateRelease({
        workspaceId,
        projectId: activeProjectId,
        name: data.name,
        description: data.description || '',
        status: data.status || 'Planned',
        plannedDate: data.plannedDate ? new Date(data.plannedDate).toISOString() : undefined,
        checklist: {},
      });
      mutateQuery(projectReleasesQuery);
    } else if (action === 'UPDATE_RELEASE') {
      const release = releases.find(r => (data.releaseId && r.id === data.releaseId) || (data.name && r.name.toLowerCase().includes(data.name.toLowerCase())));
      if (!release) throw new Error('Could not find release to update.');
      await triggerUpdateRelease({
        workspaceId,
        id: release.id,
        name: data.newName || data.name,
        description: data.description,
        status: data.status,
        plannedDate: data.plannedDate ? new Date(data.plannedDate).toISOString() : undefined,
      });
      mutateQuery(projectReleasesQuery);
    } else if (action === 'DELETE_RELEASE') {
      const release = releases.find(r => (data.releaseId && r.id === data.releaseId) || (data.name && r.name.toLowerCase().includes(data.name.toLowerCase())));
      if (!release) throw new Error('Could not find release to delete.');
      await triggerDeleteRelease({ workspaceId, id: release.id });
      mutateQuery(projectReleasesQuery);
    } else if (action === 'CREATE_MODULE') {
      if (!activeProjectId) throw new Error('No active project found.');
      const lead = data.leadName ? members.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.leadName.toLowerCase())) : null;
      await triggerCreateModule({
        workspaceId,
        projectId: activeProjectId,
        name: data.name,
        description: data.description || '',
        leadId: lead?.id || undefined,
      });
      mutateQuery(projectModulesQuery);
    } else if (action === 'UPDATE_MODULE') {
      const mo = modules.find(m => (data.moduleId && m.id === data.moduleId) || (data.name && m.name.toLowerCase().includes(data.name.toLowerCase())));
      if (!mo) throw new Error('Could not find module to update.');
      const lead = data.leadName ? members.find((m: any) => (m.name || m.email || '').toLowerCase().includes(data.leadName.toLowerCase())) : undefined;
      await triggerUpdateModule({
        workspaceId,
        id: mo.id,
        name: data.newName || data.name,
        description: data.description,
        leadId: lead ? lead.id : undefined,
      });
      mutateQuery(projectModulesQuery);
    } else if (action === 'DELETE_MODULE') {
      const mo = modules.find(m => (data.moduleId && m.id === data.moduleId) || (data.name && m.name.toLowerCase().includes(data.name.toLowerCase())));
      if (!mo) throw new Error('Could not find module to delete.');
      await triggerDeleteModule({ workspaceId, id: mo.id });
      mutateQuery(projectModulesQuery);
    } else if (action === 'UPDATE_BLUEPRINT') {
      window.dispatchEvent(
        new CustomEvent('workspace-copilot-blueprint-action', {
          detail: {
            ...data,
            releaseName: data.releaseName || copilotContext.activeReleaseName,
            releaseId: data.releaseId || copilotContext.activeReleaseId,
          },
        })
      );
    } else if (action === 'EDIT_DOCUMENT') {
      window.dispatchEvent(new CustomEvent('workspace-copilot-doc-edit', { detail: data }));
    } else {
      throw new Error(`Action "${action}" is not supported.`);
    }
  };

  const formatExecutedSummary = (action: string, data: Record<string, any>) => {
    const actionTitle = action.replace(/_/g, ' ').toUpperCase();
    const membersList = copilotContext.workspaceMembers || [];

    const resolveValue = (key: string, val: any) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'restrictedmembers' || lowerKey.includes('members')) {
        if (Array.isArray(val)) {
          const names = val.map(idOrName => {
            const found = membersList.find((m: any) => m.id === idOrName);
            return found ? (found.name || found.email || idOrName) : idOrName;
          });
          return names.length ? names.join(', ') : 'None';
        }
      }
      if (lowerKey === 'projectmanagerid' || lowerKey === 'leadid' || lowerKey === 'assigneeid') {
        const found = membersList.find((m: any) => m.id === val);
        return found ? (found.name || found.email || val) : String(val);
      }
      if (Array.isArray(val)) {
        return val.length ? val.join(', ') : 'None';
      }
      return String(val);
    };

    const entries = Object.entries(data).filter(
      ([k, v]) => v !== undefined && v !== null && v !== '' && !['id', 'projectid', 'issueid', 'docid'].includes(k.toLowerCase())
    );
    const lines = entries
      .map(([k, v]) => `• **${k.charAt(0).toUpperCase() + k.slice(1)}**: ${resolveValue(k, v)}`)
      .join('\n');

    return `**Action Executed Successfully!**\n**Action:** \`${actionTitle}\`\n\n**Executed Values:**\n${lines}`;
  };

  const handleConfirmAction = async (msgIndex: number, action: string, data: Record<string, any>) => {
    setIsExecutingAction(true);
    try {
      if (activeExecuteAction) {
        try {
          await activeExecuteAction(action, data);
        } catch (execErr: any) {
          if (execErr.message && execErr.message.includes('is not supported')) {
            await defaultExecuteAction(action, data);
          } else {
            throw execErr;
          }
        }
      } else {
        await defaultExecuteAction(action, data);
      }

      const resultMsg = formatExecutedSummary(action, data);
      const targetMsgId = messages[msgIndex]?.id;

      setMessages(prev => {
        const next = [...prev];
        next[msgIndex] = {
          ...next[msgIndex],
          pendingAction: undefined,
        };
        return [
          ...next,
          {
            role: 'assistant',
            content: resultMsg,
          },
        ];
      });

      if (workspaceId) {
        fetch('/api/copilot/resolve-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            sessionId: activeSessionId,
            messageId: targetMsgId,
            action,
            data,
            status: 'executed',
            resultMessage: resultMsg,
          }),
        }).catch(console.error);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `**Action Execution Failed:** ${err.message || 'Error running mutation.'}`,
        },
      ]);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleCancelAction = (msgIndex: number) => {
    const actionName = messages[msgIndex]?.pendingAction?.action || 'Action';
    const cancelMsg = `**Action Cancelled**\nAction: \`${actionName.replace(/_/g, ' ').toUpperCase()}\` was cancelled.`;
    const targetMsgId = messages[msgIndex]?.id;

    setMessages(prev => {
      const next = [...prev];
      next[msgIndex] = {
        ...next[msgIndex],
        pendingAction: undefined,
      };
      return [
        ...next,
        {
          role: 'assistant',
          content: cancelMsg,
        },
      ];
    });

    if (workspaceId) {
      fetch('/api/copilot/resolve-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          sessionId: activeSessionId,
          messageId: targetMsgId,
          action: actionName,
          data: {},
          status: 'cancelled',
          resultMessage: cancelMsg,
        }),
      }).catch(console.error);
    }
  };

  const formatSessionTime = (dateInput: string | Date) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // If user is on a non-allowed page (Documents, Journals, Settings, Trash, Admin, Members, Present mode, etc.), hide Copilot button completely
  if (!isAllowedPage) {
    return null;
  }

  const currentTabName = isProjectsRoute
    ? 'Projects'
    : fullPath.includes('/proposals')
      ? 'Proposals'
      : fullPath.includes('/quotes')
        ? 'Quotes'
        : fullPath.includes('/invoices')
          ? 'Invoices'
          : 'Letterheads';

  return createPortal(
    <>
      {/* Floating Copilot Button */}
      <button
        onClick={() => setIsCopilotOpen(!isCopilotOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          height: '48px',
          borderRadius: '9999px',
          padding: '0 24px 0 5px',
          background: 'linear-gradient(var(--affine-background-primary-color, #ffffff), var(--affine-background-primary-color, #ffffff)) padding-box, linear-gradient(135deg, #00d4ff 0%, #0f62fe 100%) border-box',
          color: '#0f62fe',
          border: '2px solid transparent',
          boxShadow: isCopilotOpen
            ? '0 10px 30px -4px rgba(15, 98, 254, 0.35), 0 2px 8px rgba(15, 98, 254, 0.15)'
            : '0 8px 26px -4px rgba(15, 98, 254, 0.24), 0 2px 8px rgba(15, 98, 254, 0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 2147483647,
          fontWeight: 600,
          fontSize: '15px',
          letterSpacing: '-0.01em',
          transform: isCopilotOpen ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title="Workspace Copilot"
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--affine-background-secondary-color, #ffffff)',
            boxShadow: '0 2px 10px rgba(15, 98, 254, 0.15), inset 0 0 0 1px rgba(15, 98, 254, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 100 100" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="copilot-main-star-grad" x1="10%" y1="75%" x2="85%" y2="25%">
                <stop offset="0%" stopColor="#0052cc" />
                <stop offset="45%" stopColor="#0062ff" />
                <stop offset="78%" stopColor="#00c8ff" />
                <stop offset="100%" stopColor="#38e5ff" />
              </linearGradient>
              <linearGradient id="copilot-top-star-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0062ff" />
                <stop offset="100%" stopColor="#00d4ff" />
              </linearGradient>
            </defs>
            <path
              d="M 44 18 C 44 35, 54 47, 74 50 C 54 53, 44 65, 44 82 C 44 65, 34 53, 14 50 C 34 47, 44 35, 44 18 Z"
              fill="url(#copilot-main-star-grad)"
            />
            <path
              d="M 80 16 C 80 22, 84 26, 90 26 C 84 26, 80 30, 80 36 C 80 30, 76 26, 70 26 C 76 26, 80 22, 80 16 Z"
              fill="url(#copilot-top-star-grad)"
            />
            <path
              d="M 78 62 C 78 68, 82 72, 88 72 C 82 72, 78 76, 78 82 C 78 76, 74 72, 68 72 C 74 72, 78 68, 78 62 Z"
              fill="#0062ff"
            />
          </svg>
        </div>
        <span>Workspace Copilot</span>
      </button>

      {/* Floating Copilot Drawer Panel */}
      {isCopilotOpen && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '82px',
            width: '420px',
            height: '620px',
            maxHeight: 'calc(100vh - 100px)',
            background: 'linear-gradient(var(--affine-background-primary-color, #ffffff), var(--affine-background-primary-color, #ffffff)) padding-box, linear-gradient(135deg, #00d4ff 0%, #0f62fe 100%) border-box',
            borderRadius: '14px',
            border: '1.5px solid transparent',
            boxShadow: '0 16px 40px -10px rgba(15, 98, 254, 0.22), 0 4px 16px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2147483647,
            overflow: 'hidden',
            fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Drawer Header (chat-panel-title) */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${cssVar('borderColor')}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: cssVar('backgroundPrimaryColor'),
              height: '40px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                ref={hamburgerBtnRef}
                onClick={() => setIsSidebarOpen(prev => !prev)}
                title="Chat history"
                style={{
                  background: 'none',
                  border: `1px solid ${cssVar('borderColor')}`,
                  cursor: 'pointer',
                  color: cssVar('textSecondaryColor'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  padding: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              {companyProfile.logoSrc ? (
                <img
                  src={companyProfile.logoSrc}
                  alt={companyProfile.companyName || 'Brightloop'}
                  style={{
                    height: '35px',
                    maxWidth: '92px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              ) : (
                <span style={{ fontWeight: 600, fontSize: '14px', color: cssVar('textPrimaryColor') }}>
                  {companyProfile.companyName || 'Brightloop'}
                </span>
              )}

              <span
                style={{
                  fontFamily: "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace",
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(15, 98, 254, 0.08)',
                  color: '#0f62fe',
                  border: '1px solid rgba(15, 98, 254, 0.18)',
                }}
              >
                {currentTabName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Help button with Visit Official Website */}
              <button
                onClick={handleOpenWebsite}
                title="Visit Official Website"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: cssVar('textSecondaryColor'),
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  padding: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="16px" height="16px" style={{ userSelect: 'none', flexShrink: 0 }}>
                  <path fill="currentColor" fillRule="evenodd" d="M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25m.239 8.733c-.923.725-1.245 1.183-1.245 1.99 0 .437.274.765.773.765.478 0 .656-.273.827-.676.157-.575.383-.814 1.046-1.32.875-.65 1.456-1.23 1.456-2.29 0-1.524-1.251-2.46-3.049-2.46-.97 0-1.716.252-2.215.676-.41.362-.676.84-.676 1.292 0 .376.239.684.67.684.287 0 .45-.13.662-.41.329-.561.78-.814 1.436-.814.752 0 1.347.444 1.347 1.114 0 .602-.37.93-1.033 1.45m-.472 3.726c-.567 0-1.032.396-1.032.964 0 .567.465.964 1.032.964s1.039-.397 1.039-.964c0-.568-.472-.964-1.04-.964" clipRule="evenodd" />
                </svg>
              </button>

              {/* Close button */}
              <button
                onClick={() => setIsCopilotOpen(false)}
                title="Close Copilot"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: cssVar('textSecondaryColor'),
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Active Context Banner */}
          <div
            style={{
              padding: '6px 14px',
              background: cssVar('backgroundSecondaryColor'),
              borderBottom: `1px solid ${cssVar('borderColor')}`,
              fontSize: '11.5px',
              color: cssVar('textSecondaryColor'),
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: '11px', color: '#0f62fe' }}>
              Context:
            </span>
            <span>
              {isProjectsRoute
                ? `Projects tab • ${copilotContext.activeSubTab || 'overview'}`
                : fullPath.includes('/proposals')
                  ? `Proposals tab • ${copilotContext.activeSubTab || 'overview'}`
                  : fullPath.includes('/quotes')
                    ? `Quotes tab • ${copilotContext.activeSubTab || 'overview'}`
                    : fullPath.includes('/invoices')
                      ? `Invoices tab • ${copilotContext.activeSubTab || 'overview'}`
                      : `Letterheads tab • ${copilotContext.activeSubTab || 'overview'}`}
            </span>
          </div>

          {/* Main Content Area with Sliding Left History Sidebar */}
          <div style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Left History Sidebar */}
            <div
              ref={sidebarRef}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '280px',
                background: cssVar('backgroundSecondaryColor'),
                borderRight: `1px solid ${cssVar('borderColor')}`,
                boxShadow: isSidebarOpen ? '4px 0 24px rgba(0, 0, 0, 0.14)' : 'none',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Sidebar Header (clean, no << icon) */}
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  background: cssVar('backgroundSecondaryColor'),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HistoryIcon size={18} color="#0f62fe" />
                  <span style={{ fontWeight: 600, fontSize: '15px', color: cssVar('textPrimaryColor') }}>
                    Chat history
                  </span>
                </div>
              </div>

              {/* + New Chat Button (simple, no shadow, reduced height) */}
              <div style={{ padding: '0 12px 8px' }}>
                <button
                  onClick={handleCreateNewSession}
                  style={{
                    width: '100%',
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0f62fe',
                    color: '#ffffff',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: 'none',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <PlusIcon size={14} color="#ffffff" />
                  <span>New chat</span>
                </button>
              </div>

              {/* Search Bar & Date Filter */}
              <div style={{ padding: '0 12px 10px', position: 'relative' }}>
                <div
                  style={{
                    background: cssVar('backgroundPrimaryColor'),
                    border: `1px solid ${cssVar('borderColor')}`,
                    borderRadius: '8px',
                    padding: '5px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cssVar('textSecondaryColor')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder={dateFilter !== 'all' ? `Search in ${dateFilter}...` : 'Search chats...'}
                    value={chatSearchQuery}
                    onChange={e => setChatSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '12.5px',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      color: cssVar('textPrimaryColor'),
                      minWidth: 0,
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilterDropdown(prev => !prev);
                    }}
                    title="Filter chats by date"
                    style={{
                      background: dateFilter !== 'all' ? 'rgba(15, 98, 254, 0.12)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: dateFilter !== 'all' ? '#0f62fe' : cssVar('textSecondaryColor'),
                      padding: '3px 4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="14" y2="12" />
                      <line x1="4" y1="18" x2="17" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Filter Dropdown Popover */}
                {showFilterDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% - 4px)',
                      right: '12px',
                      width: '140px',
                      background: cssVar('backgroundPrimaryColor'),
                      border: `1px solid ${cssVar('borderColor')}`,
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      padding: '4px',
                      zIndex: 30,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {[
                      { id: 'all', label: 'All chats' },
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: 'week', label: 'Last week' },
                      { id: 'month', label: 'Last month' },
                    ].map(opt => {
                      const isSelected = dateFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setDateFilter(opt.id as any);
                            setShowFilterDropdown(false);
                          }}
                          style={{
                            padding: '6px 10px',
                            border: 'none',
                            background: isSelected ? 'rgba(15, 98, 254, 0.08)' : 'transparent',
                            color: isSelected ? '#0f62fe' : cssVar('textPrimaryColor'),
                            fontWeight: isSelected ? 600 : 400,
                            fontSize: '12px',
                            borderRadius: '5px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            transition: 'background 0.12s ease',
                          }}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <span style={{ fontSize: '11px', color: '#0f62fe' }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sessions / Threads List Grouped by Date */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
                {(() => {
                  const now = new Date();
                  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                  const yesterdayStart = todayStart - 86400000;
                  const weekStart = todayStart - 7 * 86400000;
                  const monthStart = todayStart - 30 * 86400000;

                  const filtered = sessions.filter(s => {
                    const q = chatSearchQuery.toLowerCase().trim();
                    const matchesQuery = !q || s.title?.toLowerCase().includes(q) || s.messages?.some(m => m.content?.toLowerCase().includes(q));
                    if (!matchesQuery) return false;

                    if (dateFilter === 'all') return true;
                    const time = new Date(s.updatedAt || Date.now()).getTime();
                    if (dateFilter === 'today') return time >= todayStart;
                    if (dateFilter === 'yesterday') return time >= yesterdayStart && time < todayStart;
                    if (dateFilter === 'week') return time >= weekStart;
                    if (dateFilter === 'month') return time >= monthStart;
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          padding: '32px 16px 20px',
                          gap: '6px',
                        }}
                      >
                        {/* Double Chat Bubble Vector Illustration */}
                        <svg
                          width="120"
                          height="96"
                          viewBox="0 0 495 399"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ marginBottom: '6px' }}
                        >
                          {/* Main speech bubble */}
                          <path
                            d="M132 100 H263 C293 100 317 124 317 154 V224 C317 254 293 278 263 278 H178 L133 311 V278 H132 C102 278 78 254 78 224 V154 C78 124 102 100 132 100Z"
                            fill="#EDF4FF"
                            stroke="#5B91EE"
                            strokeWidth="4"
                            strokeLinejoin="round"
                          />

                          {/* Three dots */}
                          <circle cx="150" cy="190" r="11" fill="#1769E8" />
                          <circle cx="200" cy="190" r="11" fill="#1769E8" />
                          <circle cx="248" cy="190" r="11" fill="#1769E8" />

                          {/* Secondary speech bubble */}
                          <path
                            d="M210 303 C210 325 226 343 248 343 H315 L348 367 V344 C372 344 391 327 391 305 V242 C391 220 374 203 350 203"
                            fill="none"
                            stroke="#59677D"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Accent lines */}
                          <path
                            d="M327 71 L338 42"
                            stroke="#5B91EE"
                            strokeWidth="6"
                            strokeLinecap="round"
                          />
                          <path
                            d="M352 90 L383 68"
                            stroke="#5B91EE"
                            strokeWidth="6"
                            strokeLinecap="round"
                          />
                          <path
                            d="M360 121 L391 122"
                            stroke="#5B91EE"
                            strokeWidth="6"
                            strokeLinecap="round"
                          />
                        </svg>

                        <div style={{ fontWeight: 600, fontSize: '14px', color: cssVar('textPrimaryColor') }}>
                          {chatSearchQuery.trim() || dateFilter !== 'all' ? 'No matching chat threads' : 'No prior chat threads.'}
                        </div>
                        <div style={{ fontSize: '12px', lineHeight: 1.45, color: cssVar('textSecondaryColor'), maxWidth: '210px' }}>
                          {chatSearchQuery.trim() || dateFilter !== 'all'
                            ? 'Try clearing the search or filter.'
                            : 'Start a new chat to begin working with your workspace!'}
                        </div>
                      </div>
                    );
                  }

                  const last7DaysStart = todayStart - 6 * 86400000;

                  const groups: { [key: string]: CopilotSessionItem[] } = {
                    Today: [],
                    Yesterday: [],
                    'Previous 7 days': [],
                    Older: [],
                  };

                  filtered.forEach(sess => {
                    const time = new Date(sess.updatedAt || Date.now()).getTime();
                    if (time >= todayStart) {
                      groups.Today.push(sess);
                    } else if (time >= yesterdayStart) {
                      groups.Yesterday.push(sess);
                    } else if (time >= last7DaysStart) {
                      groups['Previous 7 days'].push(sess);
                    } else {
                      groups.Older.push(sess);
                    }
                  });

                  return Object.entries(groups).map(([groupTitle, items]) => {
                    if (items.length === 0) return null;

                    const isCollapsed = !!collapsedGroups[groupTitle];

                    return (
                      <div key={groupTitle} style={{ marginBottom: '12px' }}>
                        {/* Group Header (Clickable Toggle) */}
                        <div
                          onClick={() => {
                            setCollapsedGroups(prev => ({
                              ...prev,
                              [groupTitle]: !prev[groupTitle],
                            }));
                          }}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: cssVar('textSecondaryColor'),
                            marginBottom: isCollapsed ? '2px' : '6px',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            userSelect: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(0, 0, 0, 0.04)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          <span
                            style={{
                              fontSize: '9px',
                              opacity: 0.8,
                              display: 'inline-block',
                              transition: 'transform 0.15s ease',
                              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            }}
                          >
                            ▼
                          </span>
                          <span>{groupTitle}</span>
                          <span
                            style={{
                              fontSize: '10.5px',
                              opacity: 0.6,
                              fontWeight: 500,
                              marginLeft: 'auto',
                            }}
                          >
                            {items.length}
                          </span>
                        </div>

                        {/* Session Cards in Group (Collapsed / Expanded) */}
                        {!isCollapsed &&
                          items.map(sess => {
                            const isActive = sess.id === activeSessionId;
                            const userMsg = sess.messages?.find(m => m.role === 'user');
                            const snippet = userMsg?.content
                              ? `You: ${userMsg.content.replace(/[\n\r]+/g, ' ').trim()}`
                              : 'New chat thread...';

                            const timeFormatted = (() => {
                              const d = new Date(sess.updatedAt || Date.now());
                              if (isNaN(d.getTime())) return '';
                              if (d.toDateString() === now.toDateString()) {
                                return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                              }
                              const y = new Date(now);
                              y.setDate(now.getDate() - 1);
                              if (d.toDateString() === y.toDateString()) {
                                return 'Yesterday';
                              }
                              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            })();

                            return (
                              <div
                                key={sess.id}
                                onClick={() => handleSelectSession(sess.id)}
                                style={{
                                  padding: '10px 10px',
                                  borderRadius: '10px',
                                  marginBottom: '6px',
                                  cursor: 'pointer',
                                  background: isActive
                                    ? 'rgba(15, 98, 254, 0.07)'
                                    : cssVar('backgroundPrimaryColor'),
                                  border: isActive
                                    ? '1px solid rgba(15, 98, 254, 0.28)'
                                    : `1px solid ${cssVar('borderColor')}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {/* Left Circular Badge */}
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(15, 98, 254, 0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <ChatBubbleIcon size={16} color="#0f62fe" />
                                </div>

                                {/* Center Content Column */}
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        fontSize: '12.5px',
                                        color: cssVar('textPrimaryColor'),
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {sess.title || 'New chat'}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        color: cssVar('textSecondaryColor'),
                                        flexShrink: 0,
                                      }}
                                    >
                                      {timeFormatted}
                                    </span>
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: cssVar('textSecondaryColor'),
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      marginTop: '2px',
                                    }}
                                  >
                                    {snippet}
                                  </span>
                                </div>

                                {/* Options Menu Trigger / Delete session */}
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteSession(sess.id);
                                  }}
                                  title="Delete chat thread"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: cssVar('textSecondaryColor'),
                                    opacity: 0.6,
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="5" r="2" />
                                    <circle cx="12" cy="12" r="2" />
                                    <circle cx="12" cy="19" r="2" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Bottom Area: Info Banner & Clear History Button */}
              <div
                style={{
                  padding: '10px 12px',
                  borderTop: `1px solid ${cssVar('borderColor')}`,
                  background: cssVar('backgroundSecondaryColor'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Info Card: "Your chats are saved automatically" */}
                <div
                  style={{
                    background: 'rgba(15, 98, 254, 0.05)',
                    border: '1px solid rgba(15, 98, 254, 0.12)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#0f62fe" />
                    <path d="M19 16L20 19L23 20L20 21L19 24L18 21L15 20L18 19L19 16Z" fill="#00d4ff" />
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: '11.5px', color: cssVar('textPrimaryColor') }}>
                      Your chats are saved automatically
                    </span>
                    <span style={{ fontSize: '10.5px', color: cssVar('textSecondaryColor'), marginTop: '1px' }}>
                      Access your conversations anytime.
                    </span>
                  </div>
                </div>

                {/* Clear history button (reduced height, less bold) */}
                <button
                  onClick={() => setShowClearConfirm(true)}
                  style={{
                    width: '100%',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid rgba(218, 30, 40, 0.2)',
                    background: 'rgba(218, 30, 40, 0.04)',
                    color: '#da1e28',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <TrashIcon size={13} color="#da1e28" />
                  <span>Clear history</span>
                </button>
              </div>
            </div>

            {/* Backdrop overlay when sidebar is open to close on click outside */}
            {isSidebarOpen && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 15,
                  background: 'rgba(0, 0, 0, 0.08)',
                  cursor: 'pointer',
                  animation: 'fadeIn 0.15s ease',
                }}
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Chat Messages List (chat-panel-messages-container) */}
            <div
              style={{
                flex: 1,
                padding: '12px 14px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {messages.map((msg, index) => {
                if (msg.role === 'user') {
                  return (
                    <div
                      key={index}
                      className="chat-message-user"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                      }}
                    >
                      <div
                        className="text-content-wrapper"
                        style={{
                          alignSelf: 'flex-end',
                          maxWidth: '85%',
                        }}
                      >
                        <div
                          className="chat-content-pure-text"
                          style={{
                            background: 'var(--affine-background-secondary-color, #f4f4f5)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '14px',
                            lineHeight: 1.5,
                            color: cssVar('textPrimaryColor'),
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Assistant Message (chat-message-assistant)
                return (
                  <div
                    key={index}
                    className="chat-message-assistant"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      width: '100%',
                    }}
                  >
                    {/* user-info header with IntoAI assistant avatar */}
                    <div
                      className="user-info"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px',
                        color: cssVar('textPrimaryColor'),
                        fontSize: '13px',
                        fontWeight: 500,
                        userSelect: 'none',
                      }}
                    >
                      <span
                        className="assistant-avatar"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#0f62fe',
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="18px" height="18px" style={{ userSelect: 'none', flexShrink: 0, color: '#0f62fe' }}>
                          <path fill="currentColor" d="M11.281 5.491a.714.714 0 0 0-1.42-.001c-.27 2.345-.971 3.994-2.102 5.126-1.132 1.131-2.781 1.832-5.127 2.103a.714.714 0 0 0 .002 1.42c2.307.26 3.991.962 5.15 2.099 1.153 1.133 1.87 2.782 2.076 5.11a.714.714 0 0 0 1.423 0c.198-2.291.914-3.975 2.073-5.135 1.16-1.16 2.843-1.875 5.134-2.073a.714.714 0 0 0 .002-1.423c-2.33-.207-3.978-.923-5.111-2.077-1.138-1.158-1.838-2.842-2.1-5.149M18.943 2.247a.278.278 0 0 0-.552-.001c-.105.912-.378 1.554-.818 1.993s-1.082.713-1.994.818a.278.278 0 0 0 0 .552c.898.102 1.553.375 2.003.817.45.44.727 1.082.808 1.987a.278.278 0 0 0 .553 0c.077-.891.356-1.546.807-1.997.45-.45 1.105-.729 1.996-.806a.278.278 0 0 0 0-.553c-.905-.08-1.546-.36-1.987-.808-.442-.45-.715-1.105-.816-2.002" />
                        </svg>
                        <span style={{ color: cssVar('textPrimaryColor'), fontWeight: 600, fontSize: '13px' }}>IntoAI</span>
                      </span>
                    </div>

                    {/* item-wrapper */}
                    <div
                      className="item-wrapper"
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: cssVar('textPrimaryColor'),
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        width: '100%',
                      }}
                    >
                      <PresentMarkdown content={msg.content} />

                      {/* Action buttons (chat-copy-more) */}
                      <div
                        className="copy-more"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '6px',
                        }}
                      >
                        <button
                          onClick={() => handleCopyMessage(msg.content, index)}
                          title="Copy"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedIndex === index ? '#0f62fe' : cssVar('textSecondaryColor'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            padding: '3px 6px',
                            borderRadius: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="14px" height="14px" style={{ userSelect: 'none', flexShrink: 0 }}>
                            <path fill="currentColor" fillRule="evenodd" d="M3.25 6A2.75 2.75 0 0 1 6 3.25h8A2.75 2.75 0 0 1 16.75 6v1.25H18A2.75 2.75 0 0 1 20.75 10v8A2.75 2.75 0 0 1 18 20.75h-8A2.75 2.75 0 0 1 7.25 18v-1.25H6A2.75 2.75 0 0 1 3.25 14zm5.5 12c0 .69.56 1.25 1.25 1.25h8c.69 0 1.25-.56 1.25-1.25v-8c0-.69-.56-1.25-1.25-1.25h-8c-.69 0-1.25.56-1.25 1.25zm6.5-10.75H10A2.75 2.75 0 0 0 7.25 10v5.25H6c-.69 0-1.25-.56-1.25-1.25V6c0-.69.56-1.25 1.25-1.25h8c.69 0 1.25.56 1.25 1.25z" clipRule="evenodd" />
                          </svg>
                          <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Pending Confirmation Card if present */}
                      {msg.pendingAction && (
                        <div style={{ marginTop: '8px', width: '100%', maxWidth: '90%' }}>
                          <ActionConfirmationCard
                            pendingAction={msg.pendingAction}
                            onConfirm={(action, data) => handleConfirmAction(index, action, data)}
                            onCancel={() => handleCancelAction(index)}
                            isExecuting={isExecutingAction}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Reasoning / Execution Loader */}
              {isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: cssVar('backgroundSecondaryColor'),
                      border: `1px solid ${cssVar('borderColor')}`,
                      color: '#0f62fe',
                      fontSize: '12px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        border: '2px solid #0f62fe',
                        borderTopColor: 'transparent',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <span>{REASONING_STEPS[reasoningStepIndex]}</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          </div>

          {/* Composer (ai-chat-composer) */}
          <div
            style={{
              padding: '8px 12px 6px',
              borderTop: `1px solid ${cssVar('borderColor')}`,
              background: cssVar('backgroundPrimaryColor'),
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div
              className="chat-panel-input"
              data-if-focused="false"
              style={{
                border: `1px solid ${cssVar('borderColor')}`,
                borderRadius: '8px',
                padding: '8px 10px 6px',
                background: cssVar('backgroundSecondaryColor'),
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxHeight: '220px',
                boxSizing: 'border-box',
              }}
            >
              <textarea
                ref={inputRef}
                autoFocus={!isGuestMode}
                disabled={isGuestMode}
                rows={1}
                placeholder={
                  isGuestMode
                    ? 'Workspace Copilot is disabled in guest mode'
                    : 'Plan projects, manage tasks, edit docs, and more'
                }
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !isGuestMode) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '14px',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  color: isGuestMode ? cssVar('textSecondaryColor') : cssVar('textPrimaryColor'),
                  cursor: isGuestMode ? 'not-allowed' : 'text',
                  opacity: isGuestMode ? 0.6 : 1,
                  minHeight: '22px',
                  maxHeight: '180px',
                  lineHeight: '1.4',
                  overflowY: 'auto',
                  boxSizing: 'border-box',
                }}
              />

              <div
                className="chat-panel-input-actions"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '2px',
                }}
              >
                {/* Clear history broom icon */}
                <button
                  onClick={() => setShowClearConfirm(true)}
                  title="Clear chat history"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: cssVar('textSecondaryColor'),
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    opacity: 0.7,
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="16px" height="16px" style={{ userSelect: 'none', flexShrink: 0 }}>
                    <path fill="currentColor" fillRule="evenodd" d="M20.777 3.723a.76.76 0 0 1 0 1.075l-6.968 6.968a5.09 5.09 0 0 1 .068 5.946l-2.881 4.1a.663.663 0 0 1-.92.164 29.9 29.9 0 0 1-7.552-7.552.663.663 0 0 1 .164-.92l4.1-2.88a5.09 5.09 0 0 1 5.946.067l6.968-6.968a.76.76 0 0 1 1.075 0M10.25 20.23l2.384-3.393.027-.04c-1.023-.4-2.056-1.083-2.965-1.993-.91-.91-1.592-1.942-1.993-2.965l-.04.027-3.393 2.384a28.3 28.3 0 0 0 5.98 5.98m-1.137-8.962c.313.808.87 1.674 1.658 2.461.787.788 1.653 1.345 2.46 1.658a3.567 3.567 0 0 0-4.118-4.119" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Send button with plane icon */}
                <button
                  onClick={handleSend}
                  disabled={isGuestMode || isLoading || !input.trim()}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: isGuestMode || isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Send message"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="24" height="24" rx="4" fill={isGuestMode || isLoading || !input.trim() ? '#A9A9AD' : '#0f62fe'} />
                    <g clipPath="url(#copilot_send_plane_clip)">
                      <path d="M18.7402 5.45305C18.7402 5.45305 20.2433 4.8669 20.1175 6.2903C20.0761 6.87646 19.7005 8.92818 19.408 11.147L18.4059 17.7205C18.4059 17.7205 18.3223 18.6835 17.5706 18.851C16.8192 19.0181 15.6918 18.2648 15.4829 18.0973C15.3157 17.9716 12.3513 16.0874 11.3074 15.1665C11.015 14.9151 10.6807 14.4129 11.3492 13.8267L15.7332 9.63969C16.2342 9.1375 16.7353 7.96519 14.6475 9.38859L8.8015 13.3659C8.8015 13.3659 8.13333 13.7849 6.88093 13.4081L4.16645 12.5705C4.16645 12.5705 3.16438 11.9425 4.87641 11.3146C9.05221 9.34681 14.1883 7.33725 18.7394 5.45305H18.7402Z" fill="white" />
                    </g>
                    <defs>
                      <clipPath id="copilot_send_plane_clip">
                        <rect width="20" height="20" fill="white" transform="translate(2 2)" />
                      </clipPath>
                    </defs>
                  </svg>
                </button>
              </div>
            </div>

            {/* Footer (chat-panel-footer) */}
            <div
              className="chat-panel-footer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                color: cssVar('textSecondaryColor'),
                fontFamily: "var(--affine-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
                fontSize: '11.5px',
                paddingTop: '2px',
                userSelect: 'none',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="13px" height="13px" style={{ userSelect: 'none', flexShrink: 0, opacity: 0.8 }}>
                <path fill="currentColor" fillRule="evenodd" d="M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25M13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-1 2.75a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75" clipRule="evenodd" />
              </svg>
              <span>AI outputs can be misleading or wrong</span>
            </div>
          </div>

          {/* Clear History Confirmation Modal with Blur Backdrop */}
          {showClearConfirm && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 100,
                background: 'rgba(0, 0, 0, 0.35)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box',
              }}
              onClick={() => setShowClearConfirm(false)}
            >
              <div
                style={{
                  background: cssVar('backgroundPrimaryColor'),
                  borderRadius: '12px',
                  border: `1px solid ${cssVar('borderColor')}`,
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
                  padding: '20px',
                  width: '100%',
                  maxWidth: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ fontWeight: 600, fontSize: '15px', color: cssVar('textPrimaryColor') }}>
                  Clear History
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.5, color: cssVar('textSecondaryColor') }}>
                  Are you sure you want to clear all history? This action will permanently delete all content, including all chat logs and data, and cannot be undone.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      background: cssVar('backgroundSecondaryColor'),
                      color: cssVar('textPrimaryColor'),
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleClearHistory();
                      setShowClearConfirm(false);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#da1e28',
                      color: '#ffffff',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>,
    document.body
  );
};
