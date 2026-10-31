import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { FramePanel } from '@blocksuite/affine/fragments/frame-panel';
import { GfxControllerIdentifier } from '@blocksuite/affine/std/gfx';
import { FrameworkScope, useService, useLiveData } from '@toeverything/infra';
import {
  SidebarIcon,
  RightSidebarIcon,
  AiIcon,
  CommentIcon,
  InformationFillDuotoneIcon,
} from '@blocksuite/icons/rc';

import { AuthService, GraphQLService, EventSourceService, FetchService } from '@affine/core/modules/cloud';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { CopilotClient } from '@affine/core/blocksuite/ai/provider/copilot-client';
import { setupAIProvider } from '@affine/core/blocksuite/ai/provider/setup-provider';
import { DocsService } from '@affine/core/modules/doc';
import { EditorsService, type Editor } from '@affine/core/modules/editor';
import {
  type Workspace,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { BlockSuiteEditor } from '@affine/core/blocksuite/block-suite-editor';
import { notify } from '@affine/component';

import {
  PresentationService,
  PresentationWSService,
  GeminiChatService,
} from '../../../../modules/presentation';
import type { PresentationRoom } from '../../../../modules/presentation/types';

import { QuickSearchContainer } from '@affine/core/modules/quicksearch';

import './present.css';
import { syncThemeCustomCursorStyles } from './theme-cursor-sync';
import { PresentMarkdown } from './present-markdown';
import { StagingLobby } from './staging-lobby';
import illustrationLight from '../../../../assets/other-page.light.png';
import oneLogoLight from '../../../../assets/one-logo-light.png';
import { useCompanyProfile } from '../../../../components/hooks/use-company-profile';
import { applyVirtualBackground, applyAiDenoiser } from './present-utils';
import { VideoGrid } from './video-grid';
import { ControlsBar } from './controls-bar';
import { ChatSidebar, extractCanvasTextContent } from './chat-sidebar';
import { ShellConsole } from './shell-console';
import { IframeBrowser } from './iframe-browser';
import { NavigationGuide, BrowserCursorIcon, MegaphoneIcon } from './navigation-guide';
import { AnnouncementBroadcaster } from './announcement-broadcaster';

const WaitingIllustrationImage = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        animation: 'fadeInIllustration 1s ease-in-out',
      }}
    >
      <style>{`@keyframes fadeInIllustration { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <img
        src={illustrationLight}
        alt="Waiting illustration"
        style={{
          width: '90%',
          maxWidth: '850px',
          maxHeight: '560px',
          height: 'auto',
          objectFit: 'contain',
          marginBottom: '20px',
          borderRadius: '20px',
        }}
      />
    </div>
  );
};


// Mute verbose Agora RTC SDK logs at the console level
if (typeof window !== 'undefined' && !(window as any).__agora_console_intercepted__) {
  (window as any).__agora_console_intercepted__ = true;
  const originalDebug = console.debug;
  const originalInfo = console.info;
  const originalLog = console.log;

  const shouldMute = (...args: any[]) => {
    return args.some(arg =>
      typeof arg === 'string' &&
      (arg.includes('Agora-SDK') || arg.includes('AgoraRTC') || arg.includes('[device-check]'))
    );
  };

  console.debug = function (...args: any[]) {
    if (shouldMute(...args)) return;
    originalDebug.apply(console, args);
  };

  console.info = function (...args: any[]) {
    if (shouldMute(...args)) return;
    originalInfo.apply(console, args);
  };

  console.log = function (...args: any[]) {
    if (shouldMute(...args)) return;
    originalLog.apply(console, args);
  };
}

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

const safePublishVideo = async (client: any, videoTrack: any) => {
  if (!client || !videoTrack) return;
  try {
    await client.publish(videoTrack);
  } catch (pubErr: any) {
    const msg = pubErr?.message || String(pubErr);
    if (msg.includes('already published') || msg.includes('ALREADY_IN_USE')) {
      console.warn('[Agora] Video track already published');
    } else {
      console.warn('[Agora] Safe publish video track warning:', pubErr);
    }
  }
};

interface PresentationRoomPageProps {
  roomId: string;
  workspaceId: string;
  workspace?: Workspace;
  isSharedMode: boolean;
}

const elementConfigs: Record<string, {
  selector: string;
  sidebar?: 'left' | 'right';
  rightTab?: 'chat' | 'gemini' | 'translate';
}> = {
  left_sidebar: {
    selector: '[data-testid="left-sidebar-toggle-btn"], .present-sidebar-left',
  },
  follow_button: {
    selector: '.glass-follow-btn, [data-tooltip*="Follow participant"], [data-tooltip*="Unfollow participant"]',
  },
  right_sidebar_btn: {
    selector: '[data-testid="right-sidebar-toggle-btn"]',
    sidebar: 'right',
  },
  controls_bar: {
    selector: '.sidebar-controls-row, .controls-bar-container',
  },
  self_view: {
    selector: '.user-badge-btn, .ctrl-btn.user-badge-btn',
  },
  share_screen: {
    selector: '[data-testid="screen-share-btn"], button[data-tooltip*="Screen"]',
  },
  av_settings: {
    selector: '[data-testid="av-settings-btn"], button[data-tooltip*="Audio/Video"]',
  },
  right_sidebar: {
    selector: '.present-sidebar-right',
    sidebar: 'right',
  },
  chat_tab: {
    selector: '[data-testid="chat-tab-btn"], [data-tab="chat"]',
    sidebar: 'right',
    rightTab: 'chat',
  },
  gemini_tab: {
    selector: '[data-testid="gemini-tab-btn"], [data-tab="gemini"]',
    sidebar: 'right',
    rightTab: 'gemini',
  },
  translate_tab: {
    selector: '[data-testid="translate-tab-btn"], [data-tab="translate"]',
    sidebar: 'right',
    rightTab: 'translate',
  },
};

export const PresentationRoomPage = ({
  roomId: initialRoomId,
  workspaceId,
  workspace: initialWorkspace,
  isSharedMode,
}: PresentationRoomPageProps) => {
  const { roomId } = useParams<{ roomId: string }>();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const activeRoomId = roomId || initialRoomId;

  const workspacesService = useService(WorkspacesService);
  const presentationService = useService(PresentationService);
  const wsService = useService(PresentationWSService);
  const geminiService = useService(GeminiChatService);
  const authService = useService(AuthService);
  const graphqlService = useService(GraphQLService);
  const eventSourceService = useService(EventSourceService);
  const fetchService = useService(FetchService);
  const globalDialogService = useService(GlobalDialogService);
  const featureFlagService = useService(FeatureFlagService);

  useEffect(() => {
    try {
      featureFlagService.flags.enable_ai.set(true);
      featureFlagService.flags.enable_ai_onboarding.set(true);
      if ('enable_copilot' in featureFlagService.flags) {
        (featureFlagService.flags as any).enable_copilot.set(true);
      }
    } catch (e) {
      console.error('Failed to enable AI feature flags for meeting page', e);
    }
  }, [featureFlagService]);

  useEffect(() => {
    const dispose = setupAIProvider(
      new CopilotClient(
        graphqlService.gql,
        fetchService.fetch,
        eventSourceService.eventSource
      ),
      globalDialogService,
      authService
    );
    return () => {
      dispose();
    };
  }, [
    eventSourceService,
    fetchService,
    graphqlService,
    globalDialogService,
    authService,
  ]);

  useEffect(() => {
    let isChecking = false;
    const checkModalState = () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const modalActive = Boolean(
          document.querySelector(
            '[role="dialog"], [role="presentation"], [data-radix-portal], .modal-overlay, .affine-modal, .affine-confirm-dialog, dialog[open], [data-portal]'
          )
        );
        if (modalActive) {
          if (!document.body.classList.contains('modal-open')) {
            document.body.classList.add('modal-open');
          }
        } else {
          if (document.body.classList.contains('modal-open')) {
            document.body.classList.remove('modal-open');
          }
        }
      } finally {
        isChecking = false;
      }
    };

    checkModalState();
    const observer = new MutationObserver(checkModalState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      document.body.classList.remove('modal-open');
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  const account = useLiveData(authService.session.account$);

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    isSharedMode ? null : (initialWorkspace ?? null)
  );
  const [room, setRoom] = useState<PresentationRoom | null>(null);
  const isHost = !isSharedMode;

  // Parse guest query params (Reject "Guest" or generic placeholder names)
  const searchParams = new URLSearchParams(location.search);
  const rawParam = searchParams.get('guestName');
  let guestName = rawParam || account?.label || '';
  if (guestName.trim().toLowerCase() === 'guest') {
    guestName = '';
  }
  if (guestName && !/^[A-Za-z\s]+$/.test(guestName)) {
    guestName = account?.label || '';
  }

  // Parse or retrieve session ID (persistent per tab session)
  const [sessionId] = useState(() => {
    try {
      const pathParts = window.location.pathname.split('/');
      const idx = pathParts.indexOf('present');
      const rId = idx !== -1 && pathParts[idx + 1] ? pathParts[idx + 1] : '';
      if (rId) {
        const saved = sessionStorage.getItem(`presentation_session_id_${rId}`);
        if (saved) return saved;

        const newSid =
          new URLSearchParams(location.search).get('sessionId') ||
          'session-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(`presentation_session_id_${rId}`, newSid);
        return newSid;
      }
    } catch (_) {}
    return 'session-' + Math.random().toString(36).substr(2, 9);
  });

  const [page, setPage] = useState<any>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorContainer, setEditorContainer] = useState<any>(null);

  // Force-mute state imposed by host
  const [forceMutedAudio, setForceMutedAudio] = useState(false);
  const [forceMutedVideo, setForceMutedVideo] = useState(false);
  const [forceMutedScreen, setForceMutedScreen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [liveRoomData, setLiveRoomData] = useState<any>(null);

  // Guest-specific loading states
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [hostJoinTimedOut, setHostJoinTimedOut] = useState(false);
  const [isTerminalFocused, setIsTerminalFocused] = useState(false);
  const [connectWaitSeconds, setConnectWaitSeconds] = useState(0);
  const [totalWaitSeconds, setTotalWaitSeconds] = useState(0);

  // Live updates from socket
  const connected = useLiveData(wsService.connected$);
  const chatMessages = useLiveData(wsService.chatMessages$);
  const roomEnded = useLiveData(wsService.roomEnded$);
  const pendingJoinRequests = useLiveData(wsService.pendingJoinRequests$);
  const joinPending = useLiveData(wsService.joinPending$);
  const joinRejected = useLiveData(wsService.joinRejected$);
  const kicked = useLiveData(wsService.kicked$);
  const members = useLiveData(wsService.members$);

  useEffect(() => {
    syncThemeCustomCursorStyles();
  }, []);

  useEffect(() => {
    if (connected && room) {
      setConnectWaitSeconds(0);
      return;
    }
    setConnectWaitSeconds(0);
    const timer = setInterval(() => {
      setConnectWaitSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [connected, room]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalWaitSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    const time = room?.startTime || room?.permissions?.startTime;
    const tz = room?.timezone || room?.permissions?.timezone || 'UTC';
    if (!time) return '';
    try {
      const date = new Date(time);
      return `${date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })} (${tz})`;
    } catch (e) {
      return `${time} (${tz})`;
    }
  }, [room]);

  const companyProfile = useCompanyProfile();

  const handleTroubleshoot = useCallback(() => {
    try {
      if (typeof document !== 'undefined' && document.cookie) {
        document.cookie.split(';').forEach(c => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });
      }
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB && indexedDB.databases) {
          indexedDB.databases().then(dbs => {
            dbs.forEach(db => {
              if (db.name) indexedDB.deleteDatabase(db.name);
            });
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Troubleshoot cleanup error:', e);
    }
    window.location.reload();
  }, []);

  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<
    'chat' | 'gemini' | 'translate'
  >('chat');
  const [chatInput, setChatInput] = useState('');
  const [browserInputUrl, setBrowserInputUrl] = useState('');
  const [isBrowserEnlarged, setIsBrowserEnlarged] = useState(false);
  const [geminiInput, setGeminiInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    sessionId: string;
    name: string;
  } | null>(null);

  // Left sidebar mode: 'video' | 'topics' — toggled by composite header button
  const [leftSidebarMode, setLeftSidebarMode] = useState<'video' | 'topics'>(
    'video'
  );
  const [isSidebarSwitching, setIsSidebarSwitching] = useState(false);
  const [topicsTimerValue, setTopicsTimerValue] = useState(50);
  const [isHoveringTopics, setIsHoveringTopics] = useState(false);

  // Persistent attending count so refreshing page never flashes 0 attending
  const [lastKnownCount, setLastKnownCount] = useState<number>(() => {
    try {
      const cached = sessionStorage.getItem(`room_members_count_${activeRoomId}`);
      return cached ? parseInt(cached, 10) : 1;
    } catch (_) {
      return 1;
    }
  });

  useEffect(() => {
    if (members.length > 0) {
      setLastKnownCount(members.length);
      try {
        sessionStorage.setItem(`room_members_count_${activeRoomId}`, String(members.length));
      } catch (_) {}
    }
  }, [members.length, activeRoomId]);

  const attendingCount = members.length > 0 ? members.length : lastKnownCount;

  const [joinRequestsPanelOpen, setJoinRequestsPanelOpen] = useState(false);

  // Synchronized room state from backend
  const roomStateSync = useLiveData(wsService.roomStateSync$);
  const serverStartTime = roomStateSync?.startTime || (room?.createdAt ? new Date(room.createdAt).getTime() : null);

  // Live timer for meeting telemetry status badge matching template.html (persistent timestamp sync)
  const [meetingSeconds, setMeetingSeconds] = useState(0);
  const [hasHostJoined, setHasHostJoined] = useState(false);
  const hostJoinedNow = members.some(m => m.isHost);
  const hostEverJoined =
    isHost ||
    hostJoinedNow ||
    hasHostJoined ||
    Boolean(serverStartTime) ||
    Boolean(localStorage.getItem(`intoai_host_start_${activeRoomId}`));

  useEffect(() => {
    const storageKey = `intoai_host_start_${activeRoomId}`;
    const storedStart = localStorage.getItem(storageKey);
    let localStart = storedStart ? parseInt(storedStart, 10) : null;

    if (serverStartTime && (!localStart || Math.abs(serverStartTime - localStart) > 5000)) {
      localStart = serverStartTime;
      try {
        localStorage.setItem(storageKey, serverStartTime.toString());
      } catch (_) {}
    }

    if (hostJoinedNow && !localStart && !serverStartTime) {
      localStart = Date.now();
      try {
        localStorage.setItem(storageKey, localStart.toString());
      } catch (_) {}
      setHasHostJoined(true);
    } else if ((serverStartTime || localStart) && !hasHostJoined) {
      setHasHostJoined(true);
    }

    const effectiveStartTime = serverStartTime || localStart;
    if (!effectiveStartTime) return;

    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - effectiveStartTime) / 1000));
      setMeetingSeconds(elapsed);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [connected, hostJoinedNow, activeRoomId, hasHostJoined, serverStartTime]);

  // Theme dark mode state (fully synchronized with workspace resolvedTheme)
  const [isDarkMode, setIsDarkMode] = useState(isDark);
  useEffect(() => {
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark-theme', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark-theme', isDark);
    document.body.classList.toggle('dark', isDark);
  }, [isDark]);

  // Effect to update "All frames" header label to "All Topics" and replace gear icon in Topics sidebar
  useEffect(() => {
    const updateTopicsHeader = () => {
      try {
        const updateInRoot = (root: Document | ShadowRoot | Element) => {
          const labels = root.querySelectorAll('.all-frames-setting-label');
          labels.forEach(label => {
            if (label.textContent !== 'All Topics') {
              label.textContent = 'All Topics';
            }
          });

          const buttons = root.querySelectorAll('.all-frames-setting-button');
          buttons.forEach(btn => {
            btn.setAttribute('style', 'pointer-events: none !important; cursor: default !important; opacity: 0.7 !important;');
            btn.removeAttribute('tooltip');
            btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h12"/></svg>`;
          });

          const elementsWithShadow = root.querySelectorAll('*');
          elementsWithShadow.forEach(el => {
            if (el.shadowRoot) {
              updateInRoot(el.shadowRoot);
            }
          });
        };

        updateInRoot(document);
      } catch (_) {}
    };

    const interval = setInterval(updateTopicsHeader, 400);
    return () => clearInterval(interval);
  }, []);

  // State for bottom-left context options menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Zoom percentage state & vertical box layout for bottom-left zoom navigation capsule
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isZoomBarVertical, setIsZoomBarVertical] = useState(false);
  const zoomBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateZoom = () => {
      try {
        const root = document.querySelector('affine-edgeless-root') as any;
        const vp = root?.gfx?.viewport || root?.service?.viewport;
        if (vp?.zoom) {
          setZoomPercent(Math.round(vp.zoom * 100));
        }
      } catch (_) {}
    };

    const interval = setInterval(updateZoom, 600);
    return () => clearInterval(interval);
  }, []);

  // Proximity detection: automatically collapse bottom-left zoom bar to vertical box when canvas bottom tools come near or right sidebar opens
  useEffect(() => {
    const checkProximity = () => {
      try {
        if (!zoomBarRef.current) return;
        const zoomRect = zoomBarRef.current.getBoundingClientRect();
        if (zoomRect.width === 0) return;

        const mainEl = document.querySelector('main');
        const mainWidth = mainEl ? mainEl.getBoundingClientRect().width : window.innerWidth;

        const selectors = [
          'edgeless-toolbar',
          'affine-edgeless-toolbar',
          'affine-toolbar',
          '.edgeless-default-toolbar',
          '[data-testid="toolbar"]',
          '.affine-edgeless-toolbar-widget',
          '.edgeless-toolbar-container',
          '.affine-toolbar-container',
          '.canvas-bottom-tools',
          '.affine-page-toolbar',
        ];

        let bottomToolbarEl: Element | null = null;
        for (const s of selectors) {
          const el = document.querySelector(s);
          if (el && el.getBoundingClientRect().width > 0) {
            bottomToolbarEl = el;
            break;
          }
          const root = document.querySelector('affine-edgeless-root') || document.querySelector('affine-page-root');
          if (root && root.shadowRoot) {
            const shadowEl = root.shadowRoot.querySelector(s);
            if (shadowEl && shadowEl.getBoundingClientRect().width > 0) {
              bottomToolbarEl = shadowEl;
              break;
            }
          }
        }

        if (bottomToolbarEl) {
          const tbRect = bottomToolbarEl.getBoundingClientRect();
          const gap = tbRect.left - zoomRect.right;
          const isClose = gap < 45 || tbRect.left <= zoomRect.right + 30 || mainWidth < 1080;
          setIsZoomBarVertical(isClose);
        } else {
          const isNarrow = mainWidth < 1080 || rightSidebarOpen;
          setIsZoomBarVertical(isNarrow);
        }
      } catch (_) {}
    };

    checkProximity();

    // Trigger immediate checks and animated interval during sidebar toggle transition
    const t1 = setTimeout(checkProximity, 50);
    const t2 = setTimeout(checkProximity, 150);
    const t3 = setTimeout(checkProximity, 300);
    const interval = setInterval(checkProximity, 250);

    window.addEventListener('resize', checkProximity);

    let resizeObserver: ResizeObserver | null = null;
    const mainEl = document.querySelector('main');
    if (mainEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkProximity();
      });
      resizeObserver.observe(mainEl);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
      window.removeEventListener('resize', checkProximity);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [rightSidebarOpen, leftSidebarMode]);

  // Outside click listener for join requests dropdown panel matching template.html
  const joinRequestsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (joinRequestsRef.current && !joinRequestsRef.current.contains(e.target as Node)) {
        setJoinRequestsPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [localKicked, setLocalKicked] = useState(() => {
    try {
      const pathParts = window.location.pathname.split('/');
      const idx = pathParts.indexOf('present');
      const rId = idx !== -1 && pathParts[idx + 1] ? pathParts[idx + 1] : '';
      if (rId) {
        return localStorage.getItem(`presentation_kicked_${rId}`) === 'true';
      }
    } catch (_) {}
    return false;
  });

  const isCurrentlyKicked = kicked || localKicked;

  useEffect(() => {
    if (kicked && room?.id) {
      try {
        localStorage.setItem(`presentation_kicked_${room.id}`, 'true');
        setLocalKicked(true);
      } catch (_) {}
    }
  }, [kicked, room?.id]);

  const roomState = useLiveData(wsService.roomStateSync$);
  const terminalHistory = useLiveData(wsService.terminalHistory$);

  // New production streams
  const wsAgoraUidMap = useLiveData(wsService.agoraUidMap$);
  const wsForceMuteAll = useLiveData(wsService.forceMuteAll$);
  const wsForceUnmuteAll = useLiveData(wsService.forceUnmuteAll$);
  const wsForceMute = useLiveData(wsService.forceMute$);

  // Production: Agora UID → sessionId mapping (populated via WebSocket)
  const agoraUidToSessionMap = useMemo(() => {
    return new Map(
      Object.entries(wsAgoraUidMap || {}).map(([uid, sid]) => [
        Number(uid),
        sid as string,
      ])
    );
  }, [wsAgoraUidMap]);

  const resolveUserName = useCallback(
    (agoraUid: number) => {
      const isScreenShare = agoraUid >= 100000;
      const baseUid = isScreenShare ? agoraUid - 100000 : agoraUid;
      const sid = agoraUidToSessionMap.get(baseUid) ?? '';
      const member = members.find(m => m.sessionId === sid);
      let name = member?.name;
      const isHostMember = member ? member.isHost : isHost;

      if (isHostMember) {
        const realHostName = (member?.name && member.name !== 'Host' && member.name.trim().toLowerCase() !== 'guest')
          ? member.name
          : (account?.label || 'Host');
        name = realHostName !== 'Host' ? `Host (${realHostName})` : 'Host';
      } else {
        if (!name || name.trim().toLowerCase() === 'guest') {
          name = `Participant ${baseUid}`;
        }
      }

      if (isScreenShare) {
        name = `${name} (Screen Share)`;
      }
      return {
        name,
        sessionId: sid,
        isHost: isHostMember,
        member,
      };
    },
    [members, agoraUidToSessionMap, account, isHost]
  );

  // ── Agora RTC state ───────────────────────────────────────────────
  const [agoraLoaded, setAgoraLoaded] = useState(false);
  const agoraClientRef = useRef<any>(null);
  const activeAgoraAppIdRef = useRef<string>('');
  const localAudioTrackRef = useRef<any>(null);
  const localVideoTrackRef = useRef<any>(null);
  const localScreenClientRef = useRef<any>(null);
  const localScreenTrackRef = useRef<any>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const pendingDisconnectsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [localUid, setLocalUid] = useState<number | null>(null);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [activeMainScreenShareUid, setActiveMainScreenShareUid] = useState<number | null>(null);
  const [speakingUids, setSpeakingUids] = useState<Set<number>>(new Set());

  const activeScreenShareUser = useMemo(() => {
    const localScreenUid = (localUid ?? 0) + 100000;

    // Local screen share active
    if (isSharingScreen && localScreenTrackRef.current) {
      if (
        activeMainScreenShareUid !== null &&
        Number(activeMainScreenShareUid) !== Number(localScreenUid) &&
        Number(activeMainScreenShareUid) !== Number(localUid)
      ) {
        const remote = remoteUsers.find(
          u =>
            (Number(u.uid) === Number(activeMainScreenShareUid) ||
             Number(u.uid) - 100000 === Number(activeMainScreenShareUid)) &&
            u.videoTrack
        );
        if (remote) {
          return { isLocal: false, uid: remote.uid, track: remote.videoTrack, user: remote };
        }
      }
      return { isLocal: true, uid: localUid || 999999, track: localScreenTrackRef.current };
    }

    // Remote screen share active — ONLY show if activeMainScreenShareUid is explicitly selected/followed by the user
    if (activeMainScreenShareUid !== null) {
      const remote = remoteUsers.find(
        u =>
          (Number(u.uid) === Number(activeMainScreenShareUid) ||
           Number(u.uid) - 100000 === Number(activeMainScreenShareUid)) &&
          u.videoTrack
      );
      if (remote) {
        return { isLocal: false, uid: remote.uid, track: remote.videoTrack, user: remote };
      }
    }

    return null;
  }, [activeMainScreenShareUid, remoteUsers, isSharingScreen, localUid]);
  const [loudSpeakingUids, setLoudSpeakingUids] = useState<Set<number>>(
    new Set()
  );

  const [pinnedSessionIds, setPinnedSessionIds] = useState<string[]>(() => {
    if (!activeRoomId) return [];
    try {
      const stored = localStorage.getItem(`presentation_pinned_session_ids_${activeRoomId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {
          return [stored];
        }
      }
      const legacy = localStorage.getItem(`presentation_pinned_session_id_${activeRoomId}`);
      if (legacy) {
        return [legacy];
      }
    } catch (_) {}
    return [];
  });

  // Presentation follower state (zoom & pan coordination)
  const [followingSessionId, setFollowingSessionId] = useState<string | null>(null);
  const [hasManuallyUnfollowed, setHasManuallyUnfollowed] = useState(() => {
    if (!activeRoomId) return false;
    try {
      return localStorage.getItem(`presentation_has_manually_unfollowed_${activeRoomId}`) === 'true';
    } catch (_) {
      return false;
    }
  });
  const isApplyingFollowedViewportRef = useRef(false);
  const lastUserInteractionTimeRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);

  const handleSetFollowing = useCallback((target: React.SetStateAction<string | null>) => {
    hasInitializedRef.current = true;

    setFollowingSessionId(prev => {
      const targetSessionId = typeof target === 'function'
        ? (target as (prev: string | null) => string | null)(prev)
        : target;

      if (!activeRoomId) return targetSessionId;
      try {
        if (targetSessionId) {
          const member = members.find(m => m.sessionId === targetSessionId);
          if (member) {
            localStorage.setItem(`presentation_followed_member_name_${activeRoomId}`, member.name);
            localStorage.setItem(`presentation_has_manually_unfollowed_${activeRoomId}`, 'false');
            setHasManuallyUnfollowed(false);
          }
        } else {
          localStorage.removeItem(`presentation_followed_member_name_${activeRoomId}`);
          localStorage.setItem(`presentation_has_manually_unfollowed_${activeRoomId}`, 'true');
          setHasManuallyUnfollowed(true);
        }
      } catch (_) {}

      return targetSessionId;
    });
  }, [members, activeRoomId]);

  const followingMember = useMemo(() => {
    return members.find(m => m.sessionId === followingSessionId);
  }, [members, followingSessionId]);

  const followingName = useMemo(() => {
    if (!followingMember) return '';
    return followingMember.isHost
      ? `${followingMember.name} (Presenter)`
      : followingMember.name;
  }, [followingMember]);

  // Audio/Video enhancements (Requirement 1, 3)
  const [isEchoCancellationOn, setIsEchoCancellationOn] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_presentation_aec');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const [isAutomaticGainControlOn, setIsAutomaticGainControlOn] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_presentation_agc');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const [isNoiseSuppressionOn, setIsNoiseSuppressionOn] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_presentation_native_ans');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const audioProfile = 'speech_standard';
  const [activeVirtualBg, setActiveVirtualBg] = useState<
    'none' | 'blur' | 'office' | 'beach' | 'custom'
  >(() => {
    try {
      return (localStorage.getItem('intoai_presentation_virtual_bg') as any) || 'none';
    } catch (_) {
      return 'none';
    }
  });
  const [customBgImage, setCustomBgImage] = useState<string>(() => {
    try {
      return localStorage.getItem('intoai_presentation_custom_bg_img') || '';
    } catch (_) {
      return '';
    }
  });
  const [isAiNoiseSuppressionOn, setIsAiNoiseSuppressionOn] = useState(() => {
    try {
      return localStorage.getItem('intoai_presentation_ai_noise') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [isAiNoiseSuppressionActive, setIsAiNoiseSuppressionActive] = useState(() => {
    try {
      return localStorage.getItem('intoai_presentation_ai_noise') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [localVideoTrackState, setLocalVideoTrackState] = useState<any>(null);
  const [localAudioTrackState, setLocalAudioTrackState] = useState<any>(null);
  const [pipUserUid, setPipUserUid] = useState<number | null>(null);
  const [pipPosition, setPipPosition] = useState<{ x: number; y: number } | null>(null);
  const isMicOnRef = useRef(false);
  const isDraggingPipRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePipPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    isDraggingPipRef.current = true;

    const el = e.currentTarget.parentElement || e.currentTarget;
    const rect = el.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!isDraggingPipRef.current) return;
      const width = rect.width || 280;
      const height = rect.height || 168;
      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, ev.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, ev.clientY - dragOffsetRef.current.y));
      setPipPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      isDraggingPipRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, []);
  const isCamOnRef = useRef(false);

  // Visitor staging joining states (Requirement 6)
  const [hasSubmittedStaging, setHasSubmittedStaging] = useState(() => {
    try {
      const pathParts = window.location.pathname.split('/');
      const idx = pathParts.indexOf('present');
      const rId = idx !== -1 && pathParts[idx + 1] ? pathParts[idx + 1] : '';
      if (rId) {
        return (
          sessionStorage.getItem(`presentation_staging_submitted_${rId}`) ===
          'true'
        );
      }
    } catch (_) {}
    return false;
  });
  const [stagingName, setStagingName] = useState(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const queryName = searchParams.get('guestName');
      if (queryName && queryName.trim().toLowerCase() !== 'guest') return queryName;

      const saved = localStorage.getItem('intoai_guest_name');
      if (saved && saved.trim().toLowerCase() !== 'guest') return saved;
    } catch (_) {}
    return '';
  });
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState(() => {
    try {
      return localStorage.getItem('intoai_presentation_selected_mic') || '';
    } catch (_) {
      return '';
    }
  });
  const [selectedVideoInput, setSelectedVideoInput] = useState(() => {
    try {
      return localStorage.getItem('intoai_presentation_selected_cam') || '';
    } catch (_) {
      return '';
    }
  });
  // Persist presentation settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_virtual_bg', activeVirtualBg);
    } catch (_) {}
  }, [activeVirtualBg]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_custom_bg_img', customBgImage);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        alert(
          'Failed to save custom virtual background: the image file size is too large. Please upload an image smaller than 1.5MB.'
        );
      } else {
        console.error('[LocalStorage] Failed to save custom background:', e);
      }
    }
  }, [customBgImage]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_aec', String(isEchoCancellationOn));
    } catch (_) {}
  }, [isEchoCancellationOn]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_agc', String(isAutomaticGainControlOn));
    } catch (_) {}
  }, [isAutomaticGainControlOn]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_native_ans', String(isNoiseSuppressionOn));
    } catch (_) {}
  }, [isNoiseSuppressionOn]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_ai_noise', String(isAiNoiseSuppressionOn));
    } catch (_) {}
  }, [isAiNoiseSuppressionOn]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_mic_on', String(isMicOn));
    } catch (_) {}
  }, [isMicOn]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_cam_on', String(isCamOn));
    } catch (_) {}
  }, [isCamOn]);

  useEffect(() => {
    if (selectedVideoInput) {
      try {
        localStorage.setItem('intoai_presentation_selected_cam', selectedVideoInput);
      } catch (_) {}
    }
  }, [selectedVideoInput]);

  useEffect(() => {
    if (selectedAudioInput) {
      try {
        localStorage.setItem('intoai_presentation_selected_mic', selectedAudioInput);
      } catch (_) {}
    }
  }, [selectedAudioInput]);

  // Persist pinnedSessionIds to localStorage when they change
  useEffect(() => {
    if (!activeRoomId) return;
    const key = `presentation_pinned_session_ids_${activeRoomId}`;
    const legacyKey = `presentation_pinned_session_id_${activeRoomId}`;
    if (pinnedSessionIds.length > 0) {
      localStorage.setItem(key, JSON.stringify(pinnedSessionIds));
      localStorage.setItem(legacyKey, pinnedSessionIds[0]);
    } else {
      localStorage.removeItem(key);
      localStorage.removeItem(legacyKey);
    }
  }, [pinnedSessionIds, activeRoomId]);

  // Host-controlled media permissions (hydrated from WS on join + runtime updates)
  const mediaPerms = useLiveData(wsService.mediaPermissions$);
  const translationMessages = useLiveData(wsService.translationMessages$) || [];
  const [isTranscribing, setIsTranscribing] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // Live Continuous Speech Recognition with Agora Audio Input
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const isTranslationActive = mediaPerms?.allowTranslation ?? room?.permissions?.allowTranslation ?? false;
    if (!isTranslationActive || !isMicOn || forceMutedAudio || !connected || !room?.id) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
        speechRecognitionRef.current = null;
      }
      setIsTranscribing(false);
      return;
    }

    let recognition: any = null;
    let isCancelled = false;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (!isCancelled) setIsTranscribing(true);
      };

      recognition.onresult = (event: any) => {
        if (isCancelled) return;
        const results = event.results;
        for (let i = event.resultIndex; i < results.length; i++) {
          if (results[i].isFinal) {
            const transcript = results[i][0]?.transcript?.trim();
            if (transcript && transcript.length > 0) {
              const speakerName = account?.label || (isHost ? 'Host' : (guestName || 'Participant'));
              const msg = {
                id: `trans-${sessionId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                roomId: room.id,
                sessionId,
                speakerName,
                originalText: transcript,
                originalLanguage: 'en',
                translations: {},
                timestamp: Date.now(),
                isFinal: true,
              };
              wsService.sendSpeechTranscription(room.id, msg);
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          return;
        }
        console.debug('[SpeechRecognition] notice:', event.error);
      };

      recognition.onend = () => {
        if (!isCancelled && isMicOn && !forceMutedAudio && isTranslationActive) {
          try {
            recognition.start();
          } catch (_) {}
        } else {
          setIsTranscribing(false);
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn('[SpeechRecognition] Init notice:', e);
    }

    return () => {
      isCancelled = true;
      if (recognition) {
        try {
          recognition.stop();
        } catch (_) {}
      }
      speechRecognitionRef.current = null;
      setIsTranscribing(false);
    };
  }, [
    isMicOn,
    forceMutedAudio,
    mediaPerms?.allowTranslation,
    room?.permissions?.allowTranslation,
    connected,
    room?.id,
    sessionId,
    account?.label,
    isHost,
    guestName,
    wsService,
  ]);

  useEffect(() => {
    if (showInfoModal && room?.id) {
      fetch(`/api/presentation/rooms/${room.id}`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data) setLiveRoomData(data);
        })
        .catch(e => console.error('Failed to fetch real-time room info', e));
    }
  }, [showInfoModal, room?.id]);
  const [agoraError, setAgoraError] = useState<string | null>(null);
  const [ssNotifications, setSsNotifications] = useState<
    Array<{
      id: string;
      uid?: number;
      userName?: string;
      type?: 'screenshare' | 'announcement' | 'disabled_media';
      mediaType?: string;
      message?: string;
    }>
  >([]);

  // Self-view (raw camera stream, no Agora latency)
  const selfViewVideoRef = useRef<HTMLVideoElement | null>(null);

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  // Collaborative Action Console States
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [executionSelectedUsers, setExecutionSelectedUsers] = useState<string[]>(['all']);
  const [consoleTab, setConsoleTab] = useState<'left' | 'right'>('left');
  const [executionMessage, setExecutionMessage] = useState('');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementSelectedUsers, setAnnouncementSelectedUsers] = useState<string[]>(['all']);

  // Custom element refs, warning refs, and YJS command engine variables
  const mountTimestampRef = useRef<number>(Date.now());
  const executedCommandsSetRef = useRef<Set<string>>(new Set());
  const hasTriggeredRightSidebarActionRef = useRef(false);
  const followingSessionIdRef = useRef<string | null>(null);
  const isProgrammaticClickRef = useRef<boolean>(false);
  const [pendingFrameClickTarget, setPendingFrameClickTarget] = useState<any>(null);

  useEffect(() => {
    followingSessionIdRef.current = followingSessionId;
  }, [followingSessionId]);

  const [roomEndedModalOpen, setRoomEndedModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof window !== 'undefined' ? window.navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    isCamOnRef.current = isCamOn;
  }, [isCamOn]);

  // ── Screenshare detection and notification stack ───────────────────
  const currentScreenSharingUsers = useMemo(() => {
    const list = remoteUsers.filter(u => u.uid >= 100000);
    if (isSharingScreen && localUid !== null) {
      list.push({ uid: localUid + 100000 } as any);
    }
    return list;
  }, [remoteUsers, isSharingScreen, localUid]);

  const lastScreenSharingUsersRef = useRef<number[]>([]);
  useEffect(() => {
    const currentUids = currentScreenSharingUsers.map(u => u.uid);
    // Find newly added screensharers
    currentUids.forEach(uid => {
      if (!lastScreenSharingUsersRef.current.includes(uid)) {
        const isLocalScreen = localUid !== null && uid === localUid + 100000;
        if (!isLocalScreen) {
          const resolved = resolveUserName(uid);
          setSsNotifications(prev => {
            if (prev.some(n => n.uid === uid)) return prev;
            return [
              ...prev,
              {
                id: `${uid}-${Date.now()}`,
                uid,
                userName: resolved.name.replace(' (Screen Share)', ''),
              },
            ];
          });
        }
      }
    });

    // If a screenshare stops, remove its notification automatically
    setSsNotifications(prev => prev.filter(n => currentUids.includes(n.uid)));

    // If the active main screenshare stops, return to canvas
    const localScreenUid = (localUid ?? 0) + 100000;
    const isLocalScreenActive = isSharingScreen && activeMainScreenShareUid === localScreenUid;
    if (
      activeMainScreenShareUid !== null &&
      !currentUids.includes(activeMainScreenShareUid) &&
      !isLocalScreenActive
    ) {
      setActiveMainScreenShareUid(null);
    }

    lastScreenSharingUsersRef.current = currentUids;
  }, [
    currentScreenSharingUsers,
    localUid,
    resolveUserName,
    activeMainScreenShareUid,
    isSharingScreen,
  ]);

  useEffect(() => {
    if (activeMainScreenShareUid === null) return;

    const playTrack = () => {
      const el = document.getElementById('agora-main-screenshare-viewport');
      if (!el) return;

      const localScreenUid = (localUid ?? 0) + 100000;
      const isLocalScreen =
        localScreenTrackRef.current &&
        (activeMainScreenShareUid === localScreenUid ||
         activeMainScreenShareUid === localUid);

      if (isLocalScreen) {
        try {
          el.innerHTML = '';
          localScreenTrackRef.current.play(el);
        } catch (e) {
          console.error('[Agora] Play main local screenshare error:', e);
        }
      } else {
        const user = remoteUsers.find(
          (u: any) => Number(u.uid) === Number(activeMainScreenShareUid)
        );
        if (user && user.videoTrack) {
          try {
            el.innerHTML = '';
            user.videoTrack.play(el);
          } catch (e) {
            console.error('[Agora] Play main screenshare error:', e);
          }
        }
      }
    };

    let raf: number;
    let t: ReturnType<typeof setTimeout>;
    raf = requestAnimationFrame(() => {
      t = setTimeout(playTrack, 100);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [activeMainScreenShareUid, remoteUsers, isSharingScreen, localUid]);

  // Active speaker debounce / stability tracker
  const [stableSpeakingUids, setStableSpeakingUids] = useState<Set<number>>(
    new Set()
  );
  const lastSpokeTimestamps = useRef<Map<number, number>>(new Map());

  // Prune speaking UIDs that haven't spoken in the last 600ms (debounced for low latency response)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const nextSpeaking = new Set(stableSpeakingUids);

      lastSpokeTimestamps.current.forEach((timestamp, uid) => {
        if (now - timestamp > 600) {
          if (nextSpeaking.has(uid)) {
            nextSpeaking.delete(uid);
            changed = true;
          }
          lastSpokeTimestamps.current.delete(uid);
        }
      });

      if (changed) {
        setStableSpeakingUids(nextSpeaking);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [stableSpeakingUids]);

  // Update speaking timestamps when volume indicator fires
  useEffect(() => {
    if (speakingUids.size > 0) {
      let changed = false;
      const nextSpeaking = new Set(stableSpeakingUids);

      speakingUids.forEach(uid => {
        lastSpokeTimestamps.current.set(uid, Date.now());
        if (!nextSpeaking.has(uid)) {
          nextSpeaking.add(uid);
          changed = true;
        }
      });

      if (changed) {
        setStableSpeakingUids(nextSpeaking);
      }
    }
  }, [speakingUids, stableSpeakingUids]);

  // Stable sorting of remote users based on priority rules (filtering out duplicate session tabs)
  const sortedRemoteUsers = useMemo(() => {
    const seenSessionIds = new Set<string>();
    const validRemoteUsers = remoteUsers.filter(u => {
      // ALWAYS keep screen share streams (uid >= 100000)
      if (Number(u.uid) >= 100000) return true;

      const { sessionId: memberSessionId } = resolveUserName(u.uid);
      if (memberSessionId) {
        if (memberSessionId === sessionId) return false;
        if (seenSessionIds.has(memberSessionId)) return false;
        seenSessionIds.add(memberSessionId);
      }
      return true;
    });
    return [...validRemoteUsers].sort((a, b) => {
      const getScore = (user: any) => {
        let score = 0;

        const { sessionId: memberSessionId, isHost: isMemberHost } =
          resolveUserName(user.uid);
        const targetPinId = memberSessionId || String(user.uid);
        const pinIndex = pinnedSessionIds.indexOf(targetPinId);
        const isPinned = pinIndex !== -1;
        const isScreenShare = user.uid >= 100000;
        const isSpeaking = stableSpeakingUids.has(user.uid);
        const hasCam = !!user.videoTrack;
        const lastSpoke = lastSpokeTimestamps.current.get(user.uid) ?? 0;

        // Rule 1: Pinned participant (1,000,000)
        if (isPinned) score += 1000000;

        // Rule 2: Screen sharing participant (500,000)
        if (isScreenShare) score += 500000;

        // Rule 3: Active speaker WITH camera (250,000)
        if (isSpeaking && hasCam) {
          score += 250000 + (lastSpoke % 10000);
        }

        // Rule 4: Active speaker WITHOUT camera (100,000)
        if (isSpeaking && !hasCam) {
          score += 100000 + (lastSpoke % 10000);
        }

        // Rule 5: Host/presenter (50,000)
        if (isMemberHost) score += 50000;

        // Rule 6: Camera-enabled participants (25,000)
        if (hasCam && !isSpeaking) score += 25000;

        // Rule 7: Audio-only participants (10,000)
        if (!hasCam && !isSpeaking && user.audioTrack) score += 10000;

        return { score, pinIndex };
      };

      const resA = getScore(a);
      const resB = getScore(b);

      if ((resA.pinIndex !== -1) !== (resB.pinIndex !== -1)) {
        return resB.score - resA.score;
      }

      if (resA.pinIndex !== -1 && resB.pinIndex !== -1) {
        return resA.pinIndex - resB.pinIndex;
      }

      if (resA.score !== resB.score) {
        return resB.score - resA.score; // descending
      }

      // Stable secondary sorting by UID
      return a.uid - b.uid;
    });
  }, [remoteUsers, pinnedSessionIds, stableSpeakingUids, resolveUserName]);

  // ── FLIP Layout Animation Hook for Video Tiles ───────────────────
  const tilePositionsRef = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const gridEl = document.querySelector('.agora-video-grid');
    if (!gridEl) return;

    const tiles = gridEl.querySelectorAll('.agora-video-tile');
    const rects = new Map<string, DOMRect>();

    // 1. Measure all current top positions (post-render layout)
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i] as HTMLElement;
      const key = tile.getAttribute('data-tile-key');
      if (key) {
        rects.set(key, tile.getBoundingClientRect());
      }
    }

    // 2. Apply FLIP animations to shifted tiles
    rects.forEach((rect, key) => {
      const prevTop = tilePositionsRef.current.get(key);
      if (prevTop !== undefined) {
        const deltaY = prevTop - rect.top;
        if (deltaY !== 0) {
          let tileEl: HTMLElement | null = null;
          for (let i = 0; i < tiles.length; i++) {
            const t = tiles[i] as HTMLElement;
            if (t.getAttribute('data-tile-key') === key) {
              tileEl = t;
              break;
            }
          }
          if (tileEl) {
            tileEl.style.transition = 'none';
            tileEl.style.transform = `translateY(${deltaY}px)`;

            // Force layout reflow
            tileEl.offsetHeight;

            // Play (transition to default using the CSS transition class)
            tileEl.style.transition = '';
            tileEl.style.transform = '';
          }
        }
      }
    });

    // 3. Cache current positions for the next update
    rects.forEach((rect, key) => {
      tilePositionsRef.current.set(key, rect.top);
    });
  }, [sortedRemoteUsers, pinnedSessionIds, stableSpeakingUids, leftSidebarMode]);

  // Revoke active screen share if host disables guest screen sharing permission
  useEffect(() => {
    if (!isHost && !mediaPerms.allowGuestScreenShare && isSharingScreen) {
      try {
        localScreenTrackRef.current?.close();
        localScreenTrackRef.current = null;
        localScreenClientRef.current?.leave().catch(() => {});
        localScreenClientRef.current = null;
      } catch (e) {
        console.error('[Agora] Screen share revocation error:', e);
      }
      setIsSharingScreen(false);
    }
  }, [mediaPerms.allowGuestScreenShare, isHost, isSharingScreen]);

  // Revoke microphone/camera if guest permissions are changed by the host
  useEffect(() => {
    if (isHost) return;

    // 1. If microphone is currently on but no longer allowed
    if (!mediaPerms.allowGuestAudio && isMicOn) {
      const turnOffMic = async () => {
        const track = localAudioTrackRef.current;
        if (track) {
          try {
            if (agoraClientRef.current) {
              await agoraClientRef.current.unpublish(track);
            }
          } catch (e) {
            console.warn('[Agora] Mic auto-unpublish warning:', e);
          }
          try {
            track.close();
          } catch (_) {}
          localAudioTrackRef.current = null;
        }
        setIsMicOn(false);
      };
      turnOffMic();
    }

    // 2. If camera is currently on but no longer allowed
    if (!mediaPerms.allowGuestVideo && isCamOn) {
      const turnOffCam = async () => {
        const track = localVideoTrackRef.current;
        if (track) {
          try {
            if (agoraClientRef.current) {
              await agoraClientRef.current.unpublish(track);
            }
          } catch (e) {
            console.warn('[Agora] Cam auto-unpublish warning:', e);
          }
          try {
            track.close();
          } catch (_) {}
          localVideoTrackRef.current = null;
          setLocalVideoTrackState(null);
        }
        setIsCamOn(false);
      };
      turnOffCam();
    }
  }, [
    mediaPerms.allowGuestAudio,
    mediaPerms.allowGuestVideo,
    isHost,
    isMicOn,
    isCamOn,
  ]);

  // Handle host force-mute-all
  useEffect(() => {
    if (!wsForceMuteAll) return;
    const { type } = wsForceMuteAll;
    if ((type === 'audio' || type === 'all') && !isHost) {
      setForceMutedAudio(true);
      const track = localAudioTrackRef.current;
      if (track) {
        agoraClientRef.current?.unpublish(track).catch(() => {});
        try { track.close(); } catch (_) {}
        localAudioTrackRef.current = null;
        setLocalAudioTrackState(null);
      }
      setIsMicOn(false);
      isMicOnRef.current = false;
    }
    if ((type === 'video' || type === 'all') && !isHost) {
      setForceMutedVideo(true);
      const track = localVideoTrackRef.current;
      if (track) {
        agoraClientRef.current?.unpublish(track).catch(() => {});
        try { track.close(); } catch (_) {}
        localVideoTrackRef.current = null;
        setLocalVideoTrackState(null);
      }
      setIsCamOn(false);
      isCamOnRef.current = false;
    }
  }, [wsForceMuteAll, isHost]);

  // Handle host force-unmute-all (lift restrictions)
  useEffect(() => {
    if (!wsForceUnmuteAll) return;
    const { type } = wsForceUnmuteAll;
    if (type === 'audio' || type === 'all') setForceMutedAudio(false);
    if (type === 'video' || type === 'all') setForceMutedVideo(false);
  }, [wsForceUnmuteAll]);

  // Handle per-user force mute / unmute from host
  useEffect(() => {
    if (!wsForceMute) return;
    const { type, muted } = wsForceMute;
    if (type === 'audio') {
      setForceMutedAudio(muted);
      if (muted) {
        const track = localAudioTrackRef.current;
        if (track) {
          agoraClientRef.current?.unpublish(track).catch(() => {});
          try { track.close(); } catch (_) {}
          localAudioTrackRef.current = null;
          setLocalAudioTrackState(null);
        }
        setIsMicOn(false);
        isMicOnRef.current = false;
      }
    }
    if (type === 'video') {
      setForceMutedVideo(muted);
      if (muted) {
        const track = localVideoTrackRef.current;
        if (track) {
          agoraClientRef.current?.unpublish(track).catch(() => {});
          try { track.close(); } catch (_) {}
          localVideoTrackRef.current = null;
          setLocalVideoTrackState(null);
        }
        setIsCamOn(false);
        isCamOnRef.current = false;
      }
    }
    if (type === 'screen') {
      setForceMutedScreen(muted);
      if (muted && isSharingScreen) {
        try {
          localScreenTrackRef.current?.close();
          localScreenTrackRef.current = null;
          localScreenClientRef.current?.leave();
          localScreenClientRef.current = null;
        } catch (_) {}
        setIsSharingScreen(false);
      }
    }
  }, [wsForceMute, isSharingScreen]);

  // Synchronize individual mutes from persistent roomState on load or updates (persistent on refresh)
  useEffect(() => {
    if (!roomState || isHost) return;
    const myMutes = (roomState as any).forceMutedUsers?.[sessionId] || [];
    const isMutedAudio = myMutes.includes('audio');
    const isMutedVideo = myMutes.includes('video');
    const isMutedScreen = myMutes.includes('screen');

    if (isMutedAudio !== forceMutedAudio) {
      setForceMutedAudio(isMutedAudio);
      if (isMutedAudio) {
        const track = localAudioTrackRef.current;
        if (track) {
          agoraClientRef.current?.unpublish(track).catch(() => {});
          try { track.close(); } catch (_) {}
          localAudioTrackRef.current = null;
          setLocalAudioTrackState(null);
        }
        setIsMicOn(false);
        isMicOnRef.current = false;
      }
    }

    if (isMutedVideo !== forceMutedVideo) {
      setForceMutedVideo(isMutedVideo);
      if (isMutedVideo) {
        const track = localVideoTrackRef.current;
        if (track) {
          agoraClientRef.current?.unpublish(track).catch(() => {});
          try { track.close(); } catch (_) {}
          localVideoTrackRef.current = null;
          setLocalVideoTrackState(null);
        }
        setIsCamOn(false);
        isCamOnRef.current = false;
      }
    }

    if (isMutedScreen !== forceMutedScreen) {
      setForceMutedScreen(isMutedScreen);
      if (isMutedScreen && isSharingScreen) {
        try {
          localScreenTrackRef.current?.close();
          localScreenTrackRef.current = null;
          localScreenClientRef.current?.leave();
          localScreenClientRef.current = null;
        } catch (_) {}
        setIsSharingScreen(false);
      }
    }
  }, [
    roomState,
    sessionId,
    isHost,
    forceMutedAudio,
    forceMutedVideo,
    forceMutedScreen,
    isSharingScreen,
  ]);

  const isTerminalOpen = roomState?.terminalActive ?? false;
  const isBrowserOpen = roomState?.browserActive ?? false;
  const browserUrl = roomState?.browserUrl ?? '';


  // Auto-close panel when all requests are handled
  useEffect(() => {
    if (pendingJoinRequests.length === 0) {
      setJoinRequestsPanelOpen(false);
    }
  }, [pendingJoinRequests.length]);

  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Reset unread message count when right sidebar is open and chat tab is active
  useEffect(() => {
    if (rightSidebarOpen && activeRightTab === 'chat') {
      setUnreadChatCount(0);
    }
  }, [rightSidebarOpen, activeRightTab]);

  // Track new chat messages to update unread count when sidebar is closed or chat tab is inactive
  const prevChatCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current) {
      if (!rightSidebarOpen || activeRightTab !== 'chat') {
        const diff = chatMessages.length - prevChatCountRef.current;
        setUnreadChatCount(prev => prev + diff);
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages.length, rightSidebarOpen, activeRightTab]);

  // Gemini state
  const geminiMessages = useLiveData(geminiService.messages$);
  const geminiLoading = useLiveData(geminiService.loading$);
  const geminiError = useLiveData(geminiService.error$);
  const [isCanvasScanning, setIsCanvasScanning] = useState(false);
  const wasGeminiLoading = useRef(false);

  useEffect(() => {
    if (geminiLoading) {
      wasGeminiLoading.current = true;
    } else if (wasGeminiLoading.current) {
      setIsCanvasScanning(false);
      wasGeminiLoading.current = false;
    }
  }, [geminiLoading]);

  // Hook 1: Load room metadata and manage WebSocket connection immediately on mount
  useEffect(() => {
    let active = true;
    const fetchRoomAndConnect = async () => {
      try {
        const roomData = await presentationService.getRoom(activeRoomId);
        if (!active) return;
        setRoom(roomData);

        // Connect WebSockets for host immediately, but delay for guest until staging is submitted
        if (!isSharedMode || hasSubmittedStaging) {
          wsService.connect(activeRoomId, sessionId, {
            hostToken: isSharedMode ? undefined : 'host-token',
            guestName: isSharedMode
              ? stagingName || account?.label || 'Attendee'
              : account?.label || 'Host',
            avatar: account?.avatar || undefined,
            isWorkspaceUser: isSharedMode
              ? !!account && !account.email?.endsWith('@guest.presentation')
              : true,
          });
        }
      } catch (e) {
        console.error('Failed to connect to presentation room WebSocket:', e);
      }
    };

    fetchRoomAndConnect();

    return () => {
      active = false;
      wsService.disconnect();
    };
  }, [
    activeRoomId,
    isSharedMode,
    sessionId,
    hasSubmittedStaging,
    stagingName,
    account,
  ]);

  // Clear Gemini messages when the presentation page unmounts completely
  useEffect(() => {
    return () => {
      geminiService.clear();
    };
  }, [geminiService]);

  // Hook 2: Load workspace and document once approved / host is connected
  useEffect(() => {
    if (!room || !connected) return;

    // Guests must wait for approval and account to be loaded to avoid accessing private cloud workspace prematurely (fixes deadlock & database locks)
    if (isSharedMode && (joinPending || joinRejected || !account)) {
      return;
    }

    let resolvedWorkspace = activeWorkspace;
    let workspaceRef: any = null;
    let active = true;

    const loadWorkspaceAndDoc = async () => {
      try {
        if (isSharedMode) {
          workspaceRef = workspacesService.open({
            metadata: {
              id: workspaceId,
              flavour: 'affine-cloud',
            },
          });
          const opened = workspaceRef.workspace;
          if (!active) {
            workspaceRef.dispose();
            return;
          }
          setActiveWorkspace(opened);
          resolvedWorkspace = opened;
        }

        if (!resolvedWorkspace) return;

        const tempDocId = `temp-${room.id}`;
        const docsService = resolvedWorkspace.scope.get(DocsService);

        // Guests do not need to wait for the host's entire main workspace doc to load (fixes slow entry deadlock)
        if (!isSharedMode) {
          await resolvedWorkspace.engine.doc.waitForDocLoaded(
            resolvedWorkspace.id
          );
        }
        if (!active) return;

        let tempDoc;
        try {
          const exists = docsService.list.doc$(tempDocId).value;
          if (isSharedMode) {
            // GUEST PATH: Wait for the temp doc to sync from the cloud
            if (!exists) {
              setWaitingForHost(true);

              // Poll up to 10 minutes — host may be slow to join or sync
              let waited = 0;
              const MAX_WAIT_MS = 10 * 60 * 1000;
              const POLL_INTERVAL_MS = 500;
              await new Promise<void>((resolve, reject) => {
                const poll = () => {
                  if (!active) {
                    reject(new Error('Effect unmounted'));
                    return;
                  }
                  const doc = docsService.list.doc$(tempDocId).value;
                  if (doc) {
                    setWaitingForHost(false);
                    resolve();
                    return;
                  }
                  waited += POLL_INTERVAL_MS;
                  if (waited >= MAX_WAIT_MS) {
                    setWaitingForHost(false);
                    setHostJoinTimedOut(true);
                    reject(
                      new Error(
                        'Host did not start the presentation within the time limit'
                      )
                    );
                    return;
                  }
                  setTimeout(poll, POLL_INTERVAL_MS);
                };
                setTimeout(poll, POLL_INTERVAL_MS);
              });
            }
            if (!active) return;
            const opened = docsService.open(tempDocId);
            tempDoc = opened.doc;
          } else {
            // HOST PATH: Create or open the temp doc and duplicate original content
            if (!exists) {
              docsService.createDoc({ id: tempDocId, primaryMode: 'edgeless' });
              await docsService.duplicate(room.docId, tempDocId);
            }
            if (!active) return;
            const opened = docsService.open(tempDocId);
            tempDoc = opened.doc;
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          if (errMsg.includes('Effect unmounted')) {
            return;
          }
          console.error('Failed to set up temp presentation doc', e);
          if (!active) return;
          const opened = docsService.open(room.docId);
          tempDoc = opened.doc;
        }

        if (!active) return;
        if (tempDoc && tempDoc.id === tempDocId) {
          tempDoc.setProperty('edgelessColorTheme', 'system');
        }
        tempDoc.blockSuiteDoc.load();
        await resolvedWorkspace.engine.doc.waitForDocLoaded(tempDocId);

        // Wait for root block
        await new Promise<void>(resolve => {
          const check = () => {
            if (!active) return;
            const root = tempDoc.blockSuiteDoc.root;
            if (root) {
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          check();
        });

        if (!active) return;
        setPage(tempDoc);

        const editorInstance = tempDoc.scope.get(EditorsService).createEditor();
        editorInstance.setMode('edgeless');
        setEditor(editorInstance);
      } catch (e) {
        console.error('Failed to load presentation workspace and doc', e);
      }
    };

    loadWorkspaceAndDoc();

    return () => {
      active = false;
      if (workspaceRef) {
        workspaceRef.dispose();
      }
    };
  }, [
    room,
    connected,
    joinPending,
    joinRejected,
    isSharedMode,
    workspaceId,
    activeWorkspace,
    account,
  ]);

  // Determine if content should be locked/view-only for this user
  const lockContentFor = (room?.permissions as any)?.lockContentFor;
  const activeLocks = Array.isArray(lockContentFor)
    ? lockContentFor
    : lockContentFor === 'guests'
      ? ['guests']
      : lockContentFor === 'me'
        ? ['me']
        : [];
  const shouldLock = activeLocks.includes(isSharedMode ? 'guests' : 'me');

  // Sync the document's readonly status reactively with the active lock permissions
  useEffect(() => {
    if (!page) return;

    const originalDescInstance = Object.getOwnPropertyDescriptor(
      page.blockSuiteDoc,
      'readonly'
    );
    const proto = Object.getPrototypeOf(page.blockSuiteDoc);
    const originalDescProto = Object.getOwnPropertyDescriptor(
      proto,
      'readonly'
    );

    const safeDefine = (obj: any) => {
      try {
        Object.defineProperty(obj, 'readonly', {
          get() {
            return shouldLock;
          },
          set() {
            // Ignore external writes
          },
          configurable: true,
        });
      } catch (e) {
        // Fallback standard assignment
        try {
          obj.readonly = shouldLock;
        } catch (_) {}
      }
    };

    safeDefine(page.blockSuiteDoc);
    safeDefine(proto);

    return () => {
      // Restore prototype descriptor
      if (originalDescProto) {
        try {
          Object.defineProperty(proto, 'readonly', originalDescProto);
        } catch (_) {}
      } else {
        try {
          delete (proto as any).readonly;
        } catch (_) {}
      }

      // Restore instance descriptor
      if (originalDescInstance) {
        try {
          Object.defineProperty(
            page.blockSuiteDoc,
            'readonly',
            originalDescInstance
          );
        } catch (_) {}
      } else {
        try {
          delete (page.blockSuiteDoc as any).readonly;
        } catch (_) {}
      }
    };
  }, [page, shouldLock]);

  // Handle redirect if room ended
  useEffect(() => {
    if (roomEnded) {
      setRoomEndedModalOpen(true);
    }
  }, [roomEnded]);

  const handleEndRoomConfirm = async () => {
    setConfirmEndOpen(false);
    if (!room) return;
    if (activeWorkspace) {
      const tempDocId = `temp-${room.id}`;
      try {
        activeWorkspace.docCollection.removeDoc(tempDocId);
      } catch (err) {
        console.error('Failed to remove temp doc on end', err);
      }
    }
    try {
      await presentationService.endRoom(room.id);
      // Clear the guest room lock (in case host is also a guest session somehow)
      sessionStorage.removeItem('presentation_room_path');
      navigate(`/workspace/${workspaceId}/all`);
    } catch (e) {
      console.error('Failed to end presentation room', e);
    }
  };
  const handleLeaveRoomConfirm = () => {
    setConfirmExitOpen(false);
    wsService.disconnect();
    // Clear the guest room lock so they aren't redirected back to an ended session
    sessionStorage.removeItem('presentation_room_path');
    if (room?.id) {
      sessionStorage.removeItem(`presentation_staging_submitted_${room.id}`);
    }
    // Sign out the guest session cookie to prevent stale /api/auth/session 500 errors
    if (account?.email?.endsWith('@guest.presentation')) {
      authService.signOut().catch(() => {});
      navigate(`/join/${room?.inviteToken || ''}`);
    } else {
      navigate('/');
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !room) return;
    wsService.sendChatMessage(
      room.id,
      sessionId,
      chatInput.trim(),
      replyingTo?.sessionId
    );
    setChatInput('');
    setReplyingTo(null);
  };


  const handleSendGemini = (customPrompt?: string, displayLabel?: string, screenshotImage?: string) => {
    const textToSend = typeof customPrompt === 'string' ? customPrompt : geminiInput;
    if (!textToSend.trim() || !room) return;
    setIsCanvasScanning(true);
    geminiService.sendMessage(room.id, sessionId, textToSend.trim(), displayLabel, screenshotImage);
    if (typeof customPrompt !== 'string') {
      setGeminiInput('');
    }
  };

  const toggleTerminal = () => {
    if (!room) return;
    const nextState = !isTerminalOpen;
    wsService.sendTerminalToggle(room.id, sessionId, nextState);
  };

  const toggleBrowser = () => {
    if (!room) return;
    const nextState = !isBrowserOpen;
    wsService.sendBrowserToggle(room.id, sessionId, nextState);
  };

  // Load Xterm.js assets from jsdelivr CDN dynamically and prevent duplicate/CORS issues
  const [xtermLoaded, setXtermLoaded] = useState(false);
  useEffect(() => {
    if ((window as any).Terminal) {
      setXtermLoaded(true);
      return;
    }

    const cssUrl = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css';
    const jsUrl = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js';

    // Guard Link Stylesheet Duplication
    if (!document.querySelector(`link[href="${cssUrl}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      document.head.appendChild(link);
    }

    // Guard Script Tag Duplication
    const existingScript = document.querySelector(`script[src="${jsUrl}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => setXtermLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = jsUrl;
    script.async = true;
    script.crossOrigin = 'anonymous'; // Prevents CORS generic "Script error." on reload
    script.onload = () => {
      setXtermLoaded(true);
    };
    script.onerror = err => {
      console.error('Failed to load Xterm.js script', err);
    };
    document.body.appendChild(script);
  }, []);

  // ── Agora RTC SDK & Extensions — CDN loader ────────────────────────
  useEffect(() => {
    const loadExtensions = () => {
      let vbLoaded = !!(window as any).VirtualBackgroundExtension;
      let denoiserLoaded = !!((window as any).AIDenoiser || (window as any).AgoraExtensionAiDenoiser);

      const checkBothLoaded = () => {
        if (vbLoaded && denoiserLoaded) {
          setAgoraLoaded(true);
        }
      };

      if (vbLoaded && denoiserLoaded) {
        setAgoraLoaded(true);
        return;
      }

      if (!vbLoaded) {
        const s = document.createElement('script');
        s.src =
          'https://cdn.jsdelivr.net/npm/agora-extension-virtual-background@2.1.0/agora-extension-virtual-background.min.js';
        s.async = true;
        s.onload = () => {
          vbLoaded = true;
          checkBothLoaded();
        };
        s.onerror = e => {
          console.warn(
            '[Agora] Failed to load VB extension from primary CDN, trying unpkg...',
            e
          );
          const s2 = document.createElement('script');
          s2.src =
            'https://unpkg.com/agora-extension-virtual-background@2.1.0/agora-extension-virtual-background.min.js';
          s2.async = true;
          s2.onload = () => {
            vbLoaded = true;
            checkBothLoaded();
          };
          s2.onerror = () => {
            console.error('[Agora] All Virtual Background CDNs failed to load.');
            vbLoaded = true;
            checkBothLoaded();
          };
          document.body.appendChild(s2);
        };
        document.body.appendChild(s);
      } else {
        checkBothLoaded();
      }

      if (!denoiserLoaded) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/agora-extension-ai-denoiser@2.0.2/index.js';
        s.async = true;
        s.onload = () => {
          denoiserLoaded = true;
          checkBothLoaded();
        };
        s.onerror = e => {
          console.warn(
            '[Agora] Failed to load AI Denoiser extension from primary CDN, trying unpkg...',
            e
          );
          const s2 = document.createElement('script');
          s2.src = 'https://unpkg.com/agora-extension-ai-denoiser@2.0.2/index.js';
          s2.async = true;
          s2.onload = () => {
            denoiserLoaded = true;
            checkBothLoaded();
          };
          s2.onerror = () => {
            console.error('[Agora] All AI Denoiser CDNs failed to load.');
            denoiserLoaded = true;
            checkBothLoaded();
          };
          document.body.appendChild(s2);
        };
        document.body.appendChild(s);
      } else {
        checkBothLoaded();
      }
    };

    if ((window as any).AgoraRTC) {
      loadExtensions();
      return;
    }

    const jsUrls = [
      'https://cdn.jsdelivr.net/npm/agora-rtc-sdk-ng@4.21.0/AgoraRTC_N-production.js',
      'https://unpkg.com/agora-rtc-sdk-ng@4.21.0/AgoraRTC_N-production.js',
      'https://download.agora.io/sdk/release/AgoraRTC_N-4.21.0.js',
    ];

    const existing = document.querySelector(`script[data-agora-sdk]`);
    if (existing) {
      if ((window as any).AgoraRTC) {
        loadExtensions();
        return;
      }
      existing.addEventListener('load', () => loadExtensions());
      return;
    }

    let urlIndex = 0;

    const loadScript = () => {
      if (urlIndex >= jsUrls.length) {
        console.error(
          '[Agora] All SDK CDN endpoints failed to load. Agora RTC is unavailable.'
        );
        return;
      }

      const jsUrl = jsUrls[urlIndex];
      const s = document.createElement('script');
      s.src = jsUrl;
      s.async = true;
      s.setAttribute('data-agora-sdk', '1');
      s.onload = () => {
        loadExtensions();
      };
      s.onerror = e => {
        console.warn(
          `[Agora] Failed to load SDK from ${jsUrl}, trying fallback CDN...`,
          e
        );
        s.remove();
        urlIndex++;
        loadScript();
      };
      document.body.appendChild(s);
    };

    loadScript();
  }, []);

  const termRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<any>(null);

  // Synchronize terminal instance, websocket IO, and history replay
  useEffect(() => {
    if (!isTerminalOpen || !xtermLoaded || !termRef.current || !room) return;

    const Terminal = (window as any).Terminal;
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      cursorWidth: 3,
      fontFamily: 'var(--affine-font-mono-family), monospace',
      fontSize: 13,
      theme: {
        background: '#090c10',
        foreground: '#00ff66',
        cursor: '#00ff66',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(0, 255, 102, 0.3)',
        black: '#000000',
        red: '#ff5555',
        green: '#00ff66',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e6e',
        brightGreen: '#39ff14',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92d0',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
      disableStdin: !isHost, // Interactive for host, strictly read-only for guest attendees
      rows: 20,
      cols: 68,
    });

    term.open(termRef.current);
    termInstanceRef.current = term;

    // Focus the terminal immediately for the host
    if (isHost) {
      term.focus();
      setIsTerminalFocused(true);
    }

    const handleFocus = () => setIsTerminalFocused(true);
    const handleBlur = () => setIsTerminalFocused(false);

    if (term.textarea) {
      term.textarea.addEventListener('focus', handleFocus);
      term.textarea.addEventListener('blur', handleBlur);
    }

    // Replay history
    if (terminalHistory && terminalHistory.length > 0) {
      terminalHistory.forEach((chunk: string) => {
        term.write(chunk);
      });
    }

    // Host key/input transmission
    let dataSub: any = null;
    if (isHost) {
      dataSub = term.onData((data: string) => {
        wsService.sendTerminalInput(room!.id, sessionId, data);
      });
    }

    // Synchronous stream subscription for real-time stdout updates
    const sub = wsService.terminalOutput$.subscribe(chunk => {
      if (chunk && termInstanceRef.current) {
        termInstanceRef.current.write(chunk);
      }
    });

    return () => {
      sub.unsubscribe();
      if (term.textarea) {
        term.textarea.removeEventListener('focus', handleFocus);
        term.textarea.removeEventListener('blur', handleBlur);
      }
      if (dataSub) dataSub.dispose();
      // Delay disposal slightly to allow pending animation frames (like viewport refresh) to complete cleanly
      setTimeout(() => {
        try {
          term.dispose();
        } catch (err) {
          console.warn('[Xterm] Error disposing terminal:', err);
        }
      }, 50);
      termInstanceRef.current = null;
    };
  }, [
    isTerminalOpen,
    xtermLoaded,
    isHost,
    room?.id,
    sessionId,
    terminalHistory,
    isDark,
  ]);

  // ── Agora RTC lifecycle ───────────────────────────────────────────
  useEffect(() => {
    if (!agoraLoaded || !room || !connected || roomEnded || isCurrentlyKicked) return;

    // GUEST: Wait until approved to join Agora RTC channel (prevents pre-approval presence showing in host video grid)
    if (isSharedMode && (joinPending || joinRejected || !hasSubmittedStaging)) {
      return;
    }
    const AgoraRTC = (window as any).AgoraRTC;
    if (!AgoraRTC) return;
    try {
      AgoraRTC.setLogLevel(4);
    } catch (_) {}

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    agoraClientRef.current = client;
    let localAudio: any = null;
    let localVideo: any = null;
    let active = true;

    const handleUserPublished = async (user: any, mediaType: string) => {
      try {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
          try {
            client.setStreamFallbackOption(user.uid, 2);
          } catch (_) {}
        }
      } catch (subErr) {
        console.warn('[Agora] Subscribe track failed:', subErr);
        return;
      }
      if (!active) return;
      const normalizedUid = Number(user.uid);
      if (pendingDisconnectsRef.current.has(normalizedUid)) {
        clearTimeout(pendingDisconnectsRef.current.get(normalizedUid));
        pendingDisconnectsRef.current.delete(normalizedUid);
      }
      setRemoteUsers(prev => {
        const exists = prev.find((u: any) => Number(u.uid) === normalizedUid);
        const newUserObj = {
          ...(exists || {}),
          uid: normalizedUid,
          videoTrack: user.videoTrack || (exists?.videoTrack ?? null),
          audioTrack: user.audioTrack || (exists?.audioTrack ?? null),
          hasVideo: user.hasVideo,
          hasAudio: user.hasAudio,
          isDisconnected: false,
        };
        return exists
          ? prev.map((u: any) => (Number(u.uid) === normalizedUid ? newUserObj : u))
          : [...prev, newUserObj];
      });
      if (mediaType === 'audio') user.audioTrack?.play();
    };
    // Item 1: Add tile as soon as a remote user joins, even before they publish media
    const handleUserJoined = (user: any) => {
      if (!active) return;
      const normalizedUid = Number(user.uid);
      if (pendingDisconnectsRef.current.has(normalizedUid)) {
        clearTimeout(pendingDisconnectsRef.current.get(normalizedUid));
        pendingDisconnectsRef.current.delete(normalizedUid);
      }
      setRemoteUsers(prev => {
        const exists = prev.find((u: any) => Number(u.uid) === normalizedUid);
        const newUserObj = {
          ...(exists || {}),
          uid: normalizedUid,
          videoTrack: user.videoTrack || (exists?.videoTrack ?? null),
          audioTrack: user.audioTrack || (exists?.audioTrack ?? null),
          hasVideo: user.hasVideo,
          hasAudio: user.hasAudio,
          isDisconnected: false,
        };
        if (exists) {
          return prev.map((u: any) =>
            Number(u.uid) === normalizedUid ? newUserObj : u
          );
        }
        return [...prev, newUserObj];
      });
    };
    const handleUserUnpublished = (user: any, mediaType: string) => {
      if (!active) return;
      const normalizedUid = Number(user.uid);
      if (mediaType === 'video' && normalizedUid >= 100000) {
        setActiveMainScreenShareUid(prev => (prev === normalizedUid ? null : prev));
      }
      setRemoteUsers(prev =>
        prev.map((u: any) => {
          if (Number(u.uid) === normalizedUid) {
            return {
              ...u,
              videoTrack: mediaType === 'video' ? null : u.videoTrack,
              audioTrack: mediaType === 'audio' ? null : u.audioTrack,
            };
          }
          return u;
        })
      );
    };
    const handleUserLeft = (user: any, reason?: string) => {
      if (!active) return;
      const normalizedUid = Number(user.uid);
      
      if (pendingDisconnectsRef.current.has(normalizedUid)) {
        clearTimeout(pendingDisconnectsRef.current.get(normalizedUid));
        pendingDisconnectsRef.current.delete(normalizedUid);
      }

      // Mark user as disconnected and show badge for 5s before removing
      setRemoteUsers(prev =>
        prev.map((u: any) =>
          Number(u.uid) === normalizedUid
            ? { ...u, isDisconnected: true, disconnectedAt: Date.now(), disconnectReason: reason || 'Network Issue' }
            : u
        )
      );

      const timer = setTimeout(() => {
        setRemoteUsers(prev => prev.filter((u: any) => Number(u.uid) !== normalizedUid));
        pendingDisconnectsRef.current.delete(normalizedUid);
      }, 5000);

      pendingDisconnectsRef.current.set(normalizedUid, timer);

      setSpeakingUids(prev => {
        const n = new Set(prev);
        n.delete(normalizedUid);
        return n;
      });
      setLoudSpeakingUids(prev => {
        const n = new Set(prev);
        n.delete(normalizedUid);
        return n;
      });
    };
    const handleVolumeIndicator = (
      vols: Array<{ uid: number; level: number }>
    ) => {
      if (!active) return;
      // Normal speaking threshold set to 50, loud speaking set to 70 based on user testing
      setSpeakingUids(
        new Set(vols.filter(v => v.level > 50).map(v => Number(v.uid)))
      );
      setLoudSpeakingUids(
        new Set(vols.filter(v => v.level > 70).map(v => Number(v.uid)))
      );
    };

    client.on('user-published', handleUserPublished);
    client.on('user-joined', handleUserJoined);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);
    client.on('volume-indicator', handleVolumeIndicator);

    const joinAndPublish = async () => {
      try {
        const uid = Math.floor(Math.random() * 99999) + 1;
        let tokenToUse: string | null = null;
        let appIdToUse = AGORA_APP_ID;

        try {
          const res = await fetch(
            `/api/presentation/agora-rtc-token?channelName=${encodeURIComponent(room.id)}&uid=${uid}`
          );
          if (res.ok) {
            const tokenData = await res.json();
            if (tokenData.appId) {
              appIdToUse = tokenData.appId;
            }
            tokenToUse = tokenData.token || null;
          }
        } catch (tokenErr) {
          console.warn('[Agora] Fetch RTC token warning:', tokenErr);
        }

        // Validate App ID format (1-2047 ASCII characters, no placeholders like YOUR_AGORA_APP_ID)
        const cleanAppId = (appIdToUse || '').replace(/['"\s]/g, '').trim();
        const isValidAppId =
          cleanAppId.length > 0 &&
          cleanAppId !== 'YOUR_AGORA_APP_ID' &&
          !cleanAppId.includes('YOUR_AGORA') &&
          /^[a-zA-Z0-9]{1,2047}$/.test(cleanAppId);

        if (!isValidAppId) {
          console.warn('[Agora] Invalid or unconfigured Agora App ID:', appIdToUse);
          setAgoraError(
            'Agora App ID is not configured or invalid. Please configure your Agora App ID in Admin Settings > Video & Meeting Settings.'
          );
          return;
        }

        activeAgoraAppIdRef.current = cleanAppId;

        setAgoraError(null);
        const joinedUid = await client.join(
          cleanAppId,
          room.id,
          tokenToUse,
          uid
        );
        if (!active) return;
        setLocalUid(joinedUid);
        // Req A: announce UID→sessionId mapping to all room members
        if (room?.id) wsService.announceAgoraUid(room.id, sessionId, joinedUid);
        // Request volume indicator events every 200ms instead of the default 2000ms for high responsiveness
        client.enableAudioVolumeIndicator(200);

        // Enable dual stream mode on sender and adaptive fallback on receiver (Requirement 2)
        try {
          if (client.enableDualStream) {
            await client.enableDualStream();
          } else if (client.setDualStreamMode) {
            await client.setDualStreamMode('AUTO_SIMULCAST_MODE');
          }
        } catch (dualErr) {
          console.warn(
            '[Agora] Failed to set dual stream or fallback:',
            dualErr
          );
        }

        // Respect permissions & user preference: only join audio/video if allowed AND user enabled them
        const canAudio =
          (isHost || mediaPerms.allowGuestAudio) && isMicOnRef.current;
        const canVideo =
          (isHost || mediaPerms.allowGuestVideo) && isCamOnRef.current;

        if (canAudio) {
          try {
            localAudio = await AgoraRTC.createMicrophoneAudioTrack({
              microphoneId: selectedAudioInput || undefined,
              encoderConfig: audioProfile,
              AEC: isEchoCancellationOn,
              AGC: isAutomaticGainControlOn,
              ANS: isAiNoiseSuppressionOn ? false : isNoiseSuppressionOn,
            });
          } catch (permErr: any) {
            console.warn(
              '[Agora] Failed to create local microphone track:',
              permErr
            );
            setIsMicOn(false);
          }
        }
        if (canVideo) {
          try {
            localVideo = await AgoraRTC.createCameraVideoTrack({
              cameraId: selectedVideoInput || undefined,
              encoderConfig: '240p_1',
              optimizationMode: 'balanced', // Requirement 2
            });
            await applyVirtualBackground(
              localVideo,
              activeVirtualBg,
              customBgImage
            );
          } catch (permErr: any) {
            console.warn(
              '[Agora] Failed to create local camera track:',
              permErr
            );
            setIsCamOn(false);
          }
        }

        if (!active) {
          localAudio?.close();
          localVideo?.close();
          return;
        }
        localAudioTrackRef.current = localAudio;
        localVideoTrackRef.current = localVideo;
        setLocalVideoTrackState(localVideo);
        setLocalAudioTrackState(localAudio);
        if (localVideo) {
          await safePublishVideo(client, localVideo);
        }
        if (localAudio) {
          try {
            await client.publish(localAudio);
          } catch (_) {}
        }
        // Only enumerate devices if we actually requested media to avoid
        // triggering a browser permission prompt when mic/cam are turned off.
        if (localAudio || localVideo) {
          const devices: MediaDeviceInfo[] = await AgoraRTC.getDevices();
          setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
          setVideoInputs(devices.filter(d => d.kind === 'videoinput'));
          setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
        }
      } catch (e: any) {
        if (!active) return;
        const errMsg = e?.message || String(e);
        if (errMsg.includes('OPERATION_ABORTED') || errMsg.includes('cancel token')) {
          return;
        }
        console.error('[Agora] Join/publish error:', e);
        if (
          errMsg.includes('INVALID_PARAMS') ||
          errMsg.includes('Invalid appid') ||
          errMsg.includes('ASCII characters')
        ) {
          setAgoraError(
            'Invalid Agora App ID string. Please configure a valid Agora App ID in Admin Settings > Video & Meeting Settings.'
          );
          return;
        } else if (
          errMsg.includes('PERMISSION_DENIED') ||
          errMsg.includes('Permission denied') ||
          errMsg.includes('NotAllowedError') ||
          errMsg.includes('permission')
        ) {
          setIsMicOn(false);
          setIsCamOn(false);
        } else if (
          errMsg.includes('dynamic use static key') ||
          errMsg.includes('CAN_NOT_GET_GATEWAY_SERVER')
        ) {
          setAgoraError(
            `The active Agora App ID ("${AGORA_APP_ID}") requires token security, but a tokenless join was requested. ` +
              'Please create an Agora project in "Testing Mode: App ID" (with App Certificate disabled) ' +
              'and configure VITE_AGORA_APP_ID in your local .env file.'
          );
        } else {
          setAgoraError(`WebRTC Error: ${errMsg}`);
        }
      }
    };
    joinAndPublish();

    return () => {
      active = false;
      pendingDisconnectsRef.current.forEach(timer => clearTimeout(timer));
      pendingDisconnectsRef.current.clear();
      client.off('user-published', handleUserPublished);
      client.off('user-joined', handleUserJoined);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
      client.off('volume-indicator', handleVolumeIndicator);
      try {
        localAudioTrackRef.current?.close();
      } catch (_) {}
      try {
        localVideoTrackRef.current?.close();
      } catch (_) {}
      try {
        localScreenTrackRef.current?.close();
      } catch (_) {}
      localAudioTrackRef.current = null;
      localVideoTrackRef.current = null;
      localScreenTrackRef.current = null;
      setLocalVideoTrackState(null);
      setLocalAudioTrackState(null);
      client.leave().catch(() => {});
      if (localScreenClientRef.current) {
        localScreenClientRef.current.leave().catch(() => {});
        localScreenClientRef.current = null;
      }
      setIsSharingScreen(false);
      agoraClientRef.current = null;
      setRemoteUsers([]);
      setLocalUid(null);
      setSpeakingUids(new Set());
      setLoudSpeakingUids(new Set());
    };
  }, [
    agoraLoaded,
    room?.id,
    connected,
    isSharedMode,
    joinPending,
    joinRejected,
    roomEnded,
    isCurrentlyKicked,
    hasSubmittedStaging,
  ]);

  // General tab close / page unload browser listener to completely prevent Agora phantom minutes billing leaks
  useEffect(() => {
    const handleAbruptDisconnect = () => {
      wsService.disconnect();
      try {
        localAudioTrackRef.current?.close();
      } catch (_) {}
      try {
        localVideoTrackRef.current?.close();
      } catch (_) {}
      try {
        localScreenTrackRef.current?.close();
      } catch (_) {}
      
      const client = agoraClientRef.current;
      if (client) {
        client.leave().catch(() => {});
      }
      const sClient = localScreenClientRef.current;
      if (sClient) {
        sClient.leave().catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleAbruptDisconnect);
    window.addEventListener('pagehide', handleAbruptDisconnect);
    return () => {
      window.removeEventListener('beforeunload', handleAbruptDisconnect);
      window.removeEventListener('pagehide', handleAbruptDisconnect);
    };
  }, [wsService]);

  // Req D: Self-view — direct raw track, no Agora latency
  useEffect(() => {
    if (!selfViewVideoRef.current || !localVideoTrackState || !isCamOn) return;
    try {
      const track = localVideoTrackState.getMediaStreamTrack();
      if (track) {
        const currentStream = selfViewVideoRef.current.srcObject as MediaStream;
        const currentTrack = currentStream?.getVideoTracks()?.[0];
        if (currentTrack !== track) {
          selfViewVideoRef.current.srcObject = new MediaStream([track]);
        }
      }
    } catch (_) {}
  }, [localVideoTrackState, isCamOn]);

  useEffect(() => {
    const track = localVideoTrackRef.current || localVideoTrackState;
    if (track && isCamOn) {
      applyVirtualBackground(
        track,
        activeVirtualBg,
        customBgImage
      ).then(() => {
        if (selfViewVideoRef.current) {
          try {
            const msTrack = track.getMediaStreamTrack();
            if (msTrack) {
              const currentStream = selfViewVideoRef.current.srcObject as MediaStream;
              const currentTrack = currentStream?.getVideoTracks()?.[0];
              if (currentTrack !== msTrack) {
                selfViewVideoRef.current.srcObject = new MediaStream([msTrack]);
              }
            }
          } catch (_) {}
        }
      }).catch(console.error);
    }
  }, [localVideoTrackState, activeVirtualBg, customBgImage, isCamOn]);

  // Apply AI Noise Suppression dynamically
  useEffect(() => {
    if (localAudioTrackState && isAiNoiseSuppressionOn) {
      applyAiDenoiser(
        localAudioTrackState,
        isAiNoiseSuppressionActive
      ).catch(err => {
        console.error('[Agora AI Denoiser] Failed to apply denoiser:', err);
      });
    }
  }, [localAudioTrackState, isAiNoiseSuppressionOn, isAiNoiseSuppressionActive]);

  // Recreate microphone track if active and settings (AEC, AGC, native ANS) change
  useEffect(() => {
    let active = true;
    const updateTrack = async () => {
      if (localAudioTrackRef.current && agoraClientRef.current) {
        const prevTrack = localAudioTrackRef.current;
        const AgoraRTC = (window as any).AgoraRTC;
        if (!AgoraRTC) return;

        try {
          // 1. Unpublish old track first
          try {
            await agoraClientRef.current.unpublish(prevTrack);
          } catch (err) {
            console.warn('[Agora] Failed to unpublish old audio track:', err);
          }

          // 2. Close old track to release microphone device constraints
          try {
            prevTrack.close();
          } catch (_) {}

          // Wait a short moment to let the browser/OS fully release the hardware
          await new Promise(resolve => setTimeout(resolve, 250));
          if (!active) return;

          // 3. Create new track with updated constraints
          const newAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            microphoneId: selectedAudioInput || undefined,
            encoderConfig: audioProfile,
            AEC: isEchoCancellationOn,
            AGC: isAutomaticGainControlOn,
            ANS: isAiNoiseSuppressionOn ? false : isNoiseSuppressionOn,
          });

          if (!active) {
            newAudioTrack.close();
            return;
          }

          // 4. Update track states and publish
          localAudioTrackRef.current = newAudioTrack;
          setLocalAudioTrackState(newAudioTrack);

          if (isAiNoiseSuppressionOn) {
            const { applyAiDenoiser } = await import('./present-utils');
            await applyAiDenoiser(newAudioTrack, isAiNoiseSuppressionActive);
          }

          await agoraClientRef.current.publish(newAudioTrack);
        } catch (err) {
          console.error('[Agora] Failed to recreate audio track:', err);
        }
      }
    };

    updateTrack();
    return () => {
      active = false;
    };
  }, [
    isEchoCancellationOn,
    isAutomaticGainControlOn,
    isNoiseSuppressionOn,
    isAiNoiseSuppressionOn,
    selectedAudioInput,
  ]);



  // ── Agora helper functions ────────────────────────────────────────
  const refreshDevices = useCallback(async () => {
    const AgoraRTC = (window as any).AgoraRTC;
    if (!AgoraRTC) return;
    try {
      const devices = await AgoraRTC.getDevices();
      setAudioInputs(devices.filter((d: any) => d.kind === 'audioinput'));
      setVideoInputs(devices.filter((d: any) => d.kind === 'videoinput'));
      setAudioOutputs(devices.filter((d: any) => d.kind === 'audiooutput'));
    } catch (e) {
      console.warn('[Agora] Failed to refresh devices:', e);
    }
  }, []);

  const toggleMic = async () => {
    if (forceMutedAudio) return; // host has force-muted audio
    const targetState = !isMicOn;

    if (targetState) {
      // Turning ON Microphone
      try {
        const AgoraRTC = (window as any).AgoraRTC;
        if (!AgoraRTC || !agoraClientRef.current) return;

        let track = localAudioTrackRef.current;
        if (!track) {
          track = await AgoraRTC.createMicrophoneAudioTrack({
            microphoneId: selectedAudioInput || undefined,
            encoderConfig: audioProfile,
            AEC: isEchoCancellationOn,
            AGC: isAutomaticGainControlOn,
            ANS: isAiNoiseSuppressionOn ? false : isNoiseSuppressionOn,
          });
          localAudioTrackRef.current = track;
          setLocalAudioTrackState(track);
        } else {
          try { await track.setEnabled(true); } catch (_) {}
        }

        try {
          await agoraClientRef.current.publish(track);
        } catch (pubErr) {
          console.warn('[Agora] Audio track already published or publish warning:', pubErr);
        }

        setIsMicOn(true);
        isMicOnRef.current = true;
        refreshDevices();
      } catch (e) {
        console.error('[Agora] ToggleMic turn-on failed:', e);
        setIsMicOn(false);
        isMicOnRef.current = false;
      }
    } else {
      // Turning OFF Microphone
      try {
        const track = localAudioTrackRef.current;
        if (track) {
          if (agoraClientRef.current) {
            try { await agoraClientRef.current.unpublish(track); } catch (_) {}
          }
          try {
            await track.setEnabled(false);
            track.close();
          } catch (_) {}
          localAudioTrackRef.current = null;
          setLocalAudioTrackState(null);
        }
      } catch (e) {
        console.error('[Agora] ToggleMic turn-off failed:', e);
      } finally {
        setIsMicOn(false);
        isMicOnRef.current = false;
      }
    }
  };

  const safePublishVideo = async (client: any, videoTrack: any) => {
    if (!client || !videoTrack) return;
    try {
      const publishedVideo =
        client.localTracks?.filter(
          (tr: any) =>
            tr &&
            (tr.trackMediaType === 'video' ||
              (typeof tr.getType === 'function' && tr.getType() === 'video'))
        ) || [];
      if (publishedVideo.length > 0) {
        await client.unpublish(publishedVideo);
      }
    } catch (e) {
      console.warn('[Agora] safePublishVideo unpublish warning:', e);
    }
    await client.publish(videoTrack);
  };

  const toggleCam = async () => {
    if (forceMutedVideo) return; // host has force-muted video
    const targetState = !isCamOn;

    if (targetState) {
      // Turning ON Camera
      try {
        const AgoraRTC = (window as any).AgoraRTC;
        if (!AgoraRTC || !agoraClientRef.current) return;

        let track = localVideoTrackRef.current;
        if (!track) {
          track = await AgoraRTC.createCameraVideoTrack({
            cameraId: selectedVideoInput || undefined,
            encoderConfig: '240p_1',
            optimizationMode: 'balanced',
          });
          await applyVirtualBackground(
            track,
            activeVirtualBg,
            customBgImage
          );
          localVideoTrackRef.current = track;
          setLocalVideoTrackState(track);
        } else {
          try { await track.setEnabled(true); } catch (_) {}
        }

        await safePublishVideo(agoraClientRef.current, track);

        setIsCamOn(true);
        isCamOnRef.current = true;

        if (selfViewVideoRef.current) {
          try {
            const msTrack = track.getMediaStreamTrack();
            if (msTrack) {
              selfViewVideoRef.current.srcObject = new MediaStream([msTrack]);
            }
          } catch (_) {}
        }

        refreshDevices();
      } catch (e) {
        console.error('[Agora] ToggleCam turn-on failed:', e);
        setIsCamOn(false);
        isCamOnRef.current = false;
      }
    } else {
      // Turning OFF Camera
      try {
        const track = localVideoTrackRef.current;
        if (track) {
          if (agoraClientRef.current) {
            try { await agoraClientRef.current.unpublish(track); } catch (_) {}
          }
          try {
            await track.setEnabled(false);
            track.close();
          } catch (_) {}
          localVideoTrackRef.current = null;
          setLocalVideoTrackState(null);
        }
      } catch (e) {
        console.error('[Agora] ToggleCam turn-off failed:', e);
      } finally {
        setIsCamOn(false);
        isCamOnRef.current = false;
      }
    }
  };

  const handleCameraSwitch = async (newDeviceId: string) => {
    setSelectedVideoInput(newDeviceId);
    try {
      localStorage.setItem('intoai_presentation_selected_cam', newDeviceId);
    } catch (_) {}

    const track = localVideoTrackRef.current;
    const client = agoraClientRef.current;
    const AgoraRTC = (window as any).AgoraRTC;

    if (track && isCamOn) {
      let success = false;
      if (activeVirtualBg === 'none' && !customBgImage) {
        try {
          await track.setDevice(newDeviceId);
          success = true;
        } catch (err) {
          console.warn('[Agora] track.setDevice failed on camera switch, recreating track:', err);
        }
      }

      if (!success) {
        try {
          if (client) {
            try {
              await client.unpublish(track);
            } catch (e) {
              console.warn('[Agora] Unpublish old video track on camera switch warning:', e);
            }
          }
          try {
            track.close();
          } catch (_) {}

          if (AgoraRTC) {
            const newVideoTrack = await AgoraRTC.createCameraVideoTrack({
              cameraId: newDeviceId,
              encoderConfig: '240p_1',
              optimizationMode: 'balanced',
            });

            await applyVirtualBackground(newVideoTrack, activeVirtualBg, customBgImage);

            localVideoTrackRef.current = newVideoTrack;
            setLocalVideoTrackState(newVideoTrack);

            if (client) {
              await safePublishVideo(client, newVideoTrack);
            }

            if (selfViewVideoRef.current) {
              try {
                const mst = newVideoTrack.getMediaStreamTrack?.();
                if (mst) {
                  selfViewVideoRef.current.srcObject = new MediaStream([mst]);
                } else {
                  newVideoTrack.play(selfViewVideoRef.current);
                }
              } catch (pErr) {
                console.warn('[Agora] Play self view video on camera switch warning:', pErr);
              }
            }
          }
        } catch (recreateErr) {
          console.error('[Agora] Camera track recreation failed on switch:', recreateErr);
        }
      }
    }
  };

  const handleDisabledMediaClick = (mediaType: string) => {
    const id = 'disabled-toast-' + Date.now();
    setSsNotifications(prev => [
      ...prev.filter(n => !n.id.startsWith('disabled-toast-')),
      {
        id,
        type: 'disabled_media',
        mediaType,
        message: `${mediaType} control is disabled by host`,
      },
    ]);
    setTimeout(() => {
      setSsNotifications(prev => prev.filter(n => n.id !== id));
    }, 3500);
  };

  const toggleScreenShare = async () => {
    const AgoraRTC = (window as any).AgoraRTC;
    if (!AgoraRTC || !room) return;
    if (isSharingScreen) {
      try {
        localScreenTrackRef.current?.close();
        localScreenTrackRef.current = null;
        await localScreenClientRef.current?.leave();
        localScreenClientRef.current = null;
      } catch (e) {
        console.error('[Agora] Stop screen share', e);
      }
      setIsSharingScreen(false);
      const localScreenUid = (localUid ?? 0) + 100000;
      setActiveMainScreenShareUid(prev => (prev === localScreenUid ? null : prev));
    } else {
      if (forceMutedScreen || !(isHost || mediaPerms.allowGuestScreenShare)) {
        return;
      }
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: '1080p_2' },
          'disable'
        );
        localScreenTrackRef.current = screenTrack;
        const sc = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        localScreenClientRef.current = sc;
        const appIdForScreen = activeAgoraAppIdRef.current || (AGORA_APP_ID || '').replace(/['"\s]/g, '').trim();
        if (!appIdForScreen || appIdForScreen === 'YOUR_AGORA_APP_ID' || !/^[a-zA-Z0-9]{1,2047}$/.test(appIdForScreen)) {
          console.warn('[Agora] Screen share aborted due to invalid App ID:', appIdForScreen);
          screenTrack.close();
          localScreenTrackRef.current = null;
          localScreenClientRef.current = null;
          return;
        }
        const screenUid = (localUid ?? 0) + 100000;
        let screenToken: string | null = null;
        try {
          const res = await fetch(
            `/api/presentation/agora-rtc-token?channelName=${encodeURIComponent(room.id)}&uid=${screenUid}`
          );
          if (res.ok) {
            const tokenData = await res.json();
            screenToken = tokenData.token || null;
          }
        } catch (tokenErr) {
          console.warn('[Agora] Fetch RTC token for screen share warning:', tokenErr);
        }

        await sc.join(appIdForScreen, room.id, screenToken, screenUid);
        await sc.publish(screenTrack);
        screenTrack.on('track-ended', () => {
          screenTrack.close();
          localScreenTrackRef.current = null;
          sc.leave().catch(() => {});
          localScreenClientRef.current = null;
          setIsSharingScreen(false);
          setActiveMainScreenShareUid(prev => (prev === screenUid ? null : prev));
        });
        setIsSharingScreen(true);
        setActiveMainScreenShareUid(screenUid);
      } catch (e) {
        console.error('[Agora] Screen share', e);
      }
    }
  };

  // Fix 11: Header composite toggle with 320ms spinner
  const toggleSidebarMode = () => {
    setIsSidebarSwitching(true);
    const nextMode = leftSidebarMode === 'video' ? 'topics' : 'video';
    setTimeout(() => {
      setLeftSidebarMode(nextMode);
      if (nextMode === 'topics') {
        setTopicsTimerValue(50);
      }
      setTimeout(() => {
        setIsSidebarSwitching(false);
      }, 50);
    }, 180);
  };

  const handleTopicsScroll = () => {
    setTopicsTimerValue(50);
  };

  // Initialize and track hover state immediately upon mounting Topics view to handle pre-positioned cursors
  useEffect(() => {
    if (leftSidebarMode === 'topics') {
      const checkHover = () => {
        const el = document.querySelector('.agora-enter-topics');
        if (el && el.matches(':hover')) {
          setIsHoveringTopics(true);
        }
      };

      checkHover();
      const timer = setTimeout(checkHover, 50);
      const timer2 = setTimeout(checkHover, 250);

      const handleMouseMove = () => {
        const el = document.querySelector('.agora-enter-topics');
        if (el && el.matches(':hover')) {
          setIsHoveringTopics(true);
          window.removeEventListener('mousemove', handleMouseMove);
        }
      };
      window.addEventListener('mousemove', handleMouseMove);

      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
        window.removeEventListener('mousemove', handleMouseMove);
      };
    } else {
      setIsHoveringTopics(false);
    }
  }, [leftSidebarMode]);

  // Unified Topics mode auto-return timer with hover pause & shrinking bar (Requirement 16)
  useEffect(() => {
    if (leftSidebarMode !== 'topics') {
      setTopicsTimerValue(50);
      return;
    }

    // Pause timer if cursor is hovering over the Topics sidebar panel
    if (isHoveringTopics) {
      return;
    }

    const interval = setInterval(() => {
      setTopicsTimerValue(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setLeftSidebarMode('video');
          return 50;
        }
        return prev - 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [leftSidebarMode, isHoveringTopics]);

  // Synchronize browser address bar input value with socket updates
  useEffect(() => {
    if (roomState?.browserUrl) {
      setBrowserInputUrl(roomState.browserUrl);
    }
  }, [roomState?.browserUrl]);

  // Fix 1: FramePanel permanent container (no DOM move = no MindMap crash)
  const framePanelRef = useRef<FramePanel | null>(null);
  const framePanelContainerRef = useRef<HTMLDivElement | null>(null);

  // One-time attachment — only attaches once when container ref is set
  const onFrameContainerReady = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      framePanelContainerRef.current = el;

      // Capture-phase click interception for frame cards
      const handleCaptureClick = (e: MouseEvent) => {
        if (isProgrammaticClickRef.current) return;

        const target = e.target as HTMLElement;
        if (target.closest('input, textarea, select')) return;

        const isFrameItem = target.closest('blocksuite-frame-panel-item, .affine-frame-panel-item, [data-frame-id]') ||
          (target.closest('blocksuite-frame-panel, frame-panel') && !target.closest('input'));

        if (isFrameItem && followingSessionIdRef.current) {
          e.stopPropagation();
          e.preventDefault();
          setPendingFrameClickTarget(target);
        }
      };

      el.addEventListener('click', handleCaptureClick, true);

      if (!editorContainer?.host || el.children.length > 0) return;
      const fp = new FramePanel();
      fp.fitPadding = [20, 20, 20, 20];
      fp.host = editorContainer.host;
      el.appendChild(fp);
      framePanelRef.current = fp;
    },
    [editorContainer]
  );


  // Keep FramePanel.host in sync if editor changes
  useEffect(() => {
    if (editorContainer?.host && framePanelRef.current) {
      framePanelRef.current.host = editorContainer.host;
    }
    // Also attach if container exists but FramePanel not yet created
    const el = framePanelContainerRef.current;
    if (el && editorContainer?.host && el.children.length === 0) {
      const fp = new FramePanel();
      fp.fitPadding = [20, 20, 20, 20];
      fp.host = editorContainer.host;
      el.appendChild(fp);
      framePanelRef.current = fp;
    }
  }, [editorContainer]);

  // ── Viewport following & Awareness-based coordinate synchronization ──
  // 1. Broadcast local user identity properties in YJS awareness
  useEffect(() => {
    if (!editorContainer || !room) return;
    const doc = editorContainer.doc;
    if (!doc) return;

    doc.awarenessStore.awareness.setLocalStateField('user', {
      name: isSharedMode ? guestName : account?.label || 'Presenter',
      isHost,
      sessionId,
    });
  }, [editorContainer, room, isSharedMode, guestName, account, isHost, sessionId]);

  // Host Action Console Dispatcher
  const sendBrowserCommand = useCallback((action: string, elementKey: string | null, payload?: any, customTargets?: string[]) => {
    if (!editorContainer || !room) return;
    const doc = editorContainer.doc;
    if (!doc) return;

    if (elementKey && ['right_sidebar_btn', 'right_sidebar', 'chat_tab', 'gemini_tab', 'translate_tab'].includes(elementKey)) {
      hasTriggeredRightSidebarActionRef.current = true;
    }

    if (action === 'close_right_sidebar') {
      setRightSidebarOpen(false);
    }

    const commandId = 'cmd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    doc.awarenessStore.awareness.setLocalStateField('browserCommand', {
      commandId,
      timestamp: Date.now(),
      targets: customTargets || executionSelectedUsers,
      action,
      elementKey,
      payload: payload || {},
    });

    // Auto-clear awareness command field after 3s so stale state doesn't linger or re-trigger on reload
    setTimeout(() => {
      try {
        if (doc.awarenessStore?.awareness) {
          doc.awarenessStore.awareness.setLocalStateField('browserCommand', null);
        }
      } catch (_) {}
    }, 3000);
  }, [editorContainer, room, executionSelectedUsers]);

  // Visual highlight generator
  const triggerHighlightEffect = useCallback((elOrEls: HTMLElement | HTMLElement[]) => {
    const elements = Array.isArray(elOrEls) ? elOrEls : [elOrEls];
    const existing = document.querySelectorAll('.present-browser-highlight-overlay');
    existing.forEach(e => e.remove());

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const overlay = document.createElement('div');
      overlay.className = 'present-browser-highlight-overlay';
      
      Object.assign(overlay.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: '2px solid #00e5ff',
        background: 'rgba(0, 229, 255, 0.12)',
        boxShadow: '0 0 20px rgba(0, 229, 255, 0.6), inset 0 0 10px rgba(0, 229, 255, 0.4)',
        borderRadius: '8px',
        pointerEvents: 'none',
        zIndex: '999999',
        transition: 'opacity 0.5s ease',
        opacity: '1',
        boxSizing: 'border-box',
      });

      const leftArrows = document.createElement('div');
      leftArrows.textContent = '>>>';
      Object.assign(leftArrows.style, {
        position: 'absolute',
        left: '-40px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#00e5ff',
        fontSize: '18px',
        fontWeight: 'bold',
        textShadow: '0 0 8px rgba(0,229,255,0.8)',
        animation: 'bounceLeftArrows 1s infinite ease-in-out',
      });

      const rightArrows = document.createElement('div');
      rightArrows.textContent = '<<<';
      Object.assign(rightArrows.style, {
        position: 'absolute',
        right: '-40px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#00e5ff',
        fontSize: '18px',
        fontWeight: 'bold',
        textShadow: '0 0 8px rgba(0,229,255,0.8)',
        animation: 'bounceRightArrows 1s infinite ease-in-out',
      });

      overlay.appendChild(leftArrows);
      overlay.appendChild(rightArrows);
      document.body.appendChild(overlay);

      setTimeout(() => {
        overlay.style.opacity = '0';
      }, 4500);

      setTimeout(() => {
        overlay.remove();
      }, 5000);
    });

    if (!document.getElementById('present-highlight-keyframes')) {
      const style = document.createElement('style');
      style.id = 'present-highlight-keyframes';
      style.innerHTML = `
        @keyframes bounceLeftArrows {
          0%, 100% { transform: translateY(-50%) translateX(-5px); }
          50% { transform: translateY(-50%) translateX(5px); }
        }
        @keyframes bounceRightArrows {
          0%, 100% { transform: translateY(-50%) translateX(5px); }
          50% { transform: translateY(-50%) translateX(-5px); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Action Console Executor
  const handleElementAction = useCallback((action: 'click' | 'highlight', elementKey: string) => {
    const config = elementConfigs[elementKey];
    if (!config) return;

    if (config.sidebar === 'right') {
      setRightSidebarOpen(true);
      if (config.rightTab) {
        setActiveRightTab(config.rightTab);
      }
    }

    if (elementKey === 'left_sidebar') {
      setLeftSidebarMode('topics');
      setTopicsTimerValue(50);
    }

    // Delay calculation to 300ms to guarantee right sidebar's 0.23s transition is fully completed
    setTimeout(() => {
      let elementsToHighlight: HTMLElement[] = [];
      let elToClick: HTMLElement | null = null;

      if (['chat_tab', 'gemini_tab', 'translate_tab'].includes(elementKey)) {
        const tabKey = config.rightTab || (elementKey === 'chat_tab' ? 'chat' : elementKey === 'gemini_tab' ? 'gemini' : 'translate');
        const targetBtn = (
          document.querySelector(`[data-testid="${elementKey}-btn"], [data-tab="${tabKey}"]`) ||
          document.querySelector(`.rightbar-tabs .tab-btn:nth-child(${elementKey === 'chat_tab' ? 1 : elementKey === 'gemini_tab' ? 2 : 3})`)
        ) as HTMLElement;
        if (targetBtn) {
          elToClick = targetBtn;
          elementsToHighlight.push(targetBtn);
        }
      } else if (elementKey === 'left_sidebar') {
        const toggleBtn = (document.querySelector('[data-testid="left-sidebar-toggle-btn"]') || document.querySelector('button[data-tooltip*="Topics"], button[data-tooltip*="Video"]')) as HTMLElement;
        const leftSidebarContainer = document.querySelector('.present-sidebar-left') as HTMLElement;
        if (toggleBtn) elementsToHighlight.push(toggleBtn);
        if (leftSidebarContainer && leftSidebarContainer !== toggleBtn) elementsToHighlight.push(leftSidebarContainer);
      } else if (elementKey === 'right_sidebar_btn') {
        const toggleBtn = (document.querySelector('[data-testid="right-sidebar-toggle-btn"]') || document.querySelector('button[data-tooltip*="Toggle Chat"]')) as HTMLElement;
        const rightSidebarContainer = document.querySelector('.present-sidebar-right') as HTMLElement;
        if (toggleBtn) {
          elToClick = toggleBtn;
          elementsToHighlight.push(toggleBtn);
        }
        if (rightSidebarContainer && rightSidebarContainer !== toggleBtn) {
          elementsToHighlight.push(rightSidebarContainer);
        }
      } else if (elementKey === 'av_settings') {
        const avBtn = (document.querySelector('[data-testid="av-settings-btn"]') || document.querySelector('button[data-tooltip*="Audio/Video"]')) as HTMLElement;
        if (avBtn) {
          elementsToHighlight.push(avBtn);
        }
      } else if (elementKey === 'follow_button') {
        const followBtns = Array.from(document.querySelectorAll('.glass-follow-btn, [data-tooltip*="Follow participant"], [data-tooltip*="Unfollow participant"]')) as HTMLElement[];
        if (followBtns.length > 0) {
          elementsToHighlight.push(...followBtns);
        }
      } else {
        const el = document.querySelector(config.selector) as HTMLElement;
        if (el) {
          if (!['av_settings', 'follow_button'].includes(elementKey)) {
            elToClick = el;
          }
          elementsToHighlight.push(el);
        }
      }

      // Audio/Video settings, follow button, left sidebar and right sidebar toggle buttons highlight without unintended clicks
      if (action === 'click' && elToClick && !['av_settings', 'left_sidebar', 'right_sidebar_btn', 'follow_button'].includes(elementKey)) {
        try { elToClick.click(); } catch (_) {}
      }

      if (elementsToHighlight.length > 0) {
        triggerHighlightEffect(elementsToHighlight);
      }
    }, 300);
  }, [triggerHighlightEffect]);

  // Listener for Guest YJS awareness commands
  useEffect(() => {
    if (!editorContainer || !room || isHost) return;
    const doc = editorContainer.doc;
    if (!doc) return;

    const handleAwarenessUpdate = () => {
      const states = doc.awarenessStore.awareness.getStates();
      states.forEach((state: any) => {
        const cmd = state.browserCommand;
        if (cmd && cmd.commandId) {
          if (executedCommandsSetRef.current.has(cmd.commandId)) return;

          // Prevent re-executing stale commands issued before page load or older than 10s
          if (cmd.timestamp && (cmd.timestamp < mountTimestampRef.current || Date.now() - cmd.timestamp > 10000)) {
            executedCommandsSetRef.current.add(cmd.commandId);
            return;
          }

          const isTargeted =
            cmd.targets.includes('all') ||
            cmd.targets.includes(sessionId);

          if (isTargeted) {
            executedCommandsSetRef.current.add(cmd.commandId);

            if (cmd.action === 'open_url') {
              let url = cmd.payload.url;
              if (url) {
                if (!/^https?:\/\//i.test(url)) {
                  url = 'https://' + url;
                }
                window.open(url, '_blank');
              }
            } else if (cmd.action === 'toast') {
              setSsNotifications(prev => [
                ...prev,
                {
                  id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  type: 'announcement',
                  message: cmd.payload.message,
                },
              ]);
            } else if (cmd.action === 'close_right_sidebar') {
              setRightSidebarOpen(false);
            } else if (cmd.action === 'toggle_browser_enlarge') {
              setIsBrowserEnlarged(prev => !prev);
            } else if (cmd.action === 'click' || cmd.action === 'highlight') {
              handleElementAction(cmd.action, cmd.elementKey);
            }
          }
        }
      });
    };

    doc.awarenessStore.awareness.on('change', handleAwarenessUpdate);
    return () => {
      doc.awarenessStore.awareness.off('change', handleAwarenessUpdate);
    };
  }, [editorContainer, room, isHost, sessionId, handleElementAction]);

  const handleConfirmUnfollowFrame = () => {
    if (pendingFrameClickTarget) {
      handleSetFollowing(null);
      if (typeof pendingFrameClickTarget === 'function') {
        try {
          (pendingFrameClickTarget as () => void)();
        } catch (e) {
          console.error('[UnfollowAction] Failed to execute callback:', e);
        }
      } else if (pendingFrameClickTarget && typeof (pendingFrameClickTarget as any).click === 'function') {
        isProgrammaticClickRef.current = true;
        (pendingFrameClickTarget as any).click();
        setTimeout(() => {
          isProgrammaticClickRef.current = false;
        }, 50);
      }
    }
    setPendingFrameClickTarget(null);
  };


  // Keep track of initialization to run only once when members are populated
  const hasInitializedRef = useRef(false);

  // 2. Auto-follow and persistence synchronization (Offline Cache Loader)
  useEffect(() => {
    if (!activeRoomId || isHost || hasInitializedRef.current || members.length === 0) return;

    let persistedName: string | null = null;
    let persistedManualUnfollow = false;
    try {
      persistedName = localStorage.getItem(`presentation_followed_member_name_${activeRoomId}`);
      persistedManualUnfollow = localStorage.getItem(`presentation_has_manually_unfollowed_${activeRoomId}`) === 'true';
    } catch (_) {}

    if (persistedManualUnfollow) {
      setHasManuallyUnfollowed(true);
      setFollowingSessionId(null);
      hasInitializedRef.current = true;
      return;
    }

    if (persistedName) {
      const match = members.find(m => m.name === persistedName) ||
                    members.find(m => m.isHost && `Host (${m.name})` === persistedName);
      if (match && match.sessionId) {
        setFollowingSessionId(match.sessionId);
        hasInitializedRef.current = true;
      }
    } else {
      // Auto-follow host by default
      const host = members.find(m => m.isHost);
      if (host && host.sessionId) {
        setFollowingSessionId(host.sessionId);
        hasInitializedRef.current = true;
      }
    }
  }, [members, isHost, activeRoomId]);

  // Track manual user gestures to avoid auto-unfollowing on window resize or cursor hover
  useEffect(() => {
    if (!editorContainer || !editorContainer.host) return;
    const hostEl = editorContainer.host as HTMLElement;

    const handleWheel = () => {
      lastUserInteractionTimeRef.current = Date.now();
    };

    const handlePointerDown = () => {
      isPointerDownRef.current = true;
    };

    const handlePointerMove = () => {
      if (isPointerDownRef.current) {
        lastUserInteractionTimeRef.current = Date.now();
      }
    };

    const handlePointerUpOrCancel = () => {
      isPointerDownRef.current = false;
    };

    hostEl.addEventListener('wheel', handleWheel, { passive: true });
    hostEl.addEventListener('pointerdown', handlePointerDown, { passive: true });
    hostEl.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUpOrCancel, { passive: true });
    window.addEventListener('pointercancel', handlePointerUpOrCancel, { passive: true });

    return () => {
      hostEl.removeEventListener('wheel', handleWheel);
      hostEl.removeEventListener('pointerdown', handlePointerDown);
      hostEl.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUpOrCancel);
      window.removeEventListener('pointercancel', handlePointerUpOrCancel);
    };
  }, [editorContainer]);

  // 3. Viewport follow logic: Set local viewport when the followed member's coordinates update
  useEffect(() => {
    if (!editorContainer || !followingSessionId) return;
    const doc = editorContainer.doc;
    if (!doc) return;

    const gfx = editorContainer.host?.std.get(GfxControllerIdentifier);
    if (!gfx) return;

    const handleAwarenessChange = () => {
      const states = doc.awarenessStore.awareness.getStates();
      let targetState: any = null;
      states.forEach((state: any) => {
        if (state.user?.sessionId === followingSessionId) {
          targetState = state;
        }
      });

      if (targetState && targetState.viewport) {
        const { centerX, centerY, zoom } = targetState.viewport;

        if (
          gfx.viewport.centerX !== centerX ||
          gfx.viewport.centerY !== centerY ||
          gfx.viewport.zoom !== zoom
        ) {
          isApplyingFollowedViewportRef.current = true;
          gfx.viewport.setViewport(zoom, [centerX, centerY]);

          requestAnimationFrame(() => {
            isApplyingFollowedViewportRef.current = false;
          });
        }
      }
    };

    doc.awarenessStore.awareness.on('change', handleAwarenessChange);
    handleAwarenessChange(); // Apply immediately if coordinates exist

    return () => {
      doc.awarenessStore.awareness.off('change', handleAwarenessChange);
    };
  }, [editorContainer, followingSessionId]);

  // 4. Viewport broadcast & manual movement detection (Auto-Unfollow)
  useEffect(() => {
    if (!editorContainer) return;
    const doc = editorContainer.doc;
    if (!doc) return;

    const gfx = editorContainer.host?.std.get(GfxControllerIdentifier);
    if (!gfx) return;

    const handleViewportUpdate = () => {
      if (isApplyingFollowedViewportRef.current) return;

      // Broadcast our current coordinates
      doc.awarenessStore.awareness.setLocalStateField('viewport', {
        centerX: gfx.viewport.centerX,
        centerY: gfx.viewport.centerY,
        zoom: gfx.viewport.zoom,
        timestamp: Date.now(),
      });
    };

    const sub = gfx.viewport.viewportUpdated.subscribe(handleViewportUpdate);

    // Initial publish
    doc.awarenessStore.awareness.setLocalStateField('viewport', {
      centerX: gfx.viewport.centerX,
      centerY: gfx.viewport.centerY,
      zoom: gfx.viewport.zoom,
      timestamp: Date.now(),
    });

    return () => {
      sub.unsubscribe();
    };
  }, [editorContainer, followingSessionId, activeRoomId]);

  const onEditorLoad = useCallback(
    (container: any) => {
      setEditorContainer(container);
      if (!editor) return;
      const unbind = editor.bindEditorContainer(container);
      return () => {
        unbind();
      };
    },
    [editor]
  );

  if (isCurrentlyKicked) {
    return (
      <div
        onContextMenu={e => e.preventDefault()}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--affine-background-primary-color)',
          color: 'var(--affine-text-secondary-color)',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
        }}
      >
        <InformationFillDuotoneIcon style={{ width: 44, height: 44, color: '#ef4444' }} />
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--affine-error-color, #ef4444)',
          }}
        >
          Session Ended
        </div>
        <div
          style={{
            fontSize: '13px',
            textAlign: 'center',
            maxWidth: '320px',
            lineHeight: 1.5,
          }}
        >
          Your session has been ended by the host.
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem('presentation_room_path');
            if (room?.id) {
              sessionStorage.removeItem(`presentation_staging_submitted_${room.id}`);
            }
            if (account?.email?.endsWith('@guest.presentation')) {
              authService.signOut().catch(() => {});
              window.location.href = 'https://intoai.ai';
            } else {
              navigate('/', { replace: true });
            }
          }}
          style={{
            marginTop: '8px',
            padding: '8px 24px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--affine-brand-color, #1e96eb)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(30, 150, 235, 0.15)',
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  if (roomEnded || roomEndedModalOpen) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--affine-background-primary-color)',
          color: 'var(--affine-text-secondary-color)',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
        }}
      >
        <img
          src={illustrationLight}
          alt="Presentation Ended"
          style={{
            width: '90%',
            maxWidth: '850px',
            maxHeight: '560px',
            height: 'auto',
            objectFit: 'contain',
            marginBottom: '20px',
            borderRadius: '20px',
          }}
        />
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--affine-text-primary-color)',
            textAlign: 'center',
          }}
        >
          Presentation Ended
        </div>
        <div
          style={{
            fontSize: '13px',
            textAlign: 'center',
            maxWidth: '360px',
            lineHeight: 1.7,
            color: 'var(--affine-text-secondary-color)',
          }}
        >
          The presenter has ended this live presentation room.
        </div>
        <button
          onClick={async () => {
            setRoomEndedModalOpen(false);
            sessionStorage.removeItem('presentation_room_path');
            if (activeWorkspace && room) {
              const tempDocId = `temp-${room.id}`;
              try {
                activeWorkspace.docCollection.removeDoc(tempDocId);
              } catch (err) {
                console.error('Failed to remove temp doc on end', err);
              }
            }
            const isGuest =
              !account ||
              account.email?.endsWith('@guest.presentation') ||
              account.email?.includes('@guest') ||
              account.email?.includes('guest.') ||
              !!sessionStorage.getItem('guest_name');

            if (isGuest) {
              try {
                await authService.signOut();
              } catch (_) {}
              sessionStorage.clear();
              window.location.href = window.location.origin;
            } else {
              window.location.href = window.location.origin;
            }
          }}
          style={{
            marginTop: '8px',
            padding: '8px 24px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--affine-brand-color, #1e96eb)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(30, 150, 235, 0.15)',
          }}
        >
          OK
        </button>
      </div>
    );
  }

  // Staging / Joining screen for visitors (Requirement 6)
  if (isSharedMode && !room) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--affine-background-primary-color)',
          color: 'var(--affine-text-secondary-color)',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid var(--affine-border-color)',
            borderTopColor: 'var(--affine-text-secondary-color)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '13px' }}>Loading board metadata...</span>
      </div>
    );
  }

  if (isSharedMode && !hasSubmittedStaging) {
    return (
      <StagingLobby
        room={room}
        agoraLoaded={agoraLoaded}
        isSharedMode={isSharedMode}
        account={account}
        authService={authService}
        videoInputs={videoInputs}
        setVideoInputs={setVideoInputs}
        audioInputs={audioInputs}
        setAudioInputs={setAudioInputs}
        audioProfile={audioProfile}
        isEchoCancellationOn={isEchoCancellationOn}
        isAutomaticGainControlOn={isAutomaticGainControlOn}
        isNoiseSuppressionOn={isNoiseSuppressionOn}
        onJoin={({
          name,
          micOn,
          camOn,
          videoInput,
          audioInput,
          virtualBg,
          customBgImage,
          aiNoiseSuppression,
          aecOn,
          agcOn,
          nativeAnsOn,
        }) => {
          setStagingName(name);
          setIsMicOn(micOn);
          setIsCamOn(camOn);
          isMicOnRef.current = micOn;
          isCamOnRef.current = camOn;
          if (videoInput) setSelectedVideoInput(videoInput);
          if (audioInput) setSelectedAudioInput(audioInput);
          setActiveVirtualBg(virtualBg);
          setCustomBgImage(customBgImage);
          setIsAiNoiseSuppressionOn(aiNoiseSuppression);
          setIsAiNoiseSuppressionActive(aiNoiseSuppression);
          if (aecOn !== undefined) setIsEchoCancellationOn(aecOn);
          if (agcOn !== undefined) setIsAutomaticGainControlOn(agcOn);
          if (nativeAnsOn !== undefined) setIsNoiseSuppressionOn(nativeAnsOn);

          // Update active tracks if they already exist
          if (localAudioTrackRef.current) {
            localAudioTrackRef.current.setEnabled(micOn).catch(console.error);
          }
          if (localVideoTrackRef.current) {
            localVideoTrackRef.current.setEnabled(camOn).catch(console.error);
          }

          if (room?.id) {
            sessionStorage.setItem(
              `presentation_staging_submitted_${room.id}`,
              'true'
            );
          }
          setHasSubmittedStaging(true);
        }}
      />
    );
  }

  // Guest permission and connection checks before loading workspace or document
  const renderSplitWaitingScreen = () => {
    if (hostEverJoined) return null;

    const displayLogo = companyProfile.oneLogoData || oneLogoLight;

    const meetingTitle = room?.title || room?.permissions?.title || 'Live Presentation';
    const meetingDesc = room?.description || room?.permissions?.description || 'Collaborative whiteboard session for research and projects.';
    const timeText = formattedTime;

    const attendeesText = String(members.length || 1);

    return (
      <div
        style={{
          width: '100vw',
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          background: '#ffffff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#0f172a',
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {/* LEFT COLUMN: Meeting Details & Wait info */}
        <div
          style={{
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100vh',
            boxSizing: 'border-box',
          }}
        >
          {/* Top Left Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={displayLogo}
              alt="One Logo"
              style={{
                height: '78px',
                maxHeight: '96px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Center Content */}
          <div style={{ maxWidth: '440px', width: '100%', margin: '40px 0' }}>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 12px 0',
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
              }}
            >
              {meetingTitle}
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: '#64748b',
                margin: '0 0 20px 0',
                lineHeight: 1.5,
              }}
            >
              {meetingDesc}
            </p>

            {/* Blue Accent Bar */}
            <div
              style={{
                width: '48px',
                height: '4px',
                background: '#0565ff',
                borderRadius: '2px',
                marginBottom: '28px',
              }}
            />

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Attendees:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{attendeesText}</strong>
              </div>
              {timeText && (
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Starts At:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{timeText}</strong>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginTop: '12px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: '2px solid #e2e8f0',
                    borderTopColor: '#0565ff',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Waiting for the host to join...</span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
                padding: '14px 16px',
                fontSize: '13px',
                color: '#b45309',
                lineHeight: 1.55,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: '2px' }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div>
                <strong>For security reasons</strong>, the board will be available only after the host joins.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              fontSize: '13px',
              color: '#94a3b8',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '20px',
            }}
          >
            <span>
              © {new Date().getFullYear()} One. All rights reserved.
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Illustration */}
        <div
          style={{
            background: '#f6f8fd',
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '100vh',
            boxSizing: 'border-box',
            borderLeft: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '20px 0',
            }}
          >
            <img
              src={illustrationLight}
              alt="One Workspace Illustration"
              style={{
                width: '92%',
                maxWidth: '640px',
                maxHeight: '520px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.05))',
              }}
            />
          </div>

          <div
            style={{
              width: '100%',
              maxWidth: '580px',
              textAlign: 'center',
              marginTop: 'auto',
              paddingBottom: '16px',
            }}
          >
            <h2
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 10px 0',
                letterSpacing: '-0.5px',
                lineHeight: 1.3,
              }}
            >
              Everything you need. <strong>One</strong> AI-powered workspace.
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.55 }}>
              Research, projects, meetings, knowledge, insights, and infrastructure—unified in a single intelligent platform.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isSharedMode) {
    if (!connected) {
      const isLongWait = connectWaitSeconds >= 20;
      if (!hostEverJoined && totalWaitSeconds >= 5) {
        return renderSplitWaitingScreen();
      }
      // Connecting to WebSocket
      return (
        <div
          onContextMenu={e => e.preventDefault()}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'var(--affine-background-primary-color)',
            color: 'var(--affine-text-secondary-color)',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
          }}
        >
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '2px solid var(--affine-border-color)',
              borderTopColor: 'var(--affine-text-secondary-color)',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '13px', textAlign: 'center', maxWidth: '340px', lineHeight: 1.5 }}>
            {isLongWait
              ? 'Connection is taking longer than expected. Please connect with the host if the issue persists after clicking Troubleshoot below.'
              : 'Connecting to presentation room...'}
          </span>
          {isLongWait && (
            <button
              onClick={handleTroubleshoot}
              style={{
                marginTop: '6px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--affine-brand-color, #1e96eb)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(30, 150, 235, 0.3)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--affine-brand-hover-color, #0077c7)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--affine-brand-color, #1e96eb)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Troubleshoot
            </button>
          )}
        </div>
      );
    }

    if (joinRejected) {
      return (
        <div
          onContextMenu={e => e.preventDefault()}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'var(--affine-background-primary-color)',
            color: 'var(--affine-text-secondary-color)',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
          }}
        >
          <InformationFillDuotoneIcon style={{ width: 44, height: 44, color: '#ef4444' }} />
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--affine-error-color, #ef4444)',
            }}
          >
            Join Request Denied
          </div>
          <div
            style={{
              fontSize: '13px',
              textAlign: 'center',
              maxWidth: '320px',
              lineHeight: 1.5,
            }}
          >
            The host has declined your request to join this presentation.
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '8px',
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid var(--affine-border-color)',
              background: 'var(--affine-hover-color)',
              color: 'var(--affine-text-primary-color)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go Home
          </button>
        </div>
      );
    }

    if (joinPending) {
      // Host is in the room, but guest is still waiting for host's approval
      const isLongWait = connectWaitSeconds >= 20;
      if (!hostEverJoined && totalWaitSeconds >= 5) {
        return renderSplitWaitingScreen();
      }
      return (
        <div
          onContextMenu={e => e.preventDefault()}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'var(--affine-background-primary-color)',
            color: 'var(--affine-text-secondary-color)',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
          }}
        >
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '2px solid var(--affine-border-color)',
              borderTopColor: 'var(--affine-text-secondary-color)',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div style={{ fontSize: '15px', fontWeight: 600 }}>
            Waiting for host approval...
          </div>
          <div
            style={{
              fontSize: '12px',
              textAlign: 'center',
              maxWidth: '300px',
              lineHeight: 1.5,
            }}
          >
            The presenter will let you in shortly. Please wait.
          </div>
          {isLongWait && (
            <button
              onClick={handleTroubleshoot}
              style={{
                marginTop: '6px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--affine-brand-color, #1e96eb)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(30, 150, 235, 0.3)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--affine-brand-hover-color, #0077c7)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--affine-brand-color, #1e96eb)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Troubleshoot
            </button>
          )}
        </div>
      );
    }
  }

  if (!room || !page || !editor) {
    const isWaiting = isSharedMode && waitingForHost && !hostEverJoined;
    const isTimedOut = isSharedMode && hostJoinTimedOut && !hostEverJoined;
    const isLongWait = connectWaitSeconds >= 20;
    if (isWaiting && totalWaitSeconds >= 5) {
      return renderSplitWaitingScreen();
    }
    return (
      <div
        onContextMenu={e => e.preventDefault()}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--affine-background-primary-color)',
          color: 'var(--affine-text-secondary-color)',
          flexDirection: 'column',
          gap: '16px',
          fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {isTimedOut ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--affine-brand-color, #1e96eb)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
            </svg>
          </div>
        ) : (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '2px solid var(--affine-border-color)',
              borderTopColor: 'var(--affine-text-secondary-color)',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
        <span style={{ fontSize: '13px', textAlign: 'center', maxWidth: '340px', lineHeight: 1.5 }}>
          {isTimedOut
            ? 'Host has not started the presentation yet. Please try again later or reach out to the host.'
            : isWaiting
              ? 'Waiting for host to share the presentation board...'
              : isLongWait
                ? 'Connection is taking longer than expected. Please connect with the host if the issue is not solved using the Troubleshoot button below.'
                : 'Connecting to presentation room...'}
        </span>
        {(isLongWait || isTimedOut) && (
          <button
              onClick={handleTroubleshoot}
              style={{
                marginTop: '6px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--affine-brand-color, #1e96eb)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(30, 150, 235, 0.3)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--affine-brand-hover-color, #0077c7)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--affine-brand-color, #1e96eb)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Troubleshoot
            </button>
        )}
      </div>
    );
  }



  return (
    <div
      className={`present-page-root ${rightSidebarOpen ? 'right-sidebar-open' : ''}`}
      onContextMenu={e => e.preventDefault()}
      style={{
        display: 'grid',
        gridTemplateRows: '52px 1fr',
        gridTemplateColumns: `${leftSidebarMode ? '320px' : '0px'} 1fr ${rightSidebarOpen ? '340px' : '0px'}`,
        gridTemplateAreas: leftSidebarMode
          ? '"header header header" "sidebar main rsidebar"'
          : '"header header header" ". main rsidebar"',
        width: '100vw',
        height: '100vh',
        padding: '10px',
        gap: '10px',
        boxSizing: 'border-box',
        background: 'var(--affine-background-secondary-color, #f0f3f8)',
        color: 'var(--affine-text-primary-color)',
        overflow: 'hidden',
        fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
        position: 'relative',
        transition: 'grid-template-columns 0.28s cubic-bezier(0.16, 1, 0.3, 1), gap 0.28s ease',
      }}
    >
      <style>{`
        /* ============================================================
           PRESENT PAGE STYLES
           NOTE: We do NOT override --affine-primary-color or
           --affine-brand-color globally because this would break
           the edgeless canvas toolbar, element handles, and frame
           colors. Only specific present UI elements are styled.
        ============================================================ */

        /* Hide items that are specific to the normal workspace UI
           but should NOT appear in the presentation room */
        .present-page-root [data-testid="ai-island"],
        .present-page-root .ai-island-container,
        .present-page-root [data-testid="date-picker"],
        .present-page-root [data-testid="today-button"],
        .present-page-root [data-testid="share-button"],
        .present-page-root [data-testid="more-actions-button"],
        .present-page-root .affine-page-header,
        .present-page-root .doc-title-container,
        .present-page-root .workbench-view-header,
        .present-page-root .editor-mode-switch-wrapper,
        .present-page-root .affine-doc-page-block-title-container {
          display: none !important;
        }

        /* Edgeless Canvas Embedded Cards & Notes — Remove Glassmorphism Blur & Enforce Opaque Surfaces */
        .present-page-root affine-embed-synced-doc,
        .present-page-root affine-embed-linked-doc,
        .present-page-root affine-note,
        .present-page-root .affine-embed-synced-doc-container,
        .present-page-root .affine-embed-synced-doc-card,
        .present-page-root .affine-embed-linked-doc-card,
        .present-page-root .affine-embed-card,
        .present-page-root .affine-note-container,
        .present-page-root .edgeless-block-portal,
        .present-page-root .edgeless-note-mask,
        .present-page-root [data-block-is-card="true"],
        .present-page-root .workbench-view-container,
        .present-page-root .affine-block-element {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          background-color: var(--affine-background-primary-color, #ffffff) !important;
          opacity: 1 !important;
        }

        /* IMPORTANT: Do NOT hide edgeless-toolbar-widget — it contains
           the drawing tools, shapes, etc. that users need */

        /* ---------------------------------------------------------- */
        /* Header button — neutral theme                              */
        /* ---------------------------------------------------------- */
        .present-header-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 32px !important;
          height: 32px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          color: var(--affine-icon-color) !important;
          border: none !important;
          background: transparent !important;
          transition: background 0.15s ease, color 0.15s ease !important;
          padding: 0 !important;
        }
        .present-header-btn:hover {
          background: var(--affine-hover-color) !important;
          color: var(--affine-text-primary-color) !important;
        }
        .present-header-btn.present-btn-active {
          color: var(--affine-text-primary-color) !important;
          background: var(--affine-hover-color) !important;
        }
        .present-header-btn:focus,
        .present-header-btn:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        /* Force icon color inheritance inside header buttons */
        .present-header-btn svg {
          color: inherit !important;
        }

        /* ---------------------------------------------------------- */
        /* Placeholder for Empty Frames                               */
        /* ---------------------------------------------------------- */
        .no-frame-placeholder {
          height: auto !important;
          min-height: 48px !important;
          white-space: normal !important;
          word-break: break-word !important;
        }

        /* ---------------------------------------------------------- */
        /* Sidebar label                                              */
        /* ---------------------------------------------------------- */
        .present-sidebar-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--affine-text-secondary-color);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 16px 20px 8px 20px;
        }

        /* ---------------------------------------------------------- */
        /* Right sidebar tabs — neutral (no blue underline)           */
        /* ---------------------------------------------------------- */
        .present-tab-btn {
          flex: 1 !important;
          padding: 10px 12px !important;
          border: none !important;
          background: transparent !important;
          color: var(--affine-text-secondary-color) !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          border-bottom: 2px solid transparent !important;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease !important;
        }
        .present-tab-btn:hover {
          color: var(--affine-text-primary-color) !important;
          background: var(--affine-hover-color) !important;
        }
        .present-tab-btn.present-tab-active {
          color: var(--affine-brand-color, #1e96eb) !important;
          border-bottom: 2px solid var(--affine-brand-color, #1e96eb) !important;
        }
        .present-tab-btn:focus,
        .present-tab-btn:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        /* Icon color follows tab text color */
        .present-tab-btn svg {
          color: inherit !important;
        }

        /* ---------------------------------------------------------- */
        /* Chat bubbles                                               */
        /* ---------------------------------------------------------- */
        .present-bubble {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.4;
          word-break: break-word;
          max-width: 85%;
        }
        .present-bubble.guest {
          background: var(--affine-background-secondary-color);
          color: var(--affine-text-primary-color);
          border: 1px solid var(--affine-border-color);
        }
        .present-bubble.user {
          background: var(--affine-brand-color, #1e96eb) !important;
          color: #ffffff !important;
          align-self: flex-end;
          border: none !important;
          box-shadow: 0 4px 12px rgba(30, 150, 235, 0.12);
        }
        .present-bubble.system {
          background: var(--affine-background-primary-color) !important;
          color: var(--affine-text-primary-color) !important;
          align-self: flex-start;
          border: 1px solid var(--affine-border-color) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        /* ---------------------------------------------------------- */
        /* Input                                                      */
        /* ---------------------------------------------------------- */
        .present-chat-input {
          flex: 1;
          padding: 8px 16px;
          border-radius: 20px;
          background: var(--affine-background-secondary-color);
          border: 1px solid var(--affine-border-color);
          color: var(--affine-text-primary-color);
          font-size: 13px;
          outline: none;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .present-chat-input:focus {
          border-color: var(--affine-brand-color, #1e96eb);
          box-shadow: 0 0 0 2px rgba(30, 150, 235, 0.15);
          background: var(--affine-background-primary-color);
        }
        .present-chat-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ---------------------------------------------------------- */
        /* Action buttons                                             */
        /* ---------------------------------------------------------- */
        .present-btn-end {
          border: 1px solid var(--affine-border-color) !important;
          color: var(--affine-error-color, #ef4444) !important;
          background: transparent !important;
          font-weight: 600 !important;
          height: 32px !important;
          padding: 0 14px !important;
          font-size: 13px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: inherit !important;
        }
        .present-btn-end:hover {
          background: var(--affine-error-color, #ef4444) !important;
          color: #fff !important;
          border-color: var(--affine-error-color, #ef4444) !important;
        }
        .present-btn-end:focus,
        .present-btn-end:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        .present-btn-exit {
          border: 1px solid var(--affine-border-color) !important;
          color: var(--affine-text-secondary-color) !important;
          background: transparent !important;
          font-weight: 600 !important;
          height: 32px !important;
          padding: 0 14px !important;
          font-size: 13px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: inherit !important;
        }
        .present-btn-exit:hover {
          background: var(--affine-hover-color) !important;
          color: var(--affine-text-primary-color) !important;
          border-color: var(--affine-text-secondary-color) !important;
        }
        .present-btn-exit:focus,
        .present-btn-exit:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        .present-btn-primary {
          border: none !important;
          color: #fff !important;
          background: var(--affine-brand-color, #1e96eb) !important;
          font-weight: 600 !important;
          height: 34px !important;
          padding: 0 18px !important;
          font-size: 13px !important;
          border-radius: 20px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          font-family: inherit !important;
          box-shadow: 0 2px 6px rgba(30, 150, 235, 0.15);
        }
        .present-btn-primary:hover {
          background: var(--affine-brand-hover-color, #0077c7) !important;
          box-shadow: 0 4px 12px rgba(30, 150, 235, 0.25);
        }
        .present-btn-primary:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }
        .present-btn-primary:focus,
        .present-btn-primary:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        .present-btn-gemini {
          border: 1px solid var(--affine-border-color) !important;
          color: var(--affine-text-primary-color) !important;
          background: var(--affine-background-primary-color) !important;
          font-weight: 600 !important;
          height: 32px !important;
          padding: 0 16px !important;
          font-size: 13px !important;
          border-radius: 20px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          font-family: inherit !important;
        }
        .present-btn-gemini:hover {
          background: var(--affine-hover-color) !important;
          border-color: var(--affine-text-secondary-color) !important;
        }
        .present-btn-gemini:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        .present-btn-gemini:focus,
        .present-btn-gemini:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        /* ---------------------------------------------------------- */
        /* Modals                                                     */
        /* ---------------------------------------------------------- */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes presentFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes presentScaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .present-modal-overlay {
          position: fixed !important;
          inset: 0 !important;
          background: rgba(0, 0, 0, 0.55) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 999999 !important;
          animation: presentFadeIn 0.2s ease !important;
        }
        .present-modal-container {
          background: var(--affine-background-primary-color) !important;
          border-radius: 16px !important;
          border: 1px solid var(--affine-border-color) !important;
          padding: 28px !important;
          width: 440px !important;
          max-width: 90vw !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15) !important;
          animation: presentScaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .present-modal-title {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: var(--affine-text-primary-color) !important;
          margin: 0 !important;
        }
        .present-modal-body {
          font-size: 14px !important;
          color: var(--affine-text-secondary-color) !important;
          line-height: 1.6 !important;
          margin: 0 !important;
        }
        .present-modal-actions {
          display: flex !important;
          justify-content: flex-end !important;
          gap: 10px !important;
          margin-top: 4px !important;
        }
        .present-btn-danger {
          background: var(--affine-error-color, #ef4444) !important;
          color: #fff !important;
          border: 1px solid var(--affine-error-color, #ef4444) !important;
          font-weight: 600 !important;
          height: 32px !important;
          padding: 0 16px !important;
          font-size: 13px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: inherit !important;
        }
        .present-btn-danger:hover {
          background: #dc2626 !important;
          border-color: #dc2626 !important;
        }
        .present-btn-danger:focus,
        .present-btn-danger:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        .present-btn-confirm {
          background: var(--affine-text-primary-color) !important;
          color: var(--affine-background-primary-color) !important;
          border: 1px solid var(--affine-text-primary-color) !important;
          font-weight: 600 !important;
          height: 32px !important;
          padding: 0 16px !important;
          font-size: 13px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: inherit !important;
        }
        .present-btn-confirm:hover {
          opacity: 0.85 !important;
        }
        .present-btn-confirm:focus,
        .present-btn-confirm:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        /* ---------------------------------------------------------- */
        /* Sidebar slide transition — match the original AFFiNE speed */
        /* ResizePanel uses: transition: 'all 0.23s ease'              */
        /* ---------------------------------------------------------- */
        .present-sidebar-left,
        .present-sidebar-right {
          transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .present-page-root:not(.right-sidebar-open) .present-sidebar-right {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        /* ---------------------------------------------------------- */
        /* Left Sidebar & FramePanel structure                        */
        /* ---------------------------------------------------------- */
        .present-sidebar-left {
          box-sizing: border-box !important;
        }
        .present-sidebar-left *:not(.affine-frame-panel *):not(frame-panel *):not(blocksuite-frame-panel *):not(frame-preview *):not(.agora-controls-bar):not(.agora-controls-bar *):not(.agora-ctrl-btn-slot):not(.agora-ctrl-btn-slot *) {
          max-width: 100% !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        /* Bouncing Dots Animation */
        @keyframes presentBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .present-thinking-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--affine-text-secondary-color);
          display: inline-block;
          animation: presentBounce 1.2s infinite ease-in-out;
        }
        .present-thinking-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .present-thinking-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        /* Sleek scrollbar for Right Sidebar */
        .present-sidebar-right *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .present-sidebar-right *::-webkit-scrollbar-track {
          background: transparent;
        }
        .present-sidebar-right *::-webkit-scrollbar-thumb {
          background: var(--affine-border-color);
          border-radius: 3px;
        }
        .present-sidebar-right *::-webkit-scrollbar-thumb:hover {
          background: var(--affine-text-secondary-color);
        }
        .present-sidebar-right * {
          scrollbar-width: thin;
          scrollbar-color: var(--affine-border-color) transparent;
        }


        /* ---------------------------------------------------------- */
        /* Join requests badge & dropdown                             */
        /* ---------------------------------------------------------- */
        .join-requests-btn {
          position: relative !important;
        }
        .join-requests-badge {
          position: absolute !important;
          top: -4px !important;
          right: -4px !important;
          min-width: 16px !important;
          height: 16px !important;
          padding: 0 4px !important;
          border-radius: 8px !important;
          background: var(--affine-error-color, #ef4444) !important;
          color: #fff !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          line-height: 1 !important;
          pointer-events: none !important;
        }
        .join-requests-dropdown {
          position: absolute !important;
          top: calc(100% + 10px) !important;
          right: 0 !important;
          width: 330px !important;
          background: var(--affine-background-primary-color) !important;
          border: 1px solid var(--affine-border-color) !important;
          border-radius: 14px !important;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.05) !important;
          z-index: 9999 !important;
          overflow: hidden !important;
          animation: presentScaleUp 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .join-requests-dropdown-header {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 14px 16px !important;
          border-bottom: 1px solid var(--affine-border-color) !important;
          background: var(--affine-background-secondary-color) !important;
        }
        .join-requests-list {
          max-height: 300px !important;
          overflow-y: auto !important;
          padding: 10px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
        }
        .join-request-row {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 10px 12px !important;
          border-radius: 10px !important;
          background: var(--affine-background-secondary-color) !important;
          border: 1px solid var(--affine-border-color) !important;
          gap: 10px !important;
          transition: border-color 0.2s ease !important;
        }
        .join-request-row:hover {
          border-color: rgba(30, 150, 235, 0.25) !important;
        }
        .join-request-avatar {
          width: 32px !important;
          height: 32px !important;
          border-radius: 50% !important;
          background: var(--affine-hover-color) !important;
          border: 1px solid var(--affine-border-color) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          color: var(--affine-text-primary-color) !important;
          flex-shrink: 0 !important;
        }
        .join-request-name {
          flex: 1 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          color: var(--affine-text-primary-color) !important;
        }
        .join-request-actions {
          display: flex !important;
          gap: 6px !important;
          flex-shrink: 0 !important;
        }
        .join-req-approve {
          padding: 5px 12px !important;
          border-radius: 8px !important;
          border: none !important;
          background: var(--affine-brand-color, #1e96eb) !important;
          color: #fff !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 6px rgba(30, 150, 235, 0.15) !important;
        }
        .join-req-approve:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 10px rgba(30, 150, 235, 0.25) !important;
        }
        .join-req-approve:active {
          transform: translateY(0) !important;
        }
        .join-req-deny {
          padding: 5px 12px !important;
          border-radius: 8px !important;
          border: 1px solid var(--affine-border-color) !important;
          background: var(--affine-background-primary-color) !important;
          color: var(--affine-error-color, #ef4444) !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        .join-req-deny:hover {
          background: rgba(239, 68, 68, 0.05) !important;
          border-color: rgba(239, 68, 68, 0.2) !important;
        }
        .join-req-accept-all {
          width: 100% !important;
          padding: 8px 0 !important;
          border-radius: 8px !important;
          border: 1px solid var(--affine-brand-color, #1e96eb) !important;
          background: rgba(30,150,235,0.06) !important;
          color: var(--affine-brand-color, #1e96eb) !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          letter-spacing: 0.3px !important;
        }
        .join-req-accept-all:hover {
          background: rgba(30,150,235,0.12) !important;
          transform: translateY(-1px) !important;
        }
        .join-req-accept-all:active {
          transform: translateY(0) !important;
        }

        /* ============================================================
           AGORA VIDEO SIDEBAR
        ============================================================ */

        /* ── Entrance animations ─────────────────────────────────── */
        @keyframes agoraSlideFromLeft {
          from { opacity: 0; transform: translateX(-18px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes agoraSlideFromRight {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes agoraSpeakPulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(74,246,38,0.6); }
          50%       { box-shadow: 0 0 0 6px rgba(74,246,38,0);   }
        }
        @keyframes agoraMicBeat {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.3); }
        }

        .agora-enter-video  {
          animation: agoraSlideFromLeft  0.32s cubic-bezier(0.34,1.2,0.64,1) both;
          scrollbar-gutter: stable;
        }
        .agora-enter-topics { animation: agoraSlideFromRight 0.32s cubic-bezier(0.34,1.2,0.64,1) both; }

        /* ── Media controls bar ──────────────────────────────────── */
        .agora-controls-bar {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--affine-border-color);
          background: var(--affine-background-primary-color);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          flex-shrink: 0;
          z-index: 10;
          overflow: visible !important;
        }
        /* Fix 8: ctrl-btn-slot is always same size; invisible spacers maintain alignment */
        .agora-ctrl-btn-slot {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible !important;
        }
        .agora-ctrl-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--affine-border-color);
          background: var(--affine-background-primary-color);
          color: var(--affine-icon-color);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0;
          flex-shrink: 0;
        }
        .agora-ctrl-btn:hover {
          background: var(--affine-hover-color);
          color: var(--affine-text-primary-color);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }
        .agora-ctrl-btn:active {
          transform: translateY(0);
        }
        .agora-ctrl-btn:focus,
        .agora-ctrl-btn:focus-visible { outline: none !important; box-shadow: none !important; }
        .agora-ctrl-btn.muted {
          background: rgba(239, 68, 68, 0.06) !important;
          border-color: rgba(239, 68, 68, 0.25) !important;
          color: var(--affine-error-color, #ef4444) !important;
        }
        .agora-ctrl-btn.muted:hover {
          background: rgba(239, 68, 68, 0.12) !important;
          color: var(--affine-error-color, #ef4444) !important;
        }
        .agora-ctrl-btn.disabled-perm {
          opacity: 0.25;
          cursor: not-allowed;
          pointer-events: none;
          background: var(--affine-background-secondary-color) !important;
          border-color: var(--affine-border-color) !important;
        }
        .agora-ctrl-btn.active-share {
          background: rgba(30, 150, 235, 0.06) !important;
          border-color: rgba(30, 150, 235, 0.25) !important;
          color: var(--affine-brand-color, #1e96eb) !important;
          box-shadow: 0 0 12px rgba(30, 150, 235, 0.08);
        }
        .agora-ctrl-btn.active-share:hover {
          background: rgba(30, 150, 235, 0.12) !important;
        }

        /* ── Self-view (Req D) ───────────────────────────────────── */
        .agora-self-view-wrap {
          position: relative;
          width: 58px;
          height: 32px;
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
          flex-shrink: 0;
          cursor: pointer;
          border: 1px solid rgba(15, 98, 254, 0.4);
          box-shadow: 0 2px 8px rgba(15, 98, 254, 0.25);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .agora-self-view-wrap:hover {
          border-color: var(--affine-brand-color, #1e96eb);
          transform: scale(1.04);
        }
        .agora-self-view-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* mirror for natural self-view */
        }
          /* ── Fix 3: Full-width single-column video grid ──────────── */
        .agora-video-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 12px;
        }
        .agora-video-tile {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: var(--affine-background-primary-color);
          border: 1px solid var(--affine-border-color);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
          user-select: none;
        }
        .agora-video-tile:hover {
          border-color: rgba(30, 150, 235, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        .agora-video-tile.speaking {
          border-color: rgba(16, 185, 129, 0.5) !important;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.18), 0 8px 20px rgba(16, 185, 129, 0.1) !important;
        }

        .agora-tile-avatar {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, var(--affine-background-secondary-color) 0%, var(--affine-background-primary-color) 100%);
          gap: 10px;
        }
        /* Fix 10: color set via inline style per user */
        .agora-tile-avatar-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.5px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.25);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        .agora-tile-avatar-status {
          font-size: 10px;
          font-weight: 600;
          color: var(--affine-text-secondary-color, #71717a);
          background: var(--affine-background-primary-color);
          padding: 3px 10px;
          border-radius: 12px;
          border: 1px solid var(--affine-border-color);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .agora-tile-name {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px 12px 8px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%);
          font-size: 11px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 2;
        }
        @keyframes agoraMicWave {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .agora-mic-icon {
          position: absolute;
          top: 8px;
          right: 36px;
          background: rgba(20, 20, 22, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          z-index: 5;
        }
        .agora-mic-icon-waves {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
        }
        .agora-mic-icon.moving .agora-mic-icon-waves::before,
        .agora-mic-icon.moving .agora-mic-icon-waves::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(255, 255, 255, 0.6);
          animation: agoraMicWave 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .agora-mic-icon.moving .agora-mic-icon-waves::after {
          animation-delay: 0.7s;
        }
        .agora-pin-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(20, 20, 22, 0.9);
          color: #fff;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* ── Settings panel (Fix 7) ──────────────────────────────── */
        .agora-settings-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 240px;
          background: var(--affine-background-primary-color);
          border: 1px solid var(--affine-border-color);
          border-radius: 14px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04);
          z-index: 9999;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: presentScaleUp 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        .agora-settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--affine-text-primary-color);
        }
        .agora-settings-toggle {
          width: 38px;
          height: 20px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          position: relative;
          outline: none;
        }
        .agora-settings-toggle::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .agora-settings-toggle.on { background: var(--affine-brand-color,#1e96eb); }
        .agora-settings-toggle.off { background: rgba(120, 120, 128, 0.3); }
        .agora-settings-toggle.on::after { transform: translateX(18px); }
        .agora-settings-mini-toggle {
          width: 24px;
          height: 14px;
          border-radius: 7px;
          border: none;
          cursor: not-allowed;
          position: relative;
          outline: none;
          flex-shrink: 0;
          background: rgba(120, 120, 128, 0.3);
          transition: background-color 0.25s ease;
        }
        .agora-settings-mini-toggle::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          transition: transform 0.25s ease;
        }
        .agora-settings-mini-toggle.on {
          background: var(--affine-brand-color, #1e96eb);
        }
        .agora-settings-mini-toggle.on::after {
          transform: translateX(10px);
        }
        .agora-settings-divider {
          height: 1px;
          background: var(--affine-border-color);
          margin: 4px 0;
        }
        .agora-settings-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--affine-text-secondary-color);
        }
        .agora-mute-btn {
          width: 100%;
          padding: 8px 0;
          border-radius: 8px;
          border: 1px solid var(--affine-border-color);
          background: transparent;
          color: var(--affine-error-color,#ef4444);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .agora-mute-btn:hover {
          background: rgba(239,68,68,0.06);
          border-color: rgba(239,68,68,0.2);
        }

        /* ── Device menu ─────────────────────────────────────────── */
        .agora-device-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 280px;
          background: var(--affine-background-primary-color);
          border: 1px solid var(--affine-border-color);
          border-radius: 14px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04);
          z-index: 9999;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: presentScaleUp 0.18s cubic-bezier(0.34,1.56,0.64,1);
        }
        .agora-device-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--affine-text-secondary-color);
          margin-bottom: 2px;
        }
        .agora-device-select {
          width: 100%;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--affine-border-color);
          background: var(--affine-background-secondary-color);
          color: var(--affine-text-primary-color);
          font-size: 12px;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .agora-device-select:hover {
          border-color: var(--affine-brand-color, #1e96eb);
          background: var(--affine-background-primary-color);
        }

        @keyframes agoraSlideDownFade {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes agoraPulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%      { transform: scale(1.2); opacity: 1; }
        }
        @keyframes agoraSlideInFromRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* ─── Header ──────────────────────────────────────────────── */}
      <header
        style={{
          gridArea: 'header',
          height: '52px',
          background: 'var(--affine-background-primary-color)',
          border: '1px solid var(--affine-border-color)',
          borderRadius: '12px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 100,
          userSelect: 'none',
        }}
      >
        {/* Left: Title + composite sidebar mode switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 0,
          }}
        >
          {/* Left Sidebar Toggle Button with T icon right next to sidebar icon */}
          <button
            data-testid="left-sidebar-toggle-btn"
            className={`header-action-btn ${leftSidebarMode === 'topics' ? 'present-btn-active' : ''}`}
            onClick={toggleSidebarMode}
            data-tooltip={
              leftSidebarMode === 'video'
                ? 'Switch to Topics Sidebar (T)'
                : 'Switch to Video Grid'
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3.5" stroke="currentColor" strokeWidth="2.2" />
              <line x1="9.5" y1="3" x2="9.5" y2="21" stroke="currentColor" strokeWidth="2.2" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'currentColor', lineHeight: 1 }}>T</span>
          </button>
          <span
            style={{
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--affine-text-primary-color)',
              marginLeft: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '240px',
            }}
          >
            {activeWorkspace?.docCollection.meta.docMetas.find(
              m => m.id === room.docId
            )?.title || 'How to use folder and Tags'}
          </span>
          <button
            className="meeting-tag"
            onClick={() => setShowInfoModal(true)}
            data-tooltip="Click to view Meeting Details & Info"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              background: 'var(--affine-hover-color, rgba(120, 169, 255, 0.1))',
              border: '1px solid var(--affine-border-color, rgba(120, 169, 255, 0.2))',
              padding: '3px 9px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--affine-text-primary-color)',
              transition: 'all 0.2s ease',
              marginLeft: '4px',
            }}
          >
            <span>Info</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        </div>

        {/* Center: Connection + Attendees + Timer */}
        <div
          className="header-center"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div className="status-badge">
            <span
              className={`pulse-dot ${!isOnline ? 'pulse-dot-red' : !connected ? 'pulse-dot-yellow' : 'pulse-dot-green'}`}
            />
            <span>
              {!isOnline ? 'Disconnected' : connected ? 'Connected' : 'Connecting...'}
            </span>
            <span className="status-divider">|</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{attendingCount} attending</span>
            <span className="telemetry-tag">
              {(() => {
                const hrs = Math.floor(meetingSeconds / 3600).toString().padStart(2, '0');
                const mins = Math.floor((meetingSeconds % 3600) / 60).toString().padStart(2, '0');
                const secs = (meetingSeconds % 60).toString().padStart(2, '0');
                return `${hrs}:${mins}:${secs}`;
              })()}
            </span>
          </div>
        </div>

        {/* Right: Theme Toggle + Join requests + End/Exit + Toggle Right Sidebar */}
        <div className="header-right">
          {/* Theme switcher toggle matching template.html */}
          <button
            className="theme-toggle-btn"
            data-tooltip="Toggle Dark / Light Mode"
            onClick={() => {
              setIsDarkMode(prev => {
                const next = !prev;
                setTheme(next ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark-theme', next);
                document.documentElement.classList.toggle('dark', next);
                document.body.classList.toggle('dark-theme', next);
                document.body.classList.toggle('dark', next);
                return next;
              });
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          {/* Waiting guests avatar button matching template.html */}
          {isHost && (
            <div ref={joinRequestsRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setJoinRequestsPanelOpen(prev => !prev)}
                className="user-avatar-btn"
                data-tooltip={pendingJoinRequests.length > 0 ? `Join Requests (${pendingJoinRequests.length})` : 'Invite & Admit Participants'}
              >
                <span className="admit-icon-bg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </span>
                {pendingJoinRequests.length > 0 && (
                  <span className="join-requests-badge">
                    {pendingJoinRequests.length}
                  </span>
                )}
                {/* Dropdown caret SVG from template.html */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginLeft: '4px' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Dropdown panel with click-away backdrop */}
              {joinRequestsPanelOpen && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 998,
                      background: 'transparent',
                    }}
                    onClick={() => setJoinRequestsPanelOpen(false)}
                  />
                  <div className="join-requests-dropdown" style={{ zIndex: 999 }}>
                    <div className="join-requests-dropdown-header" style={{ padding: pendingJoinRequests.length > 0 ? '10px 14px' : '14px 16px' }}>
                      {pendingJoinRequests.length === 0 ? (
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--affine-text-primary-color)' }}>
                          No pending requests
                        </span>
                      ) : (
                        <button
                          className="join-req-accept-all"
                          onClick={() => {
                            pendingJoinRequests.forEach(req => wsService.approveJoin(room.id, req.sessionId));
                          }}
                        >
                          Accept All ({pendingJoinRequests.length})
                        </button>
                      )}
                    </div>

                    {pendingJoinRequests.length === 0 ? (
                      <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--affine-text-secondary-color)' }}>
                        All caught up! No one is waiting.
                      </div>
                    ) : (
                      <div className="join-requests-list">
                        {pendingJoinRequests.map(req => (
                          <div key={req.sessionId} className="join-request-row">
                            <div className="join-request-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {req.avatar ? (
                                <img src={req.avatar} alt={req.guestName} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                req.guestName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="join-request-name">{req.guestName}</span>
                            <div className="join-request-actions">
                              <button className="join-req-approve" onClick={() => wsService.approveJoin(room.id, req.sessionId)}>Approve</button>
                              <button className="join-req-deny" onClick={() => wsService.rejectJoin(room.id, req.sessionId)}>Deny</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* End Meeting button matching template.html */}
          {isHost ? (
            <button onClick={() => setConfirmEndOpen(true)} className="end-meeting-btn" data-tooltip="End Meeting Room for Everyone">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
              </svg>
              End Meeting
            </button>
          ) : (
            <button onClick={() => setConfirmExitOpen(true)} className="present-btn-exit" data-tooltip="Exit Room">
              Exit
            </button>
          )}

          {/* Right Sidebar toggle matching template.html */}
          <button
            data-testid="right-sidebar-toggle-btn"
            onClick={() => {
              const nextState = !rightSidebarOpen;
              setRightSidebarOpen(nextState);
              if (nextState) {
                setUnreadChatCount(0);
                if (activeRoomId && wsService?.requestChatHistory) {
                  wsService.requestChatHistory(activeRoomId, sessionId);
                }
              }
            }}
            className={`header-action-btn ${rightSidebarOpen ? 'present-btn-active' : ''}`}
            data-tooltip={unreadChatCount > 0 ? `Toggle Chat & AI Assistant (${unreadChatCount} new message${unreadChatCount > 1 ? 's' : ''})` : 'Toggle Chat & AI Assistant'}
            style={{ position: 'relative' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3.5" stroke="currentColor" strokeWidth="2.2" />
              <line x1="14.5" y1="3" x2="14.5" y2="21" stroke="currentColor" strokeWidth="2.2" />
            </svg>
            {unreadChatCount > 0 && (
              <span
                className="chat-unread-badge"
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#0f62fe',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(15, 98, 254, 0.45)',
                  border: '1.5px solid var(--affine-background-primary-color, #ffffff)',
                  lineHeight: 1,
                  pointerEvents: 'none',
                }}
              >
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </header>

        {/* Left Sidebar — Video ↔ Topics */}
        <aside
          className="present-sidebar-left"
          style={{
            gridArea: 'sidebar',
            width: leftSidebarMode ? '320px' : '0px',
            background: 'var(--affine-background-primary-color)',
            border: '1px solid var(--affine-border-color)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
            flexShrink: 0,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: '14px',
              gap: '14px',
              boxSizing: 'border-box',
              overflow: 'visible',
              minHeight: 0,
            }}
          >
            <ControlsBar
              isMicOn={isMicOn}
              isCamOn={isCamOn}
              isHost={isHost}
              isSharedMode={isSharedMode}
              guestName={guestName}
              account={account}
              toggleMic={toggleMic}
              toggleCam={toggleCam}
              toggleScreenShare={toggleScreenShare}
              isSharingScreen={isSharingScreen}
              forceMutedAudio={forceMutedAudio}
              forceMutedVideo={forceMutedVideo}
              forceMutedScreen={forceMutedScreen}
              mediaPerms={mediaPerms}
              room={room!}
              sessionId={sessionId}
              wsService={wsService}
              audioInputs={audioInputs}
              videoInputs={videoInputs}
              audioOutputs={audioOutputs}
              selectedAudioInput={selectedAudioInput}
              setSelectedAudioInput={setSelectedAudioInput}
              selectedVideoInput={selectedVideoInput}
              setSelectedVideoInput={setSelectedVideoInput}
              onSwitchCamera={handleCameraSwitch}
              activeVirtualBg={activeVirtualBg}
              setActiveVirtualBg={setActiveVirtualBg}
              setCustomBgImage={setCustomBgImage}
              localAudioTrackRef={localAudioTrackRef}
              localVideoTrackRef={localVideoTrackRef}
              selfViewVideoRef={selfViewVideoRef}
              refreshDevices={refreshDevices}
              isAiNoiseSuppressionOn={isAiNoiseSuppressionOn}
              isAiNoiseSuppressionActive={isAiNoiseSuppressionActive}
              setIsAiNoiseSuppressionActive={setIsAiNoiseSuppressionActive}
              isEchoCancellationOn={isEchoCancellationOn}
              setIsEchoCancellationOn={setIsEchoCancellationOn}
              isAutomaticGainControlOn={isAutomaticGainControlOn}
              setIsAutomaticGainControlOn={setIsAutomaticGainControlOn}
              isNoiseSuppressionOn={isNoiseSuppressionOn}
              setIsNoiseSuppressionOn={setIsNoiseSuppressionOn}
              setIsAiNoiseSuppressionOn={setIsAiNoiseSuppressionOn}
              pipUserUid={pipUserUid}
              setPipUserUid={setPipUserUid}
              localUid={localUid}
              onDisabledMediaClick={handleDisabledMediaClick}
            />

            <VideoGrid
              leftSidebarMode={leftSidebarMode}
              isSidebarSwitching={isSidebarSwitching}
              agoraError={agoraError}
              sortedRemoteUsers={sortedRemoteUsers}
              activeMainScreenShareUid={activeMainScreenShareUid}
              setActiveMainScreenShareUid={setActiveMainScreenShareUid}
              resolveUserName={resolveUserName}
              stableSpeakingUids={stableSpeakingUids}
              loudSpeakingUids={loudSpeakingUids}
              pinnedSessionIds={pinnedSessionIds}
              setPinnedSessionIds={setPinnedSessionIds}
              isHost={isHost}
              room={room!}
              sessionId={sessionId}
              roomState={roomState}
              wsService={wsService}
              setIsHoveringTopics={setIsHoveringTopics}
              topicsTimerValue={topicsTimerValue}
              onFrameContainerReady={onFrameContainerReady}
              handleTopicsScroll={handleTopicsScroll}
              followingSessionId={followingSessionId}
              setFollowingSessionId={handleSetFollowing}
              pipUserUid={pipUserUid}
              setPipUserUid={setPipUserUid}
            />
          </div>
        </aside>

        {/* Editor Canvas — Edgeless view, full features */}
        <main
          className={isCanvasScanning ? 'canvas-scanning-active' : ''}
          style={{
            gridArea: 'main',
            background: 'var(--affine-background-primary-color)',
            border: '1px solid var(--affine-border-color)',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* Active Screen Share View Overlay — Replaces Canvas when Viewing Remote Screen Share */}
          {activeScreenShareUser && !activeScreenShareUser.isLocal && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 100,
                background: '#090d16',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Floating Screen Share Banner for Remote Screen Share */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 110,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '6px 18px',
                  borderRadius: '24px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  pointerEvents: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 8px #22c55e' }} />
                  <span>
                    {`${resolveUserName(activeScreenShareUser.uid).name} is sharing screen`}
                  </span>
                </div>
                <button
                  onClick={() => setActiveMainScreenShareUid(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Minimize
                </button>
              </div>

              {/* Main Remote Screen Share Video Container */}
              <div
                id="agora-main-screenshare-viewport"
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                ref={el => {
                  if (el && activeScreenShareUser.track) {
                    try {
                      const track = activeScreenShareUser.track;
                      const trackId = track.getTrackId?.() || String(activeScreenShareUser.uid);
                      if (el.dataset.playingTrackId !== trackId) {
                        el.dataset.playingTrackId = trackId;
                        el.innerHTML = '';
                        track.play(el);
                      }
                    } catch (e) {
                      console.warn('[Agora] Screen share main video play error:', e);
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Floating Screen Share Pill for Local Presenter Sharing Screen (Canvas remains 100% visible & interactive) */}
          {activeScreenShareUser && activeScreenShareUser.isLocal && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 110,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '6px 18px',
                borderRadius: '24px',
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                pointerEvents: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 8px #22c55e' }} />
                <span>You are sharing your screen</span>
              </div>
              <button
                onClick={toggleScreenShare}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                }}
              >
                Stop Sharing
              </button>
            </div>
          )}

          {/* Pure Low-Opacity Watermark Text with Subtitle matching template.html */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '20px',
              zIndex: 10,
              pointerEvents: 'none',
              opacity: 0.55,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              userSelect: 'none',
              background: 'none',
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <div
              style={{
                color: 'var(--affine-text-secondary-color, #8e8e93)',
                fontWeight: 600,
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)',
                letterSpacing: '0.8px',
              }}
            >
              INTOAI | Canvas-LAB
            </div>
            <div
              style={{
                color: 'var(--text-muted, #94a3b8)',
                fontWeight: 400,
                fontSize: '10px',
                fontFamily: 'var(--font-sans, sans-serif)',
                letterSpacing: '-0.1px',
              }}
            >
              Advanced interactive whiteboard system.
            </div>
          </div>

          {/* Bottom Left Zoom Navigation Capsule Bar matching workspace screenshot */}
          <div ref={zoomBarRef} className={`bottom-left-zoom-bar ${isZoomBarVertical ? 'vertical' : ''}`}>

            {/* Fit to screen / zoom to fit button */}
            <button
              className="zoom-bar-btn btn-fit-screen"
              data-tooltip="Fit to Screen"
              onClick={() => {
                const doFitToScreen = () => {
                  try {
                    const root = (document.querySelector('affine-edgeless-root') || document.querySelector('affine-page-root')) as any;
                    if (!root) return;

                    let success = false;

                    // Strategy 1: BlockSuite GfxController fitToScreen API (Official BlockSuite API)
                    if (root.gfx && typeof root.gfx.fitToScreen === 'function') {
                      root.gfx.fitToScreen({ smooth: true });
                      success = true;
                    } else if (root.service?.gfx && typeof root.service.gfx.fitToScreen === 'function') {
                      root.service.gfx.fitToScreen({ smooth: true });
                      success = true;
                    }

                    // Strategy 2: BlockSuite native viewport API
                    const viewport = root.gfx?.viewport || root.service?.viewport || root.viewport;
                    if (!success && viewport) {
                      if (typeof viewport.zoomToFit === 'function') {
                        viewport.zoomToFit();
                        success = true;
                      } else if (typeof viewport.fitToScreen === 'function') {
                        viewport.fitToScreen();
                        success = true;
                      }
                    }

                    // Strategy 3: BlockSuite std command exec 'zoomToFit'
                    if (!success && root.std?.command) {
                      try {
                        root.std.command.exec('zoomToFit');
                        success = true;
                      } catch (_) {}
                    }

                    // Strategy 4: Keyboard shortcut dispatch (Shift+1 / Alt+1 / Cmd+1)
                    if (!success) {
                      try {
                        root.dispatchEvent(new KeyboardEvent('keydown', { key: '1', code: 'Digit1', shiftKey: true, bubbles: true }));
                        root.dispatchEvent(new KeyboardEvent('keydown', { key: '1', code: 'Digit1', altKey: true, bubbles: true }));
                      } catch (_) {}
                    }

                    // Strategy 5: Target BlockSuite's native zoom toolbar widget in shadow DOM
                    if (!success) {
                      const widgets = Array.from(document.querySelectorAll('affine-edgeless-zoom-toolbar-widget, .edgeless-zoom-toolbar-container'));
                      const shadowWidgets = root.shadowRoot ? Array.from(root.shadowRoot.querySelectorAll('affine-edgeless-zoom-toolbar-widget, .edgeless-zoom-toolbar-container')) : [];
                      const allWidgets = [...widgets, ...shadowWidgets];

                      for (const w of allWidgets as any[]) {
                        const sr = w.shadowRoot || w;
                        const btn = sr.querySelector('edgeless-tool-icon-button') || sr.querySelector('[aria-label*="Fit"]');
                        if (btn) {
                          const target = (btn.shadowRoot ? btn.shadowRoot.querySelector('.icon-container') : null) || btn;
                          target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
                          success = true;
                          break;
                        }
                      }
                    }

                    // Strategy 6: Fallback to 100% zoom scale
                    if (!success && viewport && typeof viewport.setZoom === 'function') {
                      viewport.setZoom(1.0);
                      success = true;
                    }

                    // Update displayed zoom percentage badge after fitting
                    setTimeout(() => {
                      const activeVp = root.gfx?.viewport || root.service?.viewport || root.viewport;
                      if (activeVp && typeof activeVp.zoom === 'number') {
                        setZoomPercent(Math.round(activeVp.zoom * 100));
                      }
                    }, 100);
                  } catch (err) {
                    console.error('Fit to screen failed:', err);
                  }
                };

                if (followingSessionId) {
                  setPendingFrameClickTarget(() => doFitToScreen);
                } else {
                  doFitToScreen();
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ userSelect: 'none', flexShrink: 0 }}>
                <path fill="currentColor" fillRule="evenodd" d="M3.25 20a.75.75 0 0 1-.75-.75V4.75a.75.75 0 0 1 1.5 0v14.5a.75.75 0 0 1-.75.75M9.665 8.44a.75.75 0 0 1 .062 1.058L8.17 11.25h7.66l-1.557-1.752a.75.75 0 0 1 1.12-.996l2.668 3a.75.75 0 0 1 0 .996l-2.667 3a.75.75 0 1 1-1.121-.996l1.557-1.752H8.17l1.557 1.752a.75.75 0 0 1-1.12.996l-2.668-3a.75.75 0 0 1 0-.996l2.667-3a.75.75 0 0 1 1.059-.063M21.5 4.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Zoom Out Button (-) */}
            <button
              className="zoom-bar-btn btn-zoom-out"
              data-tooltip="Zoom Out"
              onClick={() => {
                try {
                  const root = document.querySelector('affine-edgeless-root') as any;
                  const vp = root?.gfx?.viewport || root?.service?.viewport;
                  if (vp) {
                    const currentZoom = vp.zoom || 1;
                    vp.setZoom(Math.max(0.1, currentZoom - 0.1));
                    setZoomPercent(Math.round(Math.max(0.1, currentZoom - 0.1) * 100));
                  }
                } catch (_) {}
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="12" x2="20" y2="12" />
              </svg>
            </button>

            {/* Zoom Percentage Label (Reset to 100%) */}
            <button
              className="zoom-bar-percent"
              data-tooltip="Reset Zoom (100%)"
              onClick={() => {
                try {
                  const root = document.querySelector('affine-edgeless-root') as any;
                  const vp = root?.gfx?.viewport || root?.service?.viewport;
                  if (vp) {
                    vp.setZoom(1.0);
                    setZoomPercent(100);
                  }
                } catch (_) {}
              }}
            >
              {zoomPercent}%
            </button>

            {/* Zoom In Button (+) */}
            <button
              className="zoom-bar-btn btn-zoom-in"
              data-tooltip="Zoom In"
              onClick={() => {
                try {
                  const root = document.querySelector('affine-edgeless-root') as any;
                  const vp = root?.gfx?.viewport || root?.service?.viewport;
                  if (vp) {
                    const currentZoom = vp.zoom || 1;
                    vp.setZoom(Math.min(3.0, currentZoom + 0.1));
                    setZoomPercent(Math.round(Math.min(3.0, currentZoom + 0.1) * 100));
                  }
                } catch (_) {}
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="4" x2="12" y2="20" />
                <line x1="4" y1="12" x2="20" y2="12" />
              </svg>
            </button>
          </div>


          {/* Top-Right Screenshare Notifications Stack */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 99999,
              alignItems: 'flex-end',
            }}
          >
            {ssNotifications.length > 0 && (
              <button
                onClick={() => setSsNotifications([])}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '4px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Clear All
              </button>
            )}

            {ssNotifications.map(notification => {
              if (notification.type === 'disabled_media') {
                return (
                  <div
                    key={notification.id}
                    style={{
                      background: 'var(--affine-background-primary-color, #1a1d24)',
                      border: '1px solid var(--affine-border-color, rgba(239, 68, 68, 0.35))',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: 'var(--affine-text-primary-color)',
                      animation: 'agoraSlideInFromRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
                      maxWidth: '240px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--affine-text-primary-color)', lineHeight: 1.2 }}>
                        {notification.mediaType || 'Media'} Disabled
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--affine-text-secondary-color)', lineHeight: 1.2, marginTop: '2px' }}>
                        Disabled by host
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSsNotifications(prev => prev.filter(n => n.id !== notification.id));
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--affine-text-secondary-color)',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                );
              }

              if (notification.type === 'announcement') {
                return (
                  <div
                    key={notification.id}
                    style={{
                      background: 'var(--affine-background-primary-color)',
                      border: '1px solid var(--affine-border-color)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      color: 'var(--affine-text-primary-color)',
                      animation: 'agoraSlideInFromRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
                      minWidth: '260px',
                      maxWidth: '340px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--affine-brand-color, #1e88e5)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0 }}
                      >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--affine-text-primary-color)', letterSpacing: '-0.1px' }}>
                        Presenter Announcement
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--affine-text-secondary-color)', margin: 0, lineHeight: 1.4, textAlign: 'left' }}>
                      {notification.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button
                        onClick={() => {
                          setSsNotifications(prev => prev.filter(n => n.id !== notification.id));
                        }}
                        style={{
                          background: 'var(--affine-hover-color)',
                          color: 'var(--affine-text-primary-color)',
                          border: '1px solid var(--affine-border-color)',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={notification.id}
                  style={{
                    background: 'var(--affine-background-primary-color)',
                    border: '1px solid var(--affine-border-color)',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'var(--affine-text-primary-color)',
                    animation:
                      'agoraSlideInFromRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
                    minWidth: '260px',
                    maxWidth: '340px',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--affine-brand-color, #1e88e5)',
                        boxShadow: '0 0 8px var(--affine-brand-color, #1e88e5)',
                        animation: 'agoraPulseGlow 1.5s infinite',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 550,
                        color: 'var(--affine-text-primary-color)',
                        textAlign: 'left',
                        marginRight: '8px',
                      }}
                    >
                      Follow {notification.userName}'s screen share?
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <button
                      onClick={() => {
                        setActiveMainScreenShareUid(notification.uid!);
                        setSsNotifications(prev =>
                          prev.filter(n => n.id !== notification.id)
                        );
                      }}
                      style={{
                        background: 'var(--affine-brand-color, #1e88e5)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(30, 136, 229, 0.2)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      Follow
                    </button>
                    <button
                      onClick={() => {
                        setSsNotifications(prev =>
                          prev.filter(n => n.id !== notification.id)
                        );
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--affine-text-secondary-color)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--affine-text-primary-color)';
                        e.currentTarget.style.background =
                          'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--affine-text-secondary-color)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {activeMainScreenShareUid !== null ? (
            <div
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: '#0a0a0c',
                position: 'relative',
              }}
            >
              {/* Header with Resolved Name and Close button */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  right: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  zIndex: 10,
                  background: 'var(--affine-background-primary-color, #161b22)',
                  border: '1px solid var(--affine-border-color)',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  color: '#ffffff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span style={{ letterSpacing: '0.2px' }}>
                    Viewing Screen Share:{' '}
                    {(() => {
                      if (activeMainScreenShareUid >= 100000) {
                        return resolveUserName(activeMainScreenShareUid).name;
                      } else {
                        return 'Your Screen Share';
                      }
                    })()}
                  </span>
                </div>
                <button
                  onClick={() => setActiveMainScreenShareUid(null)}
                  style={{
                    background: 'var(--affine-brand-color, #1e88e5)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 14px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(30, 136, 229, 0.25)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Close Presentation View
                </button>
              </div>

              {/* Screenshare player container with active track player */}
              <div
                id="agora-main-screenshare-viewport"
                style={{
                  flex: 1,
                  width: '100%',
                  height: '100%',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#090d16',
                }}
                ref={el => {
                  if (el) {
                    const isLocalScreen = Number(activeMainScreenShareUid) === (Number(localUid) + 100000) || isSharingScreen;
                    if (isLocalScreen) {
                      if (localScreenTrackRef.current) {
                        const trackId = localScreenTrackRef.current.getTrackId?.() || 'local-screen';
                        if (el.dataset.playingTrackId !== trackId) {
                          el.dataset.playingTrackId = trackId;
                          el.innerHTML = '';
                          try {
                            localScreenTrackRef.current.play(el, { fit: 'contain' });
                            const vid = el.querySelector('video');
                            if (vid) {
                              vid.style.objectFit = 'contain';
                              vid.disablePictureInPicture = true;
                            }
                          } catch (e) {
                            console.error('[Agora] Play local screen error:', e);
                          }
                        }
                      }
                    } else {
                      const user = remoteUsers.find(
                        (u: any) => Number(u.uid) === Number(activeMainScreenShareUid)
                      );
                      if (user && user.videoTrack) {
                        const trackId = user.videoTrack.getTrackId?.() || String(user.uid);
                        if (el.dataset.playingTrackId !== trackId) {
                          el.dataset.playingTrackId = trackId;
                          el.innerHTML = '';
                          try {
                            user.videoTrack.play(el, { fit: 'contain' });
                            const vid = el.querySelector('video');
                            if (vid) {
                              vid.style.objectFit = 'contain';
                              vid.disablePictureInPicture = true;
                            }
                          } catch (e) {
                            console.error('[Agora] Play remote screen error:', e);
                          }
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          ) : page && editor && editor.scope ? (
            <FrameworkScope scope={editor.scope}>
              <BlockSuiteEditor
                style={{ flex: 1, height: '100%', width: '100%' }}
                mode="edgeless"
                page={page.blockSuiteDoc}
                shared={false}
                readonly={shouldLock}
                onEditorReady={(edContainer) => setEditorContainer(edContainer)}
              />
            </FrameworkScope>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              <WaitingIllustrationImage />
            </div>
          )}

          {/* macOS-style Terminal Overlay (Visible to presenter and viewers) */}
          <ShellConsole
            isTerminalOpen={isTerminalOpen}
            isHost={isHost}
            isTerminalFocused={isTerminalFocused}
            toggleTerminal={toggleTerminal}
            termRef={termRef}
            termInstanceRef={termInstanceRef}
          />

          {/* Synchronized Browser Panel */}
          <IframeBrowser
            isBrowserOpen={isBrowserOpen}
            isHost={isHost}
            isTerminalOpen={isTerminalOpen}
            browserInputUrl={browserInputUrl}
            setBrowserInputUrl={setBrowserInputUrl}
            browserUrl={browserUrl}
            roomId={activeRoomId}
            sessionId={sessionId}
            wsService={wsService}
            toggleBrowser={toggleBrowser}
            isEnlarged={isBrowserEnlarged}
            toggleEnlarge={() => {
              setIsBrowserEnlarged(prev => !prev);
              if (isHost) {
                sendBrowserCommand('toggle_browser_enlarge', null);
              }
            }}
          />


          {/* Right Floating Utility Capsule Stack (Terminal, Browser, Navigate, Notify) - HOST ONLY */}
          {isHost && (
            <div className="right-floating-widget">
              {/* 1. Terminal Console */}
              <button
                className={`widget-btn ${isTerminalOpen ? 'active' : ''}`}
                onClick={toggleTerminal}
                data-tooltip={isTerminalOpen ? 'Close Shell Terminal' : 'Open Shell Terminal'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </button>

              {/* 2. Synchronized Browser */}
              <button
                className={`widget-btn ${isBrowserOpen ? 'active' : ''}`}
                onClick={toggleBrowser}
                data-tooltip={isBrowserOpen ? 'Close Synchronized Browser' : 'Open Synchronized Browser'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </button>

              {/* 3. Remote Navigation & Action Console */}
              <button
                className={`widget-btn ${isExecutionModalOpen ? 'active' : ''}`}
                onClick={() => setIsExecutionModalOpen(true)}
                data-tooltip="Remote Command & Navigation Console"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                  <path d="M13 13l6 6" />
                </svg>
              </button>

              {/* 4. Broadcast Announcement / Notification */}
              <button
                className={`widget-btn ${isAnnouncementModalOpen ? 'active' : ''}`}
                onClick={() => setIsAnnouncementModalOpen(true)}
                data-tooltip="Broadcast Announcement"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            </div>
          )}
        </main>

        {/* Right Sidebar — Chat, AI Assistant & Translation */}
        {page && page.scope ? (
          <FrameworkScope scope={page.scope}>
            <ChatSidebar
              rightSidebarOpen={rightSidebarOpen}
              activeRightTab={activeRightTab}
              setActiveRightTab={setActiveRightTab}
              chatMessages={chatMessages}
              translationMessages={translationMessages}
              isTranscribing={isTranscribing}
              sessionId={sessionId}
              isHost={isHost}
              members={members}
              room={room}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendChat={handleSendChat}
              geminiMessages={geminiMessages}
              geminiLoading={geminiLoading}
              geminiError={geminiError}
              geminiInput={geminiInput}
              setGeminiInput={setGeminiInput}
              handleSendGemini={handleSendGemini}
              handleSendGeminiPrompt={(prompt: string, displayLabel?: string) => {
                setIsCanvasScanning(true);
                handleSendGemini(prompt, displayLabel);
              }}
              setRightSidebarOpen={setRightSidebarOpen}
              unreadChatCount={unreadChatCount}
              editor={editorContainer || editor}
              wsService={wsService}
              mediaPerms={mediaPerms}
              onToggleTranslation={(enabled: boolean) => {
                if (room?.id) {
                  wsService.updateMediaPermissions(room.id, sessionId, {
                    ...mediaPerms,
                    allowTranslation: enabled,
                    allowGuestTranslation: enabled,
                  });
                }
              }}
            />
          </FrameworkScope>
        ) : (
          <ChatSidebar
            rightSidebarOpen={rightSidebarOpen}
            activeRightTab={activeRightTab}
            setActiveRightTab={setActiveRightTab}
            chatMessages={chatMessages}
            translationMessages={translationMessages}
            isTranscribing={isTranscribing}
            sessionId={sessionId}
            isHost={isHost}
            members={members}
            room={room}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendChat={handleSendChat}
            geminiMessages={geminiMessages}
            geminiLoading={geminiLoading}
            geminiError={geminiError}
            geminiInput={geminiInput}
            setGeminiInput={setGeminiInput}
            handleSendGemini={handleSendGemini}
            handleSendGeminiPrompt={(prompt: string, displayLabel?: string) => {
              setIsCanvasScanning(true);
              handleSendGemini(prompt, displayLabel);
            }}
            setRightSidebarOpen={setRightSidebarOpen}
            unreadChatCount={unreadChatCount}
            editor={editorContainer || editor}
            wsService={wsService}
            mediaPerms={mediaPerms}
            onToggleTranslation={(enabled: boolean) => {
              if (room?.id) {
                wsService.updateMediaPermissions(room.id, sessionId, {
                  ...mediaPerms,
                  allowTranslation: enabled,
                  allowGuestTranslation: enabled,
                });
              }
            }}
          />
        )}

      {/* ─── End Meeting Confirmation (host only) ─────────────────── */}
      {confirmEndOpen && (
        <div className="present-modal-overlay">
          <div className="present-modal-container">
            <p className="present-modal-title">End Presentation Meeting</p>
            <p className="present-modal-body">
              Are you sure you want to end this presentation room? All attendees
              will be disconnected and all temporary changes will be discarded.
            </p>
            <div className="present-modal-actions">
              <button
                className="present-btn-exit"
                onClick={() => setConfirmEndOpen(false)}
              >
                Cancel
              </button>
              <button
                className="present-btn-danger"
                onClick={handleEndRoomConfirm}
              >
                End Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Exit Confirmation (both host if not host and guest) ──── */}
      {confirmExitOpen && (
        <div className="present-modal-overlay">
          <div className="present-modal-container">
            <p className="present-modal-title">Exit Presentation</p>
            <p className="present-modal-body">
              Are you sure you want to leave this presentation room?
            </p>
            <div className="present-modal-actions">
              <button
                className="present-btn-exit"
                onClick={() => setConfirmExitOpen(false)}
              >
                Stay
              </button>
              <button
                className="present-btn-confirm"
                onClick={handleLeaveRoomConfirm}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Picture-in-Picture Video Window (Draggable anywhere on canvas) */}
      {pipUserUid !== null && (
        <div
          className="agora-pip-floating-window"
          style={{
            position: 'fixed',
            ...(pipPosition
              ? { left: `${pipPosition.x}px`, top: `${pipPosition.y}px` }
              : { bottom: '84px', right: '24px' }),
            width: '280px',
            height: '168px',
            borderRadius: '12px',
            background: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            touchAction: 'none',
          }}
        >
          <div
            onPointerDown={handlePipPointerDown}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'grab',
              userSelect: 'none',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              {resolveUserName(pipUserUid).name}
            </span>
            <button
              onClick={() => {
                setPipUserUid(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
              }}
              data-tooltip="Return to Sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div
            style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}
            ref={el => {
              if (el) {
                if (pipUserUid === localUid) {
                  if (localVideoTrackRef.current) {
                    const trackId = localVideoTrackRef.current.getTrackId?.() || 'local';
                    if (el.dataset.playingTrackId !== trackId) {
                      el.dataset.playingTrackId = trackId;
                      el.innerHTML = '';
                      try { localVideoTrackRef.current.play(el); } catch (_) {}
                      const vid = el.querySelector('video');
                      if (vid) vid.disablePictureInPicture = true;
                    }
                  }
                } else {
                  const u = remoteUsers.find(user => Number(user.uid) === Number(pipUserUid));
                  if (u && u.videoTrack) {
                    const trackId = u.videoTrack.getTrackId?.() || String(u.uid);
                    if (el.dataset.playingTrackId !== trackId) {
                      el.dataset.playingTrackId = trackId;
                      el.innerHTML = '';
                      try { u.videoTrack.play(el); } catch (_) {}
                      const vid = el.querySelector('video');
                      if (vid) vid.disablePictureInPicture = true;
                    }
                  }
                }
              }
            }}
          />
        </div>
      )}

      {/* ─── Room Ended notice ────────────────────────────────────── */}
      {roomEndedModalOpen && (
        <div className="present-modal-overlay">
          <div className="present-modal-container">
            <p className="present-modal-title">Presentation Ended</p>
            <p className="present-modal-body">
              The presenter has ended this live presentation room.
            </p>
            <div className="present-modal-actions">
              <button
                className="present-btn-confirm"
                onClick={async () => {
                  setRoomEndedModalOpen(false);
                  // Release the guest room lock
                  sessionStorage.removeItem('presentation_room_path');
                  if (activeWorkspace && room) {
                    const tempDocId = `temp-${room.id}`;
                    try {
                      activeWorkspace.docCollection.removeDoc(tempDocId);
                    } catch (err) {
                      console.error('Failed to remove temp doc on end', err);
                    }
                  }
                  const isGuest =
                    !account ||
                    account.email?.endsWith('@guest.presentation') ||
                    account.email?.includes('@guest') ||
                    account.email?.includes('guest.') ||
                    !!sessionStorage.getItem('guest_name');

                  if (isGuest) {
                    try {
                      await authService.signOut();
                    } catch (_) {}
                    sessionStorage.clear();
                    window.location.href = window.location.origin;
                  } else {
                    window.location.href = window.location.origin;
                  }
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Kicked notice ────────────────────────────────────── */}
      {kicked && (
        <div className="present-modal-overlay">
          <div className="present-modal-container">
            <p className="present-modal-title">Removed from Meeting</p>
            <p className="present-modal-body">
              You have been removed from the presentation meeting by the host.
            </p>
            <div className="present-modal-actions">
              <button
                className="present-btn-confirm"
                onClick={async () => {
                  // Release the guest room lock
                  sessionStorage.removeItem('presentation_room_path');
                  if (activeWorkspace && room) {
                    const tempDocId = `temp-${room.id}`;
                    try {
                      activeWorkspace.docCollection.removeDoc(tempDocId);
                    } catch (err) {
                      console.error('Failed to remove temp doc on kick', err);
                    }
                  }
                  // Sign out the guest session cookie to prevent stale 500 errors
                  if (account?.email?.endsWith('@guest.presentation')) {
                    try {
                      await authService.signOut();
                    } catch (_) {}
                    window.location.href = 'https://intoai.ai';
                  } else {
                    navigate('/', { replace: true });
                  }
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Stop Following Frame Warning Modal ────────────────────── */}
      {pendingFrameClickTarget && (
        <div className="present-modal-overlay">
          <div className="present-modal-container" style={{ border: '1px solid rgba(15, 98, 254, 0.4)', boxShadow: '0 20px 60px rgba(15, 98, 254, 0.18)' }}>
            <p className="present-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <InformationFillDuotoneIcon style={{ width: 18, height: 18, color: '#0f62fe' }} /> Stop Following?
            </p>
            <p className="present-modal-body">
              You are currently following <strong>{followingName}</strong>. Performing this action will unfollow them. Are you sure you want to continue?
            </p>
            <div className="present-modal-actions">
              <button
                className="present-btn-exit"
                onClick={() => setPendingFrameClickTarget(null)}
              >
                No, Keep Following
              </button>
              <button
                className="present-btn-confirm"
                style={{ background: 'var(--affine-brand-color, #0f62fe)' }}
                onClick={handleConfirmUnfollowFrame}
              >
                Yes, Unfollow
              </button>
            </div>
          </div>
        </div>
      )}

      <NavigationGuide
        isOpen={isExecutionModalOpen}
        onClose={() => {
          setIsExecutionModalOpen(false);
          if (hasTriggeredRightSidebarActionRef.current) {
            sendBrowserCommand('close_right_sidebar', null);
            setRightSidebarOpen(false);
            hasTriggeredRightSidebarActionRef.current = false;
          }
        }}
        members={members}
        executionSelectedUsers={executionSelectedUsers}
        setExecutionSelectedUsers={setExecutionSelectedUsers}
        consoleTab={consoleTab}
        setConsoleTab={setConsoleTab}
        sendBrowserCommand={sendBrowserCommand}
      />

      <AnnouncementBroadcaster
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        members={members}
        selectedUsers={announcementSelectedUsers}
        setSelectedUsers={setAnnouncementSelectedUsers}
        executionMessage={executionMessage}
        setExecutionMessage={setExecutionMessage}
        sendBrowserCommand={sendBrowserCommand}
      />

      {/* Quick Search / Link Insertion Modal Container */}
      <QuickSearchContainer />

      {/* Meeting Information Popover Modal */}
      {showInfoModal && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000000,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setShowInfoModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2000001,
              width: '420px',
              maxWidth: '90vw',
              background: 'var(--affine-background-primary-color, #ffffff)',
              border: '1px solid var(--affine-border-color, rgba(120, 169, 255, 0.25))',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              color: 'var(--affine-text-primary-color)',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(15, 98, 254, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f62fe' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Meeting Information</h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: 'var(--affine-text-secondary-color)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              {/* Title */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Meeting Title</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--affine-text-primary-color)' }}>
                  {activeWorkspace?.docCollection.meta.docMetas.find(m => m.id === room?.docId)?.title || (room as any)?.name || (room as any)?.title || 'How to use folder and Tags'}
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Description</div>
                <div style={{ color: 'var(--affine-text-secondary-color)', lineHeight: 1.45 }}>
                  {(room?.permissions as any)?.description || (room as any)?.description || 'Interactive presentation workspace & collaborative audio session.'}
                </div>
              </div>

              {/* Start Time & End Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Start Time</div>
                  <div style={{ fontWeight: 500 }}>
                    {(() => {
                      const p = (room?.permissions as any) || {};
                      const d = p.startTime ? new Date(p.startTime) : room?.createdAt ? new Date(room.createdAt) : new Date();
                      return d && !isNaN(d.getTime()) ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleString();
                    })()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>End Time</div>
                  <div style={{ fontWeight: 500 }}>
                    {(() => {
                      const p = (room?.permissions as any) || {};
                      const d = p.endTime ? new Date(p.endTime) : null;
                      return d && !isNaN(d.getTime()) ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ongoing Session';
                    })()}
                  </div>
                </div>
              </div>

              {/* Real-time Participant Counts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--affine-background-secondary-color)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Live Active</div>
                  <div style={{ fontWeight: 700, color: 'var(--affine-brand-color, #0f62fe)', fontSize: '15px' }}>
                    {sortedRemoteUsers.length + 1} Online
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Total Invited</div>
                  <div style={{ fontWeight: 600, color: 'var(--affine-text-primary-color)' }}>
                    {(() => {
                      const effectiveRoom = liveRoomData || room;
                      if (!effectiveRoom) return '1 Participant';
                      const p = (effectiveRoom.permissions as any) || {};
                      const items = new Set<string>();

                      const add = (val: any) => {
                        if (!val) return;
                        if (typeof val === 'string') {
                          const clean = val.trim().toLowerCase();
                          if (clean) items.add(clean);
                        } else if (typeof val === 'object') {
                          const str = (val.email || val.name || val.id || val.userId || '').toString().trim().toLowerCase();
                          if (str) items.add(str);
                        }
                      };

                      const checkArray = (arr: any) => {
                        if (Array.isArray(arr)) arr.forEach(add);
                      };

                      checkArray((effectiveRoom as any).invitedEmails);
                      checkArray((effectiveRoom as any).invitedMembers);
                      checkArray((effectiveRoom as any).workspaceMembers);
                      checkArray((effectiveRoom as any).members);

                      checkArray(p.workspaceMembers);
                      checkArray(p.workspaceUsers);
                      checkArray(p.invitedMembers);
                      checkArray(p.members);
                      checkArray(p.customEmails);
                      checkArray(p.invitedEmails);
                      checkArray(p.emails);
                      checkArray(p.guestEmails);

                      const count = items.size > 0 ? items.size : ((effectiveRoom as any).invitedCount || p.invitedCount || p.totalInvitedCount || 1);
                      return `${count} Invited`;
                    })()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Timezone</div>
                  <div style={{ fontWeight: 500, fontSize: '12px' }}>
                    {(() => {
                      const tzShort = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || 'UTC';
                      return tzShort;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setShowInfoModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--affine-brand-color, #0f62fe)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

