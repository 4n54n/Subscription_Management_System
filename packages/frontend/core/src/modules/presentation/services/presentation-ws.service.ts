import { LiveData, Service } from '@toeverything/infra';
import { io, Socket } from 'socket.io-client';
import { ServerService } from '../../cloud';
import type { ChatMessage, RoomMember, TranslationMessage } from '../types';

export interface JoinRequestInfo {
  sessionId: string;
  guestName: string;
  avatar?: string;
}

export interface MediaPermissions {
  allowGuestVideo: boolean;
  allowGuestAudio: boolean;
  allowGuestScreenShare: boolean;
  allowTranslation?: boolean;
  allowGuestTranslation?: boolean;
}

export class PresentationWSService extends Service {
  private socket: Socket | null = null;

  readonly connected$ = new LiveData<boolean>(false);
  readonly members$ = new LiveData<RoomMember[]>([]);
  readonly chatMessages$ = new LiveData<ChatMessage[]>([]);
  readonly translationMessages$ = new LiveData<TranslationMessage[]>([]);
  readonly geminiHistory$ = new LiveData<any[]>([]);
  readonly roomEnded$ = new LiveData<boolean>(false);
  readonly kicked$ = new LiveData<boolean>(false);
  readonly geminiReply$ = new LiveData<{
    sessionId: string;
    reply: string | null;
    disabled: boolean;
    disabledMessage?: string;
  } | null>(null);

  readonly geminiReplyChunk$ = new LiveData<{
    sessionId: string;
    chunk: string;
    done: boolean;
    disabled?: boolean;
    disabledMessage?: string;
  } | null>(null);

  /** For the HOST — queue of guests waiting for approval */
  readonly pendingJoinRequests$ = new LiveData<JoinRequestInfo[]>([]);

  /** For the GUEST — true while waiting for host approval */
  readonly joinPending$ = new LiveData<boolean>(false);

  /** For the GUEST — true if host rejected the join request */
  readonly joinRejected$ = new LiveData<boolean>(false);

  readonly roomStateSync$ = new LiveData<{
    startTime?: number;
    terminalActive: boolean;
    browserActive: boolean;
    browserUrl: string;
    browserHideUrl?: boolean;
    browserDisableClick?: boolean;
    browserBookmarks?: Array<{ id: string; title: string; url: string }>;
    mediaPermissions?: MediaPermissions;
    agoraUidMap?: Record<number, string>;
    forceMutedTypes?: Array<'audio' | 'video'>;
    forceMutedUsers?: Record<string, string[]>;
  } | null>(null);

  readonly terminalOutput$ = new LiveData<string | null>(null);
  readonly terminalHistory$ = new LiveData<string[]>([]);

  /** Live Agora UID → sessionId map, updated whenever any client joins Agora */
  readonly agoraUidMap$ = new LiveData<Record<number, string>>({});

  /** Host-controlled media permissions for guests */
  readonly mediaPermissions$ = new LiveData<MediaPermissions>({
    allowGuestVideo: true,
    allowGuestAudio: true,
    allowGuestScreenShare: false,
  });

  /** Host muted all guests of this type */
  readonly forceMuteAll$ = new LiveData<{
    type: 'audio' | 'video' | 'all';
  } | null>(null);

  /** Host lifted mute-all for this type */
  readonly forceUnmuteAll$ = new LiveData<{
    type: 'audio' | 'video' | 'all';
  } | null>(null);

  /** This client was individually force-muted by the host */
  readonly forceMute$ = new LiveData<{
    type: 'audio' | 'video' | 'screen';
    muted: boolean;
  } | null>(null);

  constructor(private readonly serverService: ServerService) {
    super();
  }

