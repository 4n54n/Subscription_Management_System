export interface RoomPermissions {
  allowGemini: boolean;
  allowVideo: boolean;
  allowAudio: boolean;
  allowScreenShare: boolean;
  allowWithoutPermission: boolean;
  allowTranslation?: boolean;
  allowGuestVideo?: boolean;
  allowGuestAudio?: boolean;
  allowGuestScreenShare?: boolean;
  allowGuestTranslation?: boolean;
  apiKey?: string;
  lockContentFor?: ('me' | 'guests')[];
  limitOutput?: boolean;
  privateChat?: boolean;
  sshHost?: string;
  sshUser?: string;
  sshPass?: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  invitedEmails?: string[];
}

export interface JoinRequest {
  sessionId: string;
  guestName: string;
  socketId: string;
  avatar?: string;
}

export interface CreateRoomInput {
  workspaceId: string;
  docId: string;
  permissions: RoomPermissions;
  geminiModel?: string;
}

export interface RoomMember {
  sessionId: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  name: string;
  content: string;
  timestamp: number;
  replyToSessionId?: string;
}

export interface TranslationMessage {
  id: string;
  roomId: string;
  sessionId: string;
  speakerName: string;
  originalText: string;
  originalLanguage?: string;
  translations: Record<string, string>;
  timestamp: number;
  isFinal?: boolean;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

