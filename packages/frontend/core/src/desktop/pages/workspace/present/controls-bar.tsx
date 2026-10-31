import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { PresentationRoom } from '../../../../modules/presentation/types';
import { getAvatarColor } from './present-utils';

interface ControlsBarProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isHost: boolean;
  isSharedMode: boolean;
  guestName: string;
  account: any;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => void;
  isSharingScreen: boolean;
  forceMutedAudio: boolean;
  forceMutedVideo: boolean;
  forceMutedScreen: boolean;
  mediaPerms: {
    allowGuestAudio: boolean;
    allowGuestVideo: boolean;
    allowGuestScreenShare: boolean;
    allowTranslation?: boolean;
    allowGuestTranslation?: boolean;
  };
  room: PresentationRoom;
  sessionId: string;
  wsService: any;
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  selectedAudioInput: string;
  setSelectedAudioInput: (id: string) => void;
  selectedVideoInput: string;
  setSelectedVideoInput: (id: string) => void;
  onSwitchCamera?: (deviceId: string) => Promise<void>;
  activeVirtualBg: 'none' | 'blur' | 'office' | 'beach' | 'custom';
  setActiveVirtualBg: (
    bg: 'none' | 'blur' | 'office' | 'beach' | 'custom'
  ) => void;
  setCustomBgImage: (url: string) => void;
  localAudioTrackRef: React.MutableRefObject<any>;
  localVideoTrackRef: React.MutableRefObject<any>;
  selfViewVideoRef: React.RefObject<HTMLVideoElement | null>;
  refreshDevices?: () => Promise<void> | void;
  isAiNoiseSuppressionOn: boolean;
  isAiNoiseSuppressionActive: boolean;
  setIsAiNoiseSuppressionActive: (active: boolean) => void;
  isEchoCancellationOn: boolean;
  setIsEchoCancellationOn: (val: boolean) => void;
  isAutomaticGainControlOn: boolean;
  setIsAutomaticGainControlOn: (val: boolean) => void;
  isNoiseSuppressionOn: boolean;
  setIsNoiseSuppressionOn: (val: boolean) => void;
  setIsAiNoiseSuppressionOn: (val: boolean) => void;
  pipUserUid?: number | null;
  setPipUserUid?: React.Dispatch<React.SetStateAction<number | null>> | ((uid: number | null) => void);
  localUid?: number | null;
  onDisabledMediaClick?: (mediaType: string) => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isMicOn,
  isCamOn,
  isHost,
  isSharedMode,
  guestName,
  account,
  toggleMic,
  toggleCam,
  toggleScreenShare,
  isSharingScreen,
  forceMutedAudio,
  forceMutedVideo,
  forceMutedScreen,
  mediaPerms,
  room,
  sessionId,
  wsService,
  audioInputs,
  videoInputs,
  audioOutputs,
  selectedAudioInput,
  setSelectedAudioInput,
  selectedVideoInput,
  setSelectedVideoInput,
  onSwitchCamera,
  activeVirtualBg,
  setActiveVirtualBg,
  setCustomBgImage,
  localAudioTrackRef,
  localVideoTrackRef,
  selfViewVideoRef,
  refreshDevices,
  isAiNoiseSuppressionOn,
  isAiNoiseSuppressionActive,
  setIsAiNoiseSuppressionActive,
  isEchoCancellationOn,
  setIsEchoCancellationOn,
  isAutomaticGainControlOn,
  setIsAutomaticGainControlOn,
  isNoiseSuppressionOn,
  setIsNoiseSuppressionOn,
  setIsAiNoiseSuppressionOn,
  pipUserUid,
  setPipUserUid,
  localUid,
  onDisabledMediaClick,
}) => {
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [selfViewExpanded, setSelfViewExpanded] = useState(false);
  const [portalTooltip, setPortalTooltip] = useState<{ text: string; x: number; y: number; btnLeft: number; btnRight: number } | null>(null);

  const deviceMenuRef = React.useRef<HTMLDivElement>(null);
  const settingsPanelRef = React.useRef<HTMLDivElement>(null);
  const deviceBtnRef = React.useRef<HTMLButtonElement>(null);
  const settingsBtnRef = React.useRef<HTMLButtonElement>(null);
  const expandedSelfVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const selfViewBtnRef = React.useRef<HTMLDivElement | null>(null);
  const tooltipTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const selfViewHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTip = (e: React.MouseEvent, text: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tipData = {
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      btnLeft: rect.left,
      btnRight: rect.right,
    };
    tooltipTimerRef.current = setTimeout(() => {
      setPortalTooltip(tipData);
    }, 400);
  };
  const hideTip = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    setPortalTooltip(null);
  };

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        showDeviceMenu &&
        deviceMenuRef.current &&
        !deviceMenuRef.current.contains(target) &&
        deviceBtnRef.current &&
        !deviceBtnRef.current.contains(target)
      ) {
        setShowDeviceMenu(false);
      }

      if (
        showSettingsPanel &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(target) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(target)
      ) {
        setShowSettingsPanel(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showDeviceMenu, showSettingsPanel]);

  return (
    <div className="sidebar-controls-row" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', boxSizing: 'border-box', position: 'relative', zIndex: 100, overflow: 'visible' }}>
      {/* Microphone toggle */}
      <button
        className={`ctrl-btn ${!isMicOn ? 'active-off' : ''}`}
        onClick={() => {
          if (forceMutedAudio || !(isHost || mediaPerms.allowGuestAudio)) {
            onDisabledMediaClick?.('Audio');
          } else {
            toggleMic();
          }
        }}
        style={{
          cursor: (forceMutedAudio || !(isHost || mediaPerms.allowGuestAudio)) ? 'not-allowed' : 'pointer',
          opacity: 1,
        }}
        onMouseEnter={e => showTip(e, forceMutedAudio ? 'Muted by Host' : !(isHost || mediaPerms.allowGuestAudio) ? 'Mic Disabled by Host' : isMicOn ? 'Mute Microphone' : 'Unmute Microphone')}
        onMouseLeave={hideTip}
      >
        {isMicOn ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>

      {/* Camera toggle */}
      <button
        className={`ctrl-btn ${!isCamOn ? 'active-off' : ''}`}
        onClick={() => {
          if (forceMutedVideo || !(isHost || mediaPerms.allowGuestVideo)) {
            onDisabledMediaClick?.('Video');
          } else {
            toggleCam();
          }
        }}
        style={{
          cursor: (forceMutedVideo || !(isHost || mediaPerms.allowGuestVideo)) ? 'not-allowed' : 'pointer',
          opacity: 1,
        }}
        onMouseEnter={e => showTip(e, forceMutedVideo ? 'Muted by Host' : !(isHost || mediaPerms.allowGuestVideo) ? 'Camera Disabled by Host' : isCamOn ? 'Turn off Camera' : 'Turn on Camera')}
        onMouseLeave={hideTip}
      >
        {isCamOn ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        ) : (
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
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
            <path d="M23 19l-7-5v-4l7-5v14z" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        )}
      </button>

      {/* Self-view raw local track wrap */}
      <div
        ref={selfViewBtnRef}
        className="ctrl-btn user-badge-btn"
        onMouseEnter={e => {
          if (selfViewHideTimerRef.current) { clearTimeout(selfViewHideTimerRef.current); selfViewHideTimerRef.current = null; }
          setSelfViewExpanded(true);
          showTip(e, 'Your Camera Preview');
        }}
        onMouseLeave={() => {
          selfViewHideTimerRef.current = setTimeout(() => { setSelfViewExpanded(false); hideTip(); }, 300);
        }}
        style={{ position: 'relative', overflow: 'visible' }}
      >
        <div style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: pipUserUid === localUid ? 'var(--affine-brand-color, #1e96eb)' : isCamOn ? '#000000' : 'var(--affine-brand-color, #0f62fe)', position: 'relative' }}>
          {pipUserUid === localUid ? (
            /* Show PiP icon when self video is popped out */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <rect x="11" y="9" width="9" height="6" rx="1" fill="#ffffff" fillOpacity="0.3" />
            </svg>
          ) : isCamOn ? (
            <video
              ref={el => {
                if (selfViewVideoRef) (selfViewVideoRef as any).current = el;
                if (el && localVideoTrackRef.current) {
                  try {
                    const track = localVideoTrackRef.current.getMediaStreamTrack();
                    if (track) {
                      const currentStream = el.srcObject as MediaStream;
                      const currentTrack = currentStream?.getVideoTracks()?.[0];
                      if (currentTrack !== track) {
                        el.srcObject = new MediaStream([track]);
                      }
                    }
                  } catch (_) {}
                }
              }}
              autoPlay
              muted
              playsInline
              disablePictureInPicture
              className="agora-self-view-video"
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          ) : !isSharedMode && account?.avatar ? (
            <img
              src={account.avatar}
              alt="You"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            (() => {
              const hostOrGuestName = isSharedMode
                ? (guestName || 'Guest')
                : (account?.label || 'Host');
              const parts = hostOrGuestName.split(/\s+/).filter(Boolean);
              if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
              }
              if (parts.length === 1 && parts[0].length >= 2) {
                return parts[0].slice(0, 2).toUpperCase();
              }
              return hostOrGuestName.charAt(0).toUpperCase() || 'H';
            })()
          )}

        </div>
      </div>

      {/* Floating PiP button + expanded preview — rendered via portal to bypass overflow clipping */}
      {selfViewExpanded && selfViewBtnRef.current && createPortal(
        (() => {
          const rect = selfViewBtnRef.current!.getBoundingClientRect();
          return (
            <div
              style={{
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left + rect.width / 2,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                zIndex: 999999,
                pointerEvents: 'auto',
              }}
              onMouseEnter={() => {
                if (selfViewHideTimerRef.current) { clearTimeout(selfViewHideTimerRef.current); selfViewHideTimerRef.current = null; }
                setSelfViewExpanded(true);
              }}
              onMouseLeave={() => {
                selfViewHideTimerRef.current = setTimeout(() => { setSelfViewExpanded(false); hideTip(); }, 300);
              }}
            >
              {/* PiP button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (localUid !== null && localUid !== undefined && setPipUserUid) {
                    const targetUid = pipUserUid === localUid ? null : localUid;
                    setPipUserUid(targetUid);
                  }
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: localUid !== null && pipUserUid === localUid ? 'var(--affine-brand-color, #1e96eb)' : 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={e => {
                  showTip(e, localUid !== null && pipUserUid === localUid ? 'Move back to left' : 'Move to canvas');
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--affine-brand-color, #0f62fe)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(15, 98, 254, 0.5)';
                }}
                onMouseLeave={e => {
                  hideTip();
                  const isActive = localUid !== null && pipUserUid === localUid;
                  (e.currentTarget as HTMLButtonElement).style.background = isActive ? 'var(--affine-brand-color, #1e96eb)' : 'rgba(0, 0, 0, 0.65)';
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <rect x="11" y="9" width="9" height="6" rx="1" fill="currentColor" fillOpacity="0.3" />
                </svg>
              </button>

              {/* Expanded camera preview */}
              {isCamOn && pipUserUid !== localUid && (
                <div className="agora-self-view-expanded" style={{ background: 'var(--affine-brand-color, #0f62fe)', position: 'relative' }}>
                  <video
                    ref={el => {
                      expandedSelfVideoRef.current = el;
                      if (el && localVideoTrackRef.current) {
                        try {
                          const track = localVideoTrackRef.current.getMediaStreamTrack();
                          if (track) {
                            const currentStream = el.srcObject as MediaStream;
                            const currentTrack = currentStream?.getVideoTracks()?.[0];
                            if (currentTrack !== track) {
                              el.srcObject = new MediaStream([track]);
                            }
                          }
                        } catch (_) {}
                      }
                    }}
                    autoPlay
                    muted
                    playsInline
                    disablePictureInPicture
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                  />
                </div>
              )}
            </div>
          );
        })(),
        document.body
      )}

      {/* Screen Share — host or guest with permissions */}
      <button
        data-testid="screen-share-btn"
        className={`ctrl-btn ${isSharingScreen ? 'active-share' : ''}`}
        onClick={() => {
          if (forceMutedScreen || !(isHost || mediaPerms.allowGuestScreenShare)) {
            onDisabledMediaClick?.('Screen share');
          } else {
            toggleScreenShare();
          }
        }}
        style={{
          cursor: (forceMutedScreen || !(isHost || mediaPerms.allowGuestScreenShare)) ? 'not-allowed' : 'pointer',
          opacity: 1,
        }}
        onMouseEnter={e => showTip(e, forceMutedScreen ? 'Screen Share Muted by Host' : !(isHost || mediaPerms.allowGuestScreenShare) ? 'Screen Share Disabled' : isSharingScreen ? 'Stop Sharing' : 'Share Screen')}
        onMouseLeave={hideTip}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
          <path d="M8 21h8M12 17v4" />
          <path d="M17 7l4-4m0 0h-4m4 0v4" />
        </svg>
      </button>

      {/* Device settings gear */}
      <div className="agora-ctrl-btn-slot" style={{ position: 'relative' }}>
        <button
          ref={deviceBtnRef}
          data-testid="av-settings-btn"
          className={`ctrl-btn ${showDeviceMenu ? 'present-btn-active' : ''}`}
          onClick={() => {
            setShowDeviceMenu(p => {
              const next = !p;
              if (next && refreshDevices) {
                refreshDevices();
              }
              return next;
            });
          }}
          onMouseEnter={e => showTip(e, 'Audio/Video settings')}
          onMouseLeave={hideTip}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {showDeviceMenu &&
          createPortal(
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999998,
                  background: 'transparent',
                }}
                onClick={() => setShowDeviceMenu(false)}
              />
              <div
                ref={deviceMenuRef}
                className="agora-device-menu"
                style={{
                  position: 'fixed',
                  top: deviceBtnRef.current
                    ? deviceBtnRef.current.getBoundingClientRect().bottom + 8
                    : 80,
                  left: deviceBtnRef.current
                    ? Math.max(10, deviceBtnRef.current.getBoundingClientRect().left - 180)
                    : 20,
                  zIndex: 999999,
                }}
              >
                {/* MICROPHONE SECTION */}
                <div className="agora-device-label" style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.5px' }}>MICROPHONE</div>
                {audioInputs.length > 0 ? (
                  <>
                    <select
                      className="agora-device-select"
                      value={selectedAudioInput}
                      onChange={async e => {
                        setSelectedAudioInput(e.target.value);
                        if (localAudioTrackRef.current)
                          await localAudioTrackRef.current.setDevice(
                            e.target.value
                          );
                      }}
                    >
                      {audioInputs.map(dev => (
                        <option key={dev.deviceId} value={dev.deviceId}>
                          {dev.label || `Microphone ${dev.deviceId.slice(0, 5)}...`}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '4px 0' }}>
                      {/* AEC / AGC toggles */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }} data-tooltip="Acoustic Echo Cancellation">
                          <button
                            type="button"
                            className={`agora-settings-mini-toggle ${isEchoCancellationOn ? 'on' : 'off'}`}
                            onClick={() => setIsEchoCancellationOn(!isEchoCancellationOn)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span
                            style={{ fontSize: '10px', fontWeight: 600, color: 'var(--affine-text-primary-color)', cursor: 'pointer' }}
                            onClick={() => setIsEchoCancellationOn(!isEchoCancellationOn)}
                          >
                            AEC
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }} data-tooltip="Automatic Gain Control">
                          <button
                            type="button"
                            className={`agora-settings-mini-toggle ${isAutomaticGainControlOn ? 'on' : 'off'}`}
                            onClick={() => setIsAutomaticGainControlOn(!isAutomaticGainControlOn)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span
                            style={{ fontSize: '10px', fontWeight: 600, color: 'var(--affine-text-primary-color)', cursor: 'pointer' }}
                            onClick={() => setIsAutomaticGainControlOn(!isAutomaticGainControlOn)}
                          >
                            AGC
                          </span>
                        </div>
                      </div>

                      {/* Noise Suppression 3-way segmented button */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                        <div style={{ fontSize: '8.5px', fontWeight: 700, color: 'var(--affine-text-secondary-color)' }}>NOISE SUPPRESSION</div>
                        <div
                          style={{
                            display: 'flex',
                            background: 'var(--affine-background-secondary-color)',
                            borderRadius: '8px',
                            padding: '2px',
                            border: '1px solid var(--affine-border-color)'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setIsNoiseSuppressionOn(false);
                              setIsAiNoiseSuppressionOn(false);
                              setIsAiNoiseSuppressionActive(false);
                            }}
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              fontSize: '10px',
                              border: 'none',
                              borderRadius: '6px',
                              background: (!isNoiseSuppressionOn && !isAiNoiseSuppressionOn) ? 'var(--affine-background-primary-color)' : 'transparent',
                              color: (!isNoiseSuppressionOn && !isAiNoiseSuppressionOn) ? 'var(--affine-text-primary-color)' : 'var(--affine-text-secondary-color)',
                              fontWeight: (!isNoiseSuppressionOn && !isAiNoiseSuppressionOn) ? 700 : 500,
                              cursor: 'pointer',
                              boxShadow: (!isNoiseSuppressionOn && !isAiNoiseSuppressionOn) ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Off
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNoiseSuppressionOn(true);
                              setIsAiNoiseSuppressionOn(false);
                              setIsAiNoiseSuppressionActive(false);
                            }}
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              fontSize: '10px',
                              border: 'none',
                              borderRadius: '6px',
                              background: (isNoiseSuppressionOn && !isAiNoiseSuppressionOn) ? 'var(--affine-background-primary-color)' : 'transparent',
                              color: (isNoiseSuppressionOn && !isAiNoiseSuppressionOn) ? 'var(--affine-text-primary-color)' : 'var(--affine-text-secondary-color)',
                              fontWeight: (isNoiseSuppressionOn && !isAiNoiseSuppressionOn) ? 700 : 500,
                              cursor: 'pointer',
                              boxShadow: (isNoiseSuppressionOn && !isAiNoiseSuppressionOn) ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ANS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsNoiseSuppressionOn(false);
                              setIsAiNoiseSuppressionOn(true);
                              setIsAiNoiseSuppressionActive(true);
                            }}
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              fontSize: '10px',
                              border: 'none',
                              borderRadius: '6px',
                              background: isAiNoiseSuppressionOn ? 'var(--affine-background-primary-color)' : 'transparent',
                              color: isAiNoiseSuppressionOn ? 'var(--affine-brand-color, #1e96eb)' : 'var(--affine-text-secondary-color)',
                              fontWeight: isAiNoiseSuppressionOn ? 700 : 500,
                              cursor: 'pointer',
                              boxShadow: isAiNoiseSuppressionOn ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            AI ANS (Beta)
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--affine-text-secondary-color)', padding: '4px 0' }}>No microphone found</div>
                )}

                <div className="agora-settings-divider" />

                {/* SPEAKER SECTION */}
                <div className="agora-device-label" style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.5px' }}>SPEAKER</div>
                {audioOutputs.length > 0 ? (
                  <select className="agora-device-select">
                    {audioOutputs.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || 'Speaker'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--affine-text-secondary-color)', padding: '4px 0' }}>No speaker found</div>
                )}

                <div className="agora-settings-divider" />

                {/* CAMERA SECTION */}
                <div className="agora-device-label" style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.5px' }}>CAMERA</div>
                {videoInputs.length > 0 ? (
                  <>
                    <select
                      className="agora-device-select"
                      value={selectedVideoInput}
                      onChange={async e => {
                        const newDeviceId = e.target.value;
                        setSelectedVideoInput(newDeviceId);
                        if (onSwitchCamera) {
                          await onSwitchCamera(newDeviceId);
                        } else if (localVideoTrackRef.current) {
                          try {
                            await localVideoTrackRef.current.setDevice(newDeviceId);
                          } catch (err) {
                            console.warn('[ControlsBar] setDevice failed:', err);
                          }
                        }
                      }}
                    >
                      {videoInputs.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || 'Camera'}
                        </option>
                      ))}
                    </select>

                    <div className="agora-device-label" style={{ fontSize: '9px', marginTop: '6px', color: 'var(--affine-text-secondary-color)' }}>Virtual Background</div>
                    <select
                      className="agora-device-select"
                      value={activeVirtualBg}
                      onChange={e => setActiveVirtualBg(e.target.value as any)}
                    >
                      <option value="none">None</option>
                      <option value="blur">Background Blur</option>
                      <option value="office">Office Room</option>
                      <option value="beach">Sunny Beach</option>
                      <option value="custom">Custom Image...</option>
                    </select>

                    {activeVirtualBg === 'custom' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                        <div className="agora-device-label" style={{ fontSize: '8.5px', color: 'var(--affine-text-secondary-color)' }}>
                          Upload Custom Image
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = event => {
                                const base64 = event.target?.result as string;
                                if (base64) {
                                  setCustomBgImage(base64);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          style={{
                            fontSize: '10px',
                            color: 'var(--affine-text-secondary-color)',
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--affine-text-secondary-color)', padding: '4px 0' }}>No camera found</div>
                )}
              </div>
            </>,
            document.body
          )}
      </div>

      {/* Meeting Settings & Permissions Popover panel (Host only) */}
      {isHost && (
        <div className="agora-ctrl-btn-slot" style={{ position: 'relative' }}>
        <button
          ref={settingsBtnRef}
          className={`ctrl-btn ${showSettingsPanel ? 'present-btn-active' : ''}`}
          onClick={() => setShowSettingsPanel(p => !p)}
          onMouseEnter={e => showTip(e, 'Meeting Permissions & Controls')}
          onMouseLeave={hideTip}
        >
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
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>
        {showSettingsPanel &&
          createPortal(
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 999998,
                  background: 'transparent',
                }}
                onClick={() => setShowSettingsPanel(false)}
              />
              <div
                ref={settingsPanelRef}
                className="agora-settings-panel"
                style={{
                  position: 'fixed',
                  top: settingsBtnRef.current
                    ? settingsBtnRef.current.getBoundingClientRect().bottom + 8
                    : 80,
                  left: settingsBtnRef.current
                    ? Math.max(10, settingsBtnRef.current.getBoundingClientRect().left - 180)
                    : 20,
                  zIndex: 999999,
                }}
              >
                <div className="agora-settings-label" style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>
                  {isHost ? 'GUEST PERMISSIONS' : 'MEETING PERMISSIONS'}
                </div>

                <div className="agora-settings-row">
                  <span>Allow Camera</span>
                  {isHost ? (
                    <button
                      type="button"
                      className={`agora-settings-toggle ${mediaPerms.allowGuestVideo ? 'on' : 'off'}`}
                      onClick={() => {
                        const nextVal = !mediaPerms.allowGuestVideo;
                        wsService.updateMediaPermissions(room.id, sessionId, {
                          ...mediaPerms,
                          allowGuestVideo: nextVal,
                        });
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: mediaPerms.allowGuestVideo ? 'var(--accent-green, #24a148)' : 'var(--accent-red, #da1e28)' }}>
                      {mediaPerms.allowGuestVideo ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>

                <div className="agora-settings-row">
                  <span>Allow Microphone</span>
                  {isHost ? (
                    <button
                      type="button"
                      className={`agora-settings-toggle ${mediaPerms.allowGuestAudio ? 'on' : 'off'}`}
                      onClick={() => {
                        const nextVal = !mediaPerms.allowGuestAudio;
                        wsService.updateMediaPermissions(room.id, sessionId, {
                          ...mediaPerms,
                          allowGuestAudio: nextVal,
                        });
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: mediaPerms.allowGuestAudio ? 'var(--accent-green, #24a148)' : 'var(--accent-red, #da1e28)' }}>
                      {mediaPerms.allowGuestAudio ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>

                <div className="agora-settings-row">
                  <span>Allow Screen Share</span>
                  {isHost ? (
                    <button
                      type="button"
                      className={`agora-settings-toggle ${mediaPerms.allowGuestScreenShare ? 'on' : 'off'}`}
                      onClick={() => {
                        const nextVal = !mediaPerms.allowGuestScreenShare;
                        wsService.updateMediaPermissions(room.id, sessionId, {
                          ...mediaPerms,
                          allowGuestScreenShare: nextVal,
                        });
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: mediaPerms.allowGuestScreenShare ? 'var(--accent-green, #24a148)' : 'var(--accent-red, #da1e28)' }}>
                      {mediaPerms.allowGuestScreenShare ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>

                <div className="agora-settings-row">
                  <span>Allow Live Translation</span>
                  {isHost ? (
                    <button
                      type="button"
                      className={`agora-settings-toggle ${Boolean(mediaPerms?.allowTranslation ?? mediaPerms?.allowGuestTranslation) ? 'on' : 'off'}`}
                      onClick={() => {
                        const currentVal = Boolean(
                          mediaPerms?.allowTranslation ??
                            mediaPerms?.allowGuestTranslation
                        );
                        const nextVal = !currentVal;
                        wsService.updateMediaPermissions(room.id, sessionId, {
                          ...mediaPerms,
                          allowTranslation: nextVal,
                          allowGuestTranslation: nextVal,
                        });
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: (mediaPerms?.allowTranslation ??
                        mediaPerms?.allowGuestTranslation)
                          ? 'var(--accent-green, #24a148)'
                          : 'var(--accent-red, #da1e28)',
                      }}
                    >
                      {(mediaPerms?.allowTranslation ??
                      mediaPerms?.allowGuestTranslation)
                        ? 'Enabled'
                        : 'Disabled'}
                    </span>
                  )}
                </div>
              </div>
            </>,
            document.body
          )}
      </div>
      )}

      {/* Portal-based tooltip — renders to document.body, always on top of everything */}
      {portalTooltip && createPortal(
        <div
          className="portal-tooltip-bubble"
          style={{
            position: 'fixed',
            top: portalTooltip.y,
            ...(portalTooltip.btnLeft < 60
              ? { left: Math.max(8, portalTooltip.btnLeft), transform: 'translateY(-100%)' }
              : portalTooltip.btnRight > window.innerWidth - 60
                ? { right: Math.max(8, window.innerWidth - portalTooltip.btnRight), transform: 'translateY(-100%)' }
                : { left: portalTooltip.x, transform: 'translateX(-50%) translateY(-100%)' }
            ),
            background: '#1e293b',
            color: '#ffffff',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            lineHeight: '20px',
            fontFamily: '"IBM Plex Sans", var(--font-sans, Inter, -apple-system, BlinkMacSystemFont, sans-serif)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 2147483647,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            opacity: 1,
          }}
        >
          {portalTooltip.text}
        </div>,
        document.body
      )}
    </div>
  );
};