  connect(
    roomId: string,
    sessionId: string,
    options: { hostToken?: string; guestName?: string; avatar?: string; isWorkspaceUser?: boolean }
  ) {
    if (this.socket) {
      this.disconnect();
    }

    // Reset states for a clean new connection
    this.roomEnded$.setValue(false);
    this.kicked$.setValue(false);
    this.connected$.setValue(false);
    this.members$.setValue([]);
    this.chatMessages$.setValue([]);
    this.geminiReply$.setValue(null);
    this.geminiReplyChunk$.setValue(null);
    this.pendingJoinRequests$.setValue([]);
    this.joinPending$.setValue(false);
    this.joinRejected$.setValue(false);
    this.roomStateSync$.setValue(null);
    this.terminalOutput$.setValue(null);
    this.terminalHistory$.setValue([]);
    this.agoraUidMap$.setValue({});
    this.mediaPermissions$.setValue({
      allowGuestVideo: true,
      allowGuestAudio: true,
      allowGuestScreenShare: false,
    });
    this.forceMuteAll$.setValue(null);
    this.forceUnmuteAll$.setValue(null);
    this.forceMute$.setValue(null);

    const baseUrl = this.serverService.server.serverMetadata.baseUrl;
    // Connect to /presentation namespace
    this.socket = io(`${baseUrl}/presentation`, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      this.connected$.setValue(true);
      // Join room once connected
      this.socket?.emit(
        'join_room',
        {
          roomId,
          sessionId,
          hostToken: options.hostToken,
          guestName: options.guestName,
          avatar: options.avatar,
          isWorkspaceUser: options.isWorkspaceUser,
        },
        (response: any) => {
          if (response?.error) {
            console.error('Error joining presentation room:', response.error);
            if (
              response.error.includes('removed') ||
              response.error.includes('removed from this meeting') ||
              response.error.includes('kicked')
            ) {
              try {
                localStorage.setItem(`presentation_kicked_${roomId}`, 'true');
              } catch (_) {}
              this.kicked$.setValue(true);
              this.disconnect();
            }
          }
        }
      );
    });

    this.socket.on('disconnect', () => {
      this.connected$.setValue(false);
    });

    this.socket.on('member_list', (members: RoomMember[]) => {
      this.members$.setValue(members);
    });

    this.socket.on('chat_message', (message: ChatMessage) => {
      this.chatMessages$.setValue([...this.chatMessages$.value, message]);
    });

    this.socket.on('chat_history', (messages: ChatMessage[]) => {
      this.chatMessages$.setValue(messages);
    });

