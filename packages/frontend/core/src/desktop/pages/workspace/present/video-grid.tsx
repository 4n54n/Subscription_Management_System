import React from 'react';
import { createPortal } from 'react-dom';
import { FrameIcon, PinIcon, PinedIcon, UnpinIcon } from '@blocksuite/icons/rc';
import type { PresentationRoom } from '../../../../modules/presentation/types';
import { getAvatarColor } from './present-utils';

interface VideoGridProps {
  leftSidebarMode: 'video' | 'topics';
  isSidebarSwitching: boolean;
  agoraError: string | null;
  sortedRemoteUsers: any[];
  activeMainScreenShareUid: number | null;
  setActiveMainScreenShareUid: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  resolveUserName: (uid: number) => {
    name: string;
    isHost: boolean;
    sessionId: string;
    member: any;
  };
  stableSpeakingUids: Set<number>;
  loudSpeakingUids: Set<number>;
  pinnedSessionIds: string[];
  setPinnedSessionIds: React.Dispatch<React.SetStateAction<string[]>>;
  isHost: boolean;
  room: PresentationRoom;
  sessionId: string;
  roomState: any;
  wsService: any;
  setIsHoveringTopics: (hovering: boolean) => void;
  topicsTimerValue: number;
  onFrameContainerReady: (el: HTMLDivElement | null) => void;
  handleTopicsScroll: () => void;
  followingSessionId: string | null;
  setFollowingSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  pipUserUid?: number | null;
  setPipUserUid?: (uid: number | null) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  leftSidebarMode,
  isSidebarSwitching,
  agoraError,
  sortedRemoteUsers,
  activeMainScreenShareUid,
  setActiveMainScreenShareUid,
  resolveUserName,
  stableSpeakingUids,
  loudSpeakingUids: _loudSpeakingUids,
  pinnedSessionIds,
  setPinnedSessionIds,
  isHost,
  room,
  sessionId,
  roomState,
  wsService,
  setIsHoveringTopics,
  topicsTimerValue,
  onFrameContainerReady,
  handleTopicsScroll,
  followingSessionId,
  setFollowingSessionId,
  pipUserUid,
  setPipUserUid,
}) => {
  const [confirmKickUser, setConfirmKickUser] = React.useState<{
    sessionId: string;
    name: string;
  } | null>(null);
  const [copiedMeetingLink, setCopiedMeetingLink] = React.useState(false);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {isSidebarSwitching && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--affine-background-secondary-color)',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '2px solid var(--affine-border-color)',
              borderTopColor: 'var(--affine-brand-color)',
              animation: 'spin 0.55s linear infinite',
            }}
          />
        </div>
      )}

      {/* VIDEO MODE */}
      {leftSidebarMode === 'video' && (
        <div
          key="agora-video-panel"
          className="agora-enter-video"
          style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto', scrollbarGutter: 'stable' }}
        >
          <div className="agora-video-grid">
            {agoraError && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.18)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  color: '#ef4444',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Agora App ID Configuration Issue
                </div>
                {agoraError}
              </div>
            )}

            {/* Remote user tiles */}
            {(() => {
              const displayedRemoteUsers = sortedRemoteUsers.filter(
                u => u.uid !== activeMainScreenShareUid
              );
              if (displayedRemoteUsers.length === 0) {
                if (!isHost) return null;
                return (
                  <div className="participant-card waiting-card" style={{ gridColumn: '1 / -1', margin: '8px 0' }}>
                    <div className="waiting-avatar-halo">
                      <div className="waiting-avatar-circle">
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                      </div>
                    </div>
                    <div className="waiting-content-text">
                      <span className="waiting-status-title">Waiting for someone to join...</span>
                      <span className="waiting-status-sub">Share meeting link to invite participants</span>
                    </div>
                    <button
                      className="invite-action-btn"
                      onClick={async e => {
                        e.stopPropagation();
                        try {
                          const inviteUrl = room?.inviteToken
                            ? `${window.location.origin}/join/${room.inviteToken}`
                            : window.location.href;
                          await navigator.clipboard.writeText(inviteUrl);
                          setCopiedMeetingLink(true);
                          setTimeout(() => setCopiedMeetingLink(false), 3000);
                        } catch (err) {
                          console.error('Failed to copy meeting link', err);
                        }
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      {copiedMeetingLink ? 'Link Copied!' : 'Copy Invite Link'}
                    </button>
                  </div>
                );
              }
              return displayedRemoteUsers.map((user: any, idx) => {
                const {
                  name: memberName,
                  isHost: isMemberHost,
                  sessionId: memberSessionId,
                  member,
                } = resolveUserName(user.uid);
                const isSpeaking = stableSpeakingUids.has(user.uid);
                const targetPinId = memberSessionId || String(user.uid);
                const isPinned = pinnedSessionIds.includes(targetPinId);
                const isFollowing = memberSessionId ? followingSessionId === memberSessionId : false;

                const isUserMutedAudio =
                  roomState?.forceMutedUsers?.[memberSessionId]?.includes('audio') || false;
                const isUserMutedVideo =
                  roomState?.forceMutedUsers?.[memberSessionId]?.includes('video') || false;
                const isUserMutedScreen =
                  roomState?.forceMutedUsers?.[memberSessionId]?.includes('screen') || false;

                const getInitials = (nameStr: string) => {
                  if (!nameStr) return 'A';
                  let actualName = nameStr;
                  const hostParenMatch = nameStr.match(/^Host\s*\(([^)]+)\)/i);
                  if (hostParenMatch && hostParenMatch[1]) {
                    actualName = hostParenMatch[1].trim();
                  } else {
                    actualName = nameStr.replace(/\s*\((?:Host|Screen Share)[^)]*\)/gi, '').trim();
                    if (!actualName || actualName.toLowerCase() === 'host') {
                      const anyParenMatch = nameStr.match(/\(([^)]+)\)/);
                      if (anyParenMatch && anyParenMatch[1]) {
                        actualName = anyParenMatch[1].trim();
                      }
                    }
                  }
                  if (!actualName) actualName = nameStr;

                  const parts = actualName.split(/\s+/).filter(Boolean);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  }
                  if (parts.length === 1 && parts[0].length >= 2) {
                    return parts[0].slice(0, 2).toUpperCase();
                  }
                  return actualName.charAt(0).toUpperCase() || 'A';
                };

                return (
                  <div
                    key={user.uid}
                    className={`attendee-card ${isSpeaking ? 'speaking' : ''} ${isPinned ? 'pinned' : ''} ${user.uid >= 100000 ? 'screenshare-tile' : ''}`}
                    style={
                      {
                        order: idx,
                        cursor: 'pointer',
                        opacity: user.isDisconnected ? 0.8 : 1,
                        filter: user.isDisconnected ? 'grayscale(30%)' : 'none',
                        transition: 'opacity 0.3s ease, filter 0.3s ease',
                      } as React.CSSProperties
                    }
                    onClick={() => {
                      if (user.uid >= 100000) {
                        setActiveMainScreenShareUid(prev =>
                          prev === user.uid ? null : user.uid
                        );
                      } else {
                        const targetPinId = memberSessionId || String(user.uid);
                        setPinnedSessionIds(prev =>
                          prev.includes(targetPinId)
                            ? prev.filter(id => id !== targetPinId)
                            : [...prev, targetPinId]
                        );
                      }
                    }}
                    data-tile-key={String(user.uid)}
                  >
                    {user.isDisconnected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '42px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 15,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%)',
                          color: '#ffffff',
                          fontSize: '9.5px',
                          fontWeight: 650,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          maxWidth: '92%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <line x1="1" y1="1" x2="23" y2="23" />
                          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                          <line x1="12" y1="20" x2="12.01" y2="20" />
                        </svg>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Low Network • Disconnecting (5s)</span>
                      </div>
                    )}

                    {/* Top Glass Bar Overlay matching template.html */}
                    <div className="attendee-glass-topbar">
                      {/* HOST ONLY CONTROLS CAPSULE */}
                      {isHost && memberSessionId && memberSessionId !== sessionId && user.uid < 100000 ? (
                        <div className="glass-pill-group">
                          <button
                            className={`glass-action-btn ${isUserMutedAudio ? 'danger-btn' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              wsService.muteUser(room.id, sessionId, memberSessionId, 'audio', !isUserMutedAudio);
                            }}
                            data-tooltip={isUserMutedAudio ? 'Unmute Audio' : 'Mute Audio'}
                          >
                            {isUserMutedAudio ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                              </svg>
                            )}
                          </button>
                          <button
                            className={`glass-action-btn ${isUserMutedVideo ? 'danger-btn' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              wsService.muteUser(room.id, sessionId, memberSessionId, 'video', !isUserMutedVideo);
                            }}
                            data-tooltip={isUserMutedVideo ? 'Unmute Video' : 'Mute Video'}
                          >
                            {isUserMutedVideo ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
                                <path d="M23 19l-7-5v-4l7-5v14z" />
                                <line x1="2" y1="2" x2="22" y2="22" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                              </svg>
                            )}
                          </button>
                          <button
                            className={`glass-action-btn ${isUserMutedScreen ? 'danger-btn' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              wsService.muteUser(room.id, sessionId, memberSessionId, 'screen', !isUserMutedScreen);
                            }}
                            data-tooltip={isUserMutedScreen ? 'Enable Screen Share' : 'Disable Screen Share'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isUserMutedScreen ? "#ef4444" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
                              <path d="M8 21h8M12 17v4" />
                              <path d="M17 7l4-4m0 0h-4m4 0v4" />
                            </svg>
                          </button>
                          <button
                            className="glass-action-btn kick-btn"
                            onClick={e => {
                              e.stopPropagation();
                              setConfirmKickUser({ sessionId: memberSessionId, name: memberName });
                            }}
                            data-tooltip="Remove Attendee"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="18" y1="11" x2="23" y2="11" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* RIGHT SIDEBAR CAPSULE (FOLLOW/UNFOLLOW + PIN) */}
                      <div className="glass-pill-group">
                        {user.uid < 100000 && memberSessionId && memberSessionId !== sessionId && (
                          <button
                            className={`glass-follow-btn ${isFollowing ? 'following' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              setFollowingSessionId(prev => (prev === memberSessionId ? null : memberSessionId));
                            }}
                            data-tooltip={isFollowing ? 'Unfollow participant' : 'Follow participant'}
                          >
                            {isFollowing ? 'Unfollow' : 'Follow'}
                          </button>
                        )}
                        <button
                          className={`glass-action-btn ${isPinned ? 'active' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            if (user.uid >= 100000) {
                              setActiveMainScreenShareUid(prev => (prev === user.uid ? null : user.uid));
                            } else {
                              const targetPinId = memberSessionId || String(user.uid);
                              setPinnedSessionIds(prev =>
                                prev.includes(targetPinId)
                                  ? prev.filter(id => id !== targetPinId)
                                  : [...prev, targetPinId]
                              );
                            }
                          }}
                          data-tooltip={isPinned ? 'Unpin' : 'Pin'}
                        >
                          {isPinned ? (
                            <PinedIcon style={{ fontSize: '14px', width: '14px', height: '14px' }} />
                          ) : (
                            <PinIcon style={{ fontSize: '14px', width: '14px', height: '14px' }} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Active Video Stream or Glass Center Avatar Badge */}
                    {user.videoTrack && pipUserUid !== user.uid ? (
                      <div
                        key={`video-active-${user.uid}`}
                        id={`agora-tile-${user.uid}`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: user.uid >= 100000 ? 'contain' : 'cover',
                          zIndex: 0,
                        }}
                        ref={el => {
                          if (el && user.videoTrack) {
                            try {
                              const trackId = user.videoTrack.getTrackId?.() || String(user.uid);
                              if (el.dataset.playingTrackId !== trackId) {
                                el.dataset.playingTrackId = trackId;
                                el.innerHTML = '';
                                const fitMode = user.uid >= 100000 ? 'contain' : 'cover';
                                user.videoTrack.play(el, { fit: fitMode });
                                // Disable native browser PiP on Agora-generated video & enforce objectFit
                                const vid = el.querySelector('video');
                                if (vid) {
                                  vid.style.objectFit = fitMode;
                                  vid.disablePictureInPicture = true;
                                }
                              }
                            } catch (e) {
                              console.warn('[Agora] Failed to play video track on tile:', e);
                            }
                          }
                        }}
                      />
                    ) : (
                      <div
                        key="avatar-fallback"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                          overflow: 'hidden',
                          background: '#0E193E',
                        }}
                      >
                        {/* SVG Geometric Mesh Background */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 1920 1080"
                          width="100%"
                          height="100%"
                          preserveAspectRatio="xMidYMid slice"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 0,
                          }}
                        >
                          <defs>
                            <linearGradient id={`bgGradient-${user.uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0E193E" />
                              <stop offset="50%" stopColor="#13245B" />
                              <stop offset="100%" stopColor="#071235" />
                            </linearGradient>

                            <linearGradient id={`topPolyGrad-${user.uid}`} x1="0%" y1="0%" x2="100%" y2="50%">
                              <stop offset="0%" stopColor="#0D1A45" />
                              <stop offset="100%" stopColor="#162B6B" />
                            </linearGradient>

                            <linearGradient id={`mainAccentGrad-${user.uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#3F5EFB" />
                              <stop offset="100%" stopColor="#1E328A" />
                            </linearGradient>

                            <radialGradient id={`ambientGlow-${user.uid}`} cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#4F70FF" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#13245B" stopOpacity="0" />
                            </radialGradient>

                            <filter id={`polyShadow-${user.uid}`} x="-10%" y="-10%" width="120%" height="120%">
                              <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000000" floodOpacity="0.35" />
                            </filter>
                          </defs>

                          <rect width="1920" height="1080" fill={`url(#bgGradient-${user.uid})`} />

                          <ellipse cx="960" cy="540" rx="800" ry="450" fill={`url(#ambientGlow-${user.uid})`} />

                          <polygon points="0,0 1920,0 1920,560 0,120" fill={`url(#topPolyGrad-${user.uid})`} />

                          <polygon points="0,120 780,760 1920,560" fill={`url(#mainAccentGrad-${user.uid})`} filter={`url(#polyShadow-${user.uid})`} />

                          <polygon points="0,900 780,760 1920,560 1920,1080 0,1080" fill="#060E2A" />
                        </svg>

                        <div
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: pipUserUid === user.uid
                              ? 'linear-gradient(135deg, #1e96eb 0%, #0f62fe 100%)'
                              : 'linear-gradient(135deg, #0f62fe 0%, #0043ce 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-sans, Inter, sans-serif)',
                            boxShadow: pipUserUid === user.uid
                              ? '0 0 0 3px rgba(30, 150, 235, 0.4), 0 6px 18px rgba(15, 98, 254, 0.5)'
                              : '0 6px 18px rgba(15, 98, 254, 0.35)',
                            border: pipUserUid === user.uid
                              ? '2px solid rgba(30, 150, 235, 0.7)'
                              : '1.5px solid rgba(255, 255, 255, 0.25)',
                            overflow: 'hidden',
                          }}
                        >
                          {pipUserUid === user.uid ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="3" width="20" height="14" rx="2" />
                              <rect x="11" y="9" width="9" height="6" rx="1" fill="#ffffff" fillOpacity="0.3" />
                            </svg>
                          ) : member?.avatar ? (
                            <img
                              src={member.avatar}
                              alt={memberName}
                              referrerPolicy="no-referrer"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            getInitials(memberName)
                          )}
                        </div>
                      </div>
                    )}

                    {/* Floating PiP button — bottom center, appears on hover, matching controls bar style */}
                    <button
                      className={`center-pip-btn${pipUserUid === user.uid ? ' pip-active' : ''}`}
                      onClick={e => {
                        e.stopPropagation();
                        if (setPipUserUid) {
                          setPipUserUid(pipUserUid === user.uid ? null : user.uid);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: pipUserUid === user.uid ? 'var(--affine-brand-color, #1e96eb)' : 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 25,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      data-tooltip={pipUserUid === user.uid ? 'Move back to left' : 'Move to canvas'}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <rect x="11" y="9" width="9" height="6" rx="1" fill="currentColor" fillOpacity="0.3" />
                      </svg>
                    </button>



                    {/* Bottom Floating Glass Name Box matching template.html */}
                    <div className="attendee-glass-namebox">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                      <span className="glass-name-text">
                        {memberName}
                        {isMemberHost && !memberName.startsWith('Host (') && ' (Host)'}
                      </span>
                    </div>

                    {isSpeaking && user.uid < 100000 && (
                      <div className="agora-mic-icon moving">
                        <div className="agora-mic-icon-waves" />
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ position: 'relative', zIndex: 2 }}
                        >
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                      </div>
                    )}


                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* TOPICS MODE */}
      {leftSidebarMode === 'topics' && (
        <div
          key="agora-topics-panel"
          className="agora-enter-topics"
          onMouseEnter={() => setIsHoveringTopics(true)}
          onMouseLeave={() => setIsHoveringTopics(false)}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            className="present-sidebar-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <FrameIcon style={{ width: '14px', height: '14px' }} />
            Topics
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '10px',
                color: 'var(--affine-text-secondary-color)',
                fontWeight: 500,
              }}
            >
              auto-returns in {Math.ceil(topicsTimerValue / 10)}s
            </span>
          </div>
          <div
            style={{
              height: '2.5px',
              width: '100%',
              background: 'var(--affine-border-color, rgba(0, 0, 0, 0.05))',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(topicsTimerValue / 50) * 100}%`,
                background: 'var(--affine-brand-color, #1e96eb)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
            ref={onFrameContainerReady}
            onScroll={handleTopicsScroll}
          />
        </div>
      )}
      {confirmKickUser &&
        createPortal(
          <div className="present-modal-overlay" style={{ zIndex: 999999 }}>
            <div className="present-modal-container">
              <p className="present-modal-title">Kick Participant</p>
              <p className="present-modal-body">
                Are you sure you want to remove <strong>{confirmKickUser.name}</strong> from this meeting?
                They will be disconnected and won't be able to auto-rejoin.
              </p>
              <div className="present-modal-actions">
                <button
                  className="present-btn-exit"
                  onClick={() => setConfirmKickUser(null)}
                >
                  Cancel
                </button>
                <button
                  className="present-btn-danger"
                  onClick={() => {
                    wsService.kickUser(room.id, sessionId, confirmKickUser.sessionId);
                    setConfirmKickUser(null);
                  }}
                >
                  Remove Participant
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