    this.socket.on('gemini_history', (history: any[]) => {
      const mapped = history.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: Date.now(),
      }));
      this.geminiHistory$.setValue(mapped);
    });

    this.socket.on('gemini_reply', (reply: any) => {
      this.geminiReply$.setValue(reply);
    });

    this.socket.on('gemini_reply_chunk', (chunkData: any) => {
      this.geminiReplyChunk$.setValue(chunkData);
    });

    this.socket.on('room_ended', () => {
      this.roomEnded$.setValue(true);
      this.disconnect();
    });

    // Host receives join requests from guests when allowWithoutPermission=false
    this.socket.on('join_request', (req: JoinRequestInfo) => {
      const current = this.pendingJoinRequests$.value;
      // Avoid duplicates
      if (!current.some(r => r.sessionId === req.sessionId)) {
        this.pendingJoinRequests$.setValue([...current, req]);
      }
    });

    // Guest receives this when they are awaiting host approval
    this.socket.on('join_pending', () => {
      this.joinPending$.setValue(true);
    });

    // Guest receives this when host approves them
    this.socket.on('join_approved', () => {
      this.joinPending$.setValue(false);
      this.joinRejected$.setValue(false);
    });

    // Guest receives this when host rejects them
    this.socket.on('join_rejected', () => {
      this.joinPending$.setValue(false);
      this.joinRejected$.setValue(true);
    });

    // Guest receives this when host kicks them
    this.socket.on('kicked', () => {
      try {
        localStorage.setItem(`presentation_kicked_${roomId}`, 'true');
      } catch (_) {}
      this.kicked$.setValue(true);
      this.disconnect();
    });

    this.socket.on(
      'room_state_sync',
      (state: {
        startTime?: number;
        terminalActive: boolean;
        browserActive: boolean;
        browserUrl: string;
        browserHideUrl?: boolean;
        browserDisableClick?: boolean;
        browserBookmarks?: Array<{ id: string; title: string; url: string }>;
        mediaPermissions?: MediaPermissions;
        agoraUidMap?: Record<number, string>;
        forceMutedTypes?: Array<'audio' | 'video'>;
        forceMutedUsers?: Record<string, string[]>;
      }) => {
        this.roomStateSync$.setValue(state);
        // Hydrate dedicated LiveData streams
        if (state.mediaPermissions) {
          this.mediaPermissions$.setValue(state.mediaPermissions);
        }
        if (state.agoraUidMap) {
          this.agoraUidMap$.setValue(state.agoraUidMap);
        }
      }
    );

    this.socket.on('terminal_output', (chunk: string) => {
      this.terminalOutput$.setValue(chunk);
    });

    this.socket.on('terminal_history', (history: string[]) => {
      this.terminalHistory$.setValue(history);
    });

    this.socket.on('terminal_closed', () => {
      const current = this.roomStateSync$.value;
      if (current) {
        this.roomStateSync$.setValue({
          ...current,
          terminalActive: false,
        });
      }
    });

    // Live translation message updates
    this.socket.on('live_translation_message', (msg: TranslationMessage) => {
      const current = this.translationMessages$.value || [];
      const existingIdx = current.findIndex(m => m.id === msg.id);
      if (existingIdx >= 0) {
        const updated = [...current];
        updated[existingIdx] = msg;
        this.translationMessages$.setValue(updated);
      } else {
        this.translationMessages$.setValue([...current, msg]);
      }
    });

    this.socket.on('live_translation_clear', () => {
      this.translationMessages$.setValue([]);
    });

    // Agora UID map updates (broadcast by server whenever any client announces)
    this.socket.on('agora_uid_map', (map: Record<number, string>) => {
      this.agoraUidMap$.setValue(map);
    });

    // Host updated media permissions for guests
    this.socket.on('media_permissions_update', (perms: MediaPermissions) => {
      this.mediaPermissions$.setValue(perms);
    });

    // Host muted all guests
    this.socket.on(
      'force_mute_all',
      (data: { type: 'audio' | 'video' | 'all' }) => {
        this.forceMuteAll$.setValue(data);
      }
    );

    // Host lifted mute-all
    this.socket.on(
      'force_unmute_all',
      (data: { type: 'audio' | 'video' | 'all' }) => {
        this.forceUnmuteAll$.setValue(data);
      }
    );

    // This client was individually muted by the host
    this.socket.on(
      'force_mute',
      (data: { type: 'audio' | 'video' | 'screen'; muted?: boolean }) => {
        this.forceMute$.setValue({
          type: data.type,
          muted: data.muted ?? true,
        });
      }
    );

    this.socket.connect();
  }

  sendChatMessage(
    roomId: string,
    sessionId: string,
    content: string,
    replyToSessionId?: string
  ) {
    if (this.socket?.connected) {
      this.socket.emit('chat_message', {
        roomId,
        sessionId,
        content,
        replyToSessionId,
      });
    }
  }

  requestChatHistory(roomId: string, sessionId?: string) {
    if (this.socket?.connected) {
      this.socket.emit('get_chat_history', { roomId, sessionId });
    }
  }

  sendGeminiMessage(roomId: string, sessionId: string, userMessage: string) {
    if (this.socket?.connected) {
      this.socket.emit('gemini_chat', { roomId, sessionId, userMessage });
    }
  }

  /** Host approves a pending guest */
  approveJoin(roomId: string, sessionId: string) {
    if (this.socket?.connected) {
      this.socket.emit('approve_join', { roomId, sessionId });
      // Remove from local pending list
      this.pendingJoinRequests$.setValue(
        this.pendingJoinRequests$.value.filter(r => r.sessionId !== sessionId)
      );
    }
  }

  /** Host rejects a pending guest */
  rejectJoin(roomId: string, sessionId: string) {
    if (this.socket?.connected) {
      this.socket.emit('reject_join', { roomId, sessionId });
      // Remove from local pending list
      this.pendingJoinRequests$.setValue(
        this.pendingJoinRequests$.value.filter(r => r.sessionId !== sessionId)
      );
    }
  }

  sendTerminalToggle(roomId: string, sessionId: string, open: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('terminal_toggle', { roomId, sessionId, open });
    }
  }

  sendTerminalInput(roomId: string, sessionId: string, input: string) {
    if (this.socket?.connected) {
      this.socket.emit('terminal_input', { roomId, sessionId, input });
    }
  }

  sendBrowserToggle(roomId: string, sessionId: string, open: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('browser_toggle', { roomId, sessionId, open });
    }
  }

  sendBrowserUrl(roomId: string, sessionId: string, url: string) {
    if (this.socket?.connected) {
      this.socket.emit('browser_url', { roomId, sessionId, url });
    }
  }

  sendBrowserConfig(
    roomId: string,
    sessionId: string,
    config: {
      hideUrl?: boolean;
      disableClick?: boolean;
    }
  ) {
    if (this.socket?.connected) {
      this.socket.emit('browser_config', { roomId, sessionId, ...config });
    }
  }

  sendBrowserBookmarks(
    roomId: string,
    sessionId: string,
    bookmarks: Array<{ id: string; title: string; url: string }>
  ) {
    if (this.socket?.connected) {
      this.socket.emit('browser_bookmarks', { roomId, sessionId, bookmarks });
    }
  }

  /** Each client announces their Agora UID so others can map it to their identity */
  announceAgoraUid(roomId: string, sessionId: string, agoraUid: number) {
    if (this.socket?.connected) {
      this.socket.emit('agora_uid_announce', { roomId, sessionId, agoraUid });
    }
  }

  /** Host updates media permissions for all guests */
  updateMediaPermissions(
    roomId: string,
    sessionId: string,
    perms: MediaPermissions
  ) {
    if (this.socket?.connected) {
      this.socket.emit('update_media_permissions', {
        roomId,
        sessionId,
        ...perms,
      });
    }
  }

  /** Host force-mutes all guests */
  muteAll(roomId: string, sessionId: string, type: 'audio' | 'video' | 'all') {
    if (this.socket?.connected) {
      this.socket.emit('mute_all', { roomId, sessionId, type });
    }
  }

  /** Host lifts force-mute for all guests */
  unmuteAll(
    roomId: string,
    sessionId: string,
    type: 'audio' | 'video' | 'all'
  ) {
    if (this.socket?.connected) {
      this.socket.emit('unmute_all', { roomId, sessionId, type });
    }
  }

  /** Host mutes a specific guest */
  muteUser(
    roomId: string,
    sessionId: string,
    targetSessionId: string,
    type: 'audio' | 'video' | 'screen',
    muted?: boolean
  ) {
    if (this.socket?.connected) {
      this.socket.emit('mute_user', {
        roomId,
        sessionId,
        targetSessionId,
        type,
        muted,
      });
    }
  }

  /** Host kicks a specific guest */
  kickUser(
    roomId: string,
    sessionId: string,
    targetSessionId: string
  ) {
    if (this.socket?.connected) {
      this.socket.emit('kick_user', {
        roomId,
        sessionId,
        targetSessionId,
      });
    }
  }

  /** Broadcast a speech transcription or translation chunk/message to all clients */
  sendSpeechTranscription(
    roomId: string,
    message: TranslationMessage
  ) {
    if (this.socket?.connected) {
      this.socket.emit('speech_transcription', { roomId, message });
    }
  }

  /** Host clears translation transcript history for everyone in room */
  clearTranslations(roomId: string, sessionId: string) {
    if (this.socket?.connected) {
      this.socket.emit('clear_translations', { roomId, sessionId });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected$.setValue(false);
    this.members$.setValue([]);
    this.chatMessages$.setValue([]);
    this.translationMessages$.setValue([]);
    this.geminiReply$.setValue(null);
    this.geminiReplyChunk$.setValue(null);
    this.pendingJoinRequests$.setValue([]);
    this.roomStateSync$.setValue(null);
    this.terminalOutput$.setValue(null);
    this.terminalHistory$.setValue([]);
    this.agoraUidMap$.setValue({});
    this.geminiHistory$.setValue([]);
    this.forceMuteAll$.setValue(null);
    this.forceUnmuteAll$.setValue(null);
    this.forceMute$.setValue(null);
    this.kicked$.setValue(false);
  }

  override dispose(): void {
    this.disconnect();
  }
}
