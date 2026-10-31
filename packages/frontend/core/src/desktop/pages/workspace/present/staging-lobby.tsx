import React, { useState, useEffect, useRef } from 'react';
import type { PresentationRoom } from '../../../../modules/presentation/types';
import { applyVirtualBackground, applyAiDenoiser } from './present-utils';
import type { AuthService } from '@affine/core/modules/cloud';
import oneLogoLight from '../../../../assets/one-logo-light.png';
import { useCompanyProfile } from '../../../../components/hooks/use-company-profile';

interface StagingLobbyProps {
  room: PresentationRoom | null;
  agoraLoaded: boolean;
  isSharedMode: boolean;
  account: any;
  authService: AuthService;
  videoInputs: MediaDeviceInfo[];
  setVideoInputs: React.Dispatch<React.SetStateAction<MediaDeviceInfo[]>>;
  audioInputs: MediaDeviceInfo[];
  setAudioInputs: React.Dispatch<React.SetStateAction<MediaDeviceInfo[]>>;
  onJoin: (params: {
    name: string;
    micOn: boolean;
    camOn: boolean;
    videoInput: string;
    audioInput: string;
    virtualBg: 'none' | 'blur' | 'office' | 'beach' | 'custom';
    customBgImage: string;
    aiNoiseSuppression: boolean;
    aecOn?: boolean;
    agcOn?: boolean;
    nativeAnsOn?: boolean;
  }) => void;

  audioProfile: string;
  isEchoCancellationOn: boolean;
  isAutomaticGainControlOn: boolean;
  isNoiseSuppressionOn: boolean;
}

export const StagingLobby: React.FC<StagingLobbyProps> = ({
  room,
  agoraLoaded,
  isSharedMode,
  account,
  authService,
  videoInputs,
  setVideoInputs,
  audioInputs,
  setAudioInputs,
  onJoin,
  audioProfile,
  isEchoCancellationOn,
  isAutomaticGainControlOn,
  isNoiseSuppressionOn,
}) => {
  const companyProfile = useCompanyProfile();
  const displayLogo = companyProfile.oneLogoData || oneLogoLight;

  const allowAudio = room?.permissions?.allowAudio ?? true;
  const allowVideo = room?.permissions?.allowVideo ?? true;
  const requiresApproval = !(room?.permissions?.allowWithoutPermission ?? true);

  const [stagingName, setStagingName] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_guest_name');
      if (saved && saved.trim().toLowerCase() !== 'guest') return saved;
    } catch (_) {}
    return '';
  });

  const [stagingMicOn, setStagingMicOn] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_presentation_mic_on');
      return saved !== null ? saved === 'true' : false;
    } catch (_) {
      return false;
    }
  });
  const [stagingCamOn, setStagingCamOn] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_presentation_cam_on');
      return saved !== null ? saved === 'true' : false;
    } catch (_) {
      return false;
    }
  });
  const [stagingAiNoiseSuppression, setStagingAiNoiseSuppression] = useState(() => {
    try {
      return localStorage.getItem('intoai_presentation_ai_noise') === 'true';
    } catch (_) {
      return false;
    }
  });

  const [stagingVideoInput, setStagingVideoInput] = useState(() => {
    try {
      return localStorage.getItem('intoai_presentation_selected_cam') || '';
    } catch (_) {
      return '';
    }
  });
  const [stagingAudioInput, setStagingAudioInput] = useState(() => {
    try {
      return localStorage.getItem('intoai_presentation_selected_mic') || '';
    } catch (_) {
      return '';
    }
  });
  const [stagingAudioLevel, setStagingAudioLevel] = useState(0);

  const [activeTab, setActiveTab] = useState<'audio' | 'video'>('audio');
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

  const [stagingAec, setStagingAec] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_presentation_aec');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const [stagingAgc, setStagingAgc] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_presentation_agc');
      return saved !== null ? saved === 'true' : isAutomaticGainControlOn;
    } catch (_) {
      return isAutomaticGainControlOn;
    }
  });
  const [stagingAns, setStagingAns] = useState(() => {
    try {
      const saved = localStorage.getItem('intoai_presentation_native_ans');
      return saved !== null ? saved === 'true' : isNoiseSuppressionOn;
    } catch (_) {
      return isNoiseSuppressionOn;
    }
  });

  // Force mic/cam to off if host has disallowed them
  useEffect(() => {
    if (room?.permissions) {
      if (room.permissions.allowAudio === false) {
        setStagingMicOn(false);
      }
      if (room.permissions.allowVideo === false) {
        setStagingCamOn(false);
      }
    }
  }, [room?.permissions?.allowAudio, room?.permissions?.allowVideo]);

  useEffect(() => {
    if (!stagingMicOn && activeTab === 'audio' && stagingCamOn) {
      setActiveTab('video');
    } else if (!stagingCamOn && activeTab === 'video' && stagingMicOn) {
      setActiveTab('audio');
    }
  }, [stagingMicOn, stagingCamOn, activeTab]);

  const stagingVideoRef = useRef<HTMLVideoElement | null>(null);
  const stagingTrackRef = useRef<any>(null);
  const stagingAudioTrackRef = useRef<any>(null);
  const stagingAudioVolumeInterval = useRef<any>(null);

  const stagingVideoInputRef = useRef(stagingVideoInput);
  stagingVideoInputRef.current = stagingVideoInput;

  const stagingAudioInputRef = useRef(stagingAudioInput);
  stagingAudioInputRef.current = stagingAudioInput;

  // Dynamic camera device switching
  useEffect(() => {
    if (stagingTrackRef.current && stagingVideoInput) {
      let isMounted = true;
      stagingTrackRef.current.setDevice(stagingVideoInput).catch(async (err: any) => {
        console.warn('[Staging] setDevice failed on camera switch, recreating track:', err);
        try {
          stagingTrackRef.current?.close();
          const AgoraRTC = (window as any).AgoraRTC;
          if (AgoraRTC && isMounted) {
            const newTrack = await AgoraRTC.createCameraVideoTrack({
              cameraId: stagingVideoInput,
            });
            if (isMounted) {
              stagingTrackRef.current = newTrack;
              await applyVirtualBackground(
                newTrack,
                activeVirtualBg,
                customBgImage
              );
              if (stagingVideoRef.current) {
                newTrack.play(stagingVideoRef.current);
              }
            }
          }
        } catch (recreateErr) {
          console.error('[Staging] Failed to recreate camera track on device switch:', recreateErr);
        }
      });
      return () => { isMounted = false; };
    }
  }, [stagingVideoInput, activeVirtualBg, customBgImage]);

  // Dynamic microphone device switching
  useEffect(() => {
    if (stagingAudioTrackRef.current && stagingAudioInput) {
      stagingAudioTrackRef.current.setDevice(stagingAudioInput).catch((err: any) => {
        console.error('[Staging] Failed to switch microphone device:', err);
      });
    }
  }, [stagingAudioInput]);

  // Visitor Staging Media preview manager
  useEffect(() => {
    if (!room || !agoraLoaded) return;
    const AgoraRTC = (window as any).AgoraRTC;
    if (!AgoraRTC) return;
    try {
      AgoraRTC.setLogLevel(4);
    } catch (_) {}

    let active = true;
    let localCam: any = null;
    let localMic: any = null;

    const setupStagingCam = async () => {
      if (stagingCamOn) {
        try {
          localCam = await AgoraRTC.createCameraVideoTrack({
            cameraId: stagingVideoInputRef.current || undefined,
            encoderConfig: '240p_1',
            optimizationMode: 'balanced',
          });
          if (!active) {
            localCam.close();
            return;
          }
          stagingTrackRef.current = localCam;
          await applyVirtualBackground(
            localCam,
            activeVirtualBg,
            customBgImage
          );
          if (stagingVideoRef.current) {
            localCam.play(stagingVideoRef.current);
          }

          // Query devices now that permission is granted
          const devices = await AgoraRTC.getDevices();
          const videoDevs = devices.filter((d: any) => d.kind === 'videoinput');
          setVideoInputs(videoDevs);
          if (videoDevs.length > 0 && !stagingVideoInputRef.current) {
            setStagingVideoInput(videoDevs[0].deviceId);
          }
        } catch (err) {
          console.error('[Staging] Failed to start camera preview:', err);
          setStagingCamOn(false);
        }
      } else {
        if (stagingTrackRef.current) {
          stagingTrackRef.current.close();
          stagingTrackRef.current = null;
        }
      }
    };

    const setupStagingMic = async () => {
      if (stagingMicOn) {
        try {
          // Wait a short moment to let any previously closed track release the hardware microphone
          await new Promise(resolve => setTimeout(resolve, 250));
          if (!active) return;

          localMic = await AgoraRTC.createMicrophoneAudioTrack({
            microphoneId: stagingAudioInputRef.current || undefined,
            encoderConfig: audioProfile,
            AEC: stagingAec,
            AGC: stagingAgc,
            ANS: stagingAiNoiseSuppression ? false : stagingAns,
          });
          if (!active) {
            localMic.close();
            return;
          }
          stagingAudioTrackRef.current = localMic;

          if (stagingAiNoiseSuppression) {
            await applyAiDenoiser(localMic, true);
          }

          // Poll volume level
          stagingAudioVolumeInterval.current = setInterval(() => {
            if (stagingAudioTrackRef.current) {
              const lvl = Math.round(
                stagingAudioTrackRef.current.getVolumeLevel() * 100
              );
              setStagingAudioLevel(lvl);
            }
          }, 100);

          // Query devices now that permission is granted
          const devices = await AgoraRTC.getDevices();
          const audioDevs = devices.filter((d: any) => d.kind === 'audioinput');
          setAudioInputs(audioDevs);
          if (audioDevs.length > 0 && !stagingAudioInputRef.current) {
            setStagingAudioInput(audioDevs[0].deviceId);
          }
        } catch (err) {
          console.error('[Staging] Failed to start microphone preview:', err);
          setStagingMicOn(false);
        }
      } else {
        if (stagingAudioTrackRef.current) {
          stagingAudioTrackRef.current.close();
          stagingAudioTrackRef.current = null;
        }
        if (stagingAudioVolumeInterval.current) {
          clearInterval(stagingAudioVolumeInterval.current);
        }
        setStagingAudioLevel(0);
      }
    };

    setupStagingCam();
    setupStagingMic();

    // Devices are queried internally inside setupStagingCam and setupStagingMic once permission is granted

    return () => {
      active = false;
      if (stagingTrackRef.current) {
        stagingTrackRef.current.close();
        stagingTrackRef.current = null;
      }
      if (stagingAudioTrackRef.current) {
        stagingAudioTrackRef.current.close();
        stagingAudioTrackRef.current = null;
      }
      if (stagingAudioVolumeInterval.current) {
        clearInterval(stagingAudioVolumeInterval.current);
      }
    };
  }, [
    stagingCamOn,
    stagingMicOn,
    room,
    agoraLoaded,
    activeVirtualBg,
    customBgImage,
    stagingAec,
    stagingAgc,
    stagingAns,
    audioProfile,
    setVideoInputs,
    setAudioInputs,
    stagingAiNoiseSuppression,
  ]);

  // Synchronize lobby selections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_mic_on', String(stagingMicOn));
    } catch (_) {}
  }, [stagingMicOn]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_cam_on', String(stagingCamOn));
    } catch (_) {}
  }, [stagingCamOn]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_ai_noise', String(stagingAiNoiseSuppression));
    } catch (_) {}
  }, [stagingAiNoiseSuppression]);

  useEffect(() => {
    if (stagingVideoInput) {
      try {
        localStorage.setItem('intoai_presentation_selected_cam', stagingVideoInput);
      } catch (_) {}
    }
  }, [stagingVideoInput]);

  useEffect(() => {
    if (stagingAudioInput) {
      try {
        localStorage.setItem('intoai_presentation_selected_mic', stagingAudioInput);
      } catch (_) {}
    }
  }, [stagingAudioInput]);

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
      localStorage.setItem('intoai_presentation_aec', String(stagingAec));
    } catch (_) {}
  }, [stagingAec]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_agc', String(stagingAgc));
    } catch (_) {}
  }, [stagingAgc]);

  useEffect(() => {
    try {
      localStorage.setItem('intoai_presentation_native_ans', String(stagingAns));
    } catch (_) {}
  }, [stagingAns]);

  const handleStagingJoin = async () => {
    if (!stagingName.trim()) return;

    if (!/^[A-Za-z\s]+$/.test(stagingName.trim())) {
      alert("Name is not allowed for security reasons. Only letters and spaces are allowed.");
      return;
    }

    // If in visitor mode and not authenticated, register guest account now!
    const searchParams = new URLSearchParams(window.location.search);
    const inviteToken = searchParams.get('inviteToken');

    if (isSharedMode && !account && inviteToken) {
      try {
        const res = await fetch('/api/presentation/rooms/join-guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inviteToken,
            name: stagingName.trim(),
          }),
        });
        if (!res.ok) {
          throw new Error('Failed to register guest user');
        }

        try {
          localStorage.setItem('intoai_guest_name', stagingName.trim());
          document.cookie = `intoai_guest_name=${encodeURIComponent(stagingName.trim())}; path=/; SameSite=Lax; max-age=31536000`;
        } catch (_) {}

        authService.session.revalidate();
        await authService.session.waitForRevalidation();
      } catch (err) {
        console.error('[Staging Join] Failed to create guest account:', err);
        alert(
          'Failed to join the presentation room. Please check your invite link or connection.'
        );
        return;
      }
    }

    // Clean up staging previews
    if (stagingTrackRef.current) {
      stagingTrackRef.current.close();
      stagingTrackRef.current = null;
    }
    if (stagingAudioTrackRef.current) {
      stagingAudioTrackRef.current.close();
      stagingAudioTrackRef.current = null;
    }
    if (stagingAudioVolumeInterval.current) {
      clearInterval(stagingAudioVolumeInterval.current);
    }

    onJoin({
      name: stagingName.trim(),
      micOn: stagingMicOn,
      camOn: stagingCamOn,
      videoInput: stagingVideoInput,
      audioInput: stagingAudioInput,
      virtualBg: activeVirtualBg,
      customBgImage,
      aiNoiseSuppression: stagingAiNoiseSuppression,
      aecOn: stagingAec,
      agcOn: stagingAgc,
      nativeAnsOn: stagingAns,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--affine-background-secondary-color)',
        color: 'var(--affine-text-primary-color)',
        fontFamily: 'var(--affine-font-family, system-ui, sans-serif)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--affine-background-primary-color)',
          border: '1px solid var(--affine-border-color)',
          borderRadius: '24px',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.05)',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '100%', maxWidth: '200px', maxHeight: '56px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '12px' }}>
            <img
              src={displayLogo}
              alt="One Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
          {(room as any)?.name && (room as any)?.name !== 'Live Meeting' && (
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.5px',
                color: 'var(--affine-text-primary-color)',
              }}
            >
              {(room as any).name}
            </h1>
          )}
          <p
            style={{
              color: 'var(--affine-text-secondary-color)',
              fontSize: '13px',
              marginTop: '6px',
            }}
          >
            Please set up your audio and video before joining the meeting
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
            alignItems: 'start',
          }}
        >
          {/* Left: Camera Preview & Media Toggles */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div
              style={{
                width: '100%',
                aspectRatio: '16/9',
                background: 'var(--affine-background-secondary-color)',
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid var(--affine-border-color)',
                boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.02)',
              }}
            >
              {stagingCamOn ? (
                <video
                  ref={stagingVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'var(--affine-background-primary-color)',
                      border: '1px solid var(--affine-border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--affine-text-secondary-color)',
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--affine-text-secondary-color)',
                    }}
                  >
                    Camera is turned off
                  </span>
                </div>
              )}
            </div>

            {/* Toggles */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--affine-background-secondary-color)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--affine-border-color)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--affine-text-primary-color)',
                    }}
                  >
                    Microphone
                  </span>
                  {!allowAudio && (
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--affine-error-color, #ef4444)',
                        fontWeight: 550,
                      }}
                    >
                      Disabled by Host
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setStagingMicOn(p => !p)}
                  disabled={!allowAudio}
                  style={{
                    width: '46px',
                    height: '24px',
                    borderRadius: '12px',
                    background: !allowAudio
                      ? 'rgba(239, 68, 68, 0.15)'
                      : stagingMicOn
                        ? 'var(--affine-brand-color, #1e96eb)'
                        : 'rgba(120,120,128,0.2)',
                    border: 'none',
                    position: 'relative',
                    cursor: !allowAudio ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s ease',
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: '3px',
                      left: stagingMicOn && allowAudio ? '25px' : '3px',
                      transition: 'all 0.25s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--affine-background-secondary-color)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--affine-border-color)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--affine-text-primary-color)',
                    }}
                  >
                    Camera
                  </span>
                  {!allowVideo && (
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--affine-error-color, #ef4444)',
                        fontWeight: 550,
                      }}
                    >
                      Disabled by Host
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setStagingCamOn(p => !p)}
                  disabled={!allowVideo}
                  style={{
                    width: '46px',
                    height: '24px',
                    borderRadius: '12px',
                    background: !allowVideo
                      ? 'rgba(239, 68, 68, 0.15)'
                      : stagingCamOn
                        ? 'var(--affine-brand-color, #1e96eb)'
                        : 'rgba(120,120,128,0.2)',
                    border: 'none',
                    position: 'relative',
                    cursor: !allowVideo ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s ease',
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: '3px',
                      left: stagingCamOn && allowVideo ? '25px' : '3px',
                      transition: 'all 0.25s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Right: User Form & Device Selection & Advanced Configs */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              justifyContent: 'flex-start',
            }}
          >
            {/* Name Input */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--affine-text-secondary-color)',
                }}
              >
                Your Display Name
              </label>
              <input
                type="text"
                placeholder="Enter your name to join..."
                value={stagingName}
                onChange={e => setStagingName(e.target.value)}
                maxLength={25}
                style={{
                  width: '100%',
                  background: 'var(--affine-background-secondary-color)',
                  border: stagingName.trim().toLowerCase() === 'guest'
                    ? '1px solid #ef4444'
                    : '1px solid var(--affine-border-color)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  color: 'var(--affine-text-primary-color)',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={e =>
                  (e.target.style.borderColor =
                    stagingName.trim().toLowerCase() === 'guest'
                      ? '#ef4444'
                      : 'var(--affine-brand-color, #1e96eb)')
                }
                onBlur={e =>
                  (e.target.style.borderColor =
                    stagingName.trim().toLowerCase() === 'guest'
                      ? '#ef4444'
                      : 'var(--affine-border-color)')
                }
                onKeyDown={e => {
                  if (
                    e.key === 'Enter' &&
                    stagingName.trim() &&
                    stagingName.trim().toLowerCase() !== 'guest'
                  ) {
                    handleStagingJoin();
                  }
                }}
              />
              {stagingName.trim().toLowerCase() === 'guest' && (
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 650,
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '2px',
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
                  The name &quot;Guest&quot; is not allowed.
                </div>
              )}
            </div>

            {/* Dropdowns */}
             {/* Device settings Tabs */}
             {(() => {
               const showAudioTab = stagingMicOn;
               const showVideoTab = stagingCamOn;
               const showAnyTab = showAudioTab || showVideoTab;

               return (
                 <>
                   {showAnyTab && (
                     <div
                       style={{
                         display: 'flex',
                         borderBottom: '1px solid var(--affine-border-color)',
                         gap: '16px',
                         marginBottom: '8px',
                       }}
                     >
                       {showAudioTab && (
                         <button
                           type="button"
                           onClick={() => setActiveTab('audio')}
                           style={{
                             padding: '8px 16px 12px 16px',
                             border: 'none',
                             background: 'transparent',
                             color: activeTab === 'audio'
                               ? 'var(--affine-brand-color, #1e96eb)'
                               : 'var(--affine-text-secondary-color)',
                             fontWeight: 700,
                             fontSize: '13px',
                             cursor: 'pointer',
                             borderBottom: activeTab === 'audio'
                               ? '2px solid var(--affine-brand-color, #1e96eb)'
                               : '2px solid transparent',
                             marginBottom: '-1px',
                             transition: 'all 0.2s ease',
                           }}
                         >
                           Audio Settings
                         </button>
                       )}
                       {showVideoTab && (
                         <button
                           type="button"
                           onClick={() => setActiveTab('video')}
                           style={{
                             padding: '8px 16px 12px 16px',
                             border: 'none',
                             background: 'transparent',
                             color: activeTab === 'video'
                               ? 'var(--affine-brand-color, #1e96eb)'
                               : 'var(--affine-text-secondary-color)',
                             fontWeight: 700,
                             fontSize: '13px',
                             cursor: 'pointer',
                             borderBottom: activeTab === 'video'
                               ? '2px solid var(--affine-brand-color, #1e96eb)'
                               : '2px solid transparent',
                             marginBottom: '-1px',
                             transition: 'all 0.2s ease',
                           }}
                         >
                           Video Settings
                         </button>
                       )}
                     </div>
                   )}

                   {!showAnyTab && (
                     <div
                       style={{
                         fontSize: '12px',
                         color: 'var(--affine-text-secondary-color)',
                         textAlign: 'center',
                         padding: '24px',
                         background: 'var(--affine-background-secondary-color)',
                         borderRadius: '12px',
                         border: '1px dashed var(--affine-border-color)',
                       }}
                     >
                       Enable Microphone or Camera to configure settings.
                     </div>
                   )}

                   {/* Audio Tab Panel */}
                   {activeTab === 'audio' && showAudioTab && audioInputs.length > 0 && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                         <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--affine-text-secondary-color)' }}>
                           Select Audio Source
                         </label>
                         <select
                           value={stagingAudioInput}
                           onChange={e => setStagingAudioInput(e.target.value)}
                           style={{
                             width: '100%',
                             background: 'var(--affine-background-secondary-color)',
                             border: '1px solid var(--affine-border-color)',
                             borderRadius: '10px',
                             padding: '10px 14px',
                             color: 'var(--affine-text-primary-color)',
                             fontSize: '12px',
                             outline: 'none',
                             cursor: 'pointer',
                           }}
                         >
                           {audioInputs.map(d => (
                             <option key={d.deviceId} value={d.deviceId}>
                               {d.label || 'Microphone'}
                             </option>
                           ))}
                         </select>

                          {/* Interactive AEC / AGC / ANS toggles */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '4px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                className={`agora-settings-mini-toggle ${stagingAec ? 'on' : 'off'}`}
                                onClick={() => setStagingAec(p => !p)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span
                                style={{ fontSize: '10px', fontWeight: 600, color: 'var(--affine-text-primary-color)', cursor: 'pointer' }}
                                onClick={() => setStagingAec(p => !p)}
                                title="Acoustic Echo Cancellation"
                              >
                                AEC
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                className={`agora-settings-mini-toggle ${stagingAgc ? 'on' : 'off'}`}
                                onClick={() => setStagingAgc(p => !p)}
                                style={{ cursor: 'pointer' }}
                              />
                              <span
                                style={{ fontSize: '10px', fontWeight: 600, color: 'var(--affine-text-primary-color)', cursor: 'pointer' }}
                                onClick={() => setStagingAgc(p => !p)}
                                title="Automatic Gain Control"
                              >
                                AGC
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                className={`agora-settings-mini-toggle ${stagingAns && !stagingAiNoiseSuppression ? 'on' : 'off'}`}
                                onClick={() => {
                                  if (!stagingAiNoiseSuppression) setStagingAns(p => !p);
                                }}
                                disabled={stagingAiNoiseSuppression}
                                style={{ cursor: stagingAiNoiseSuppression ? 'not-allowed' : 'pointer' }}
                              />
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: stagingAiNoiseSuppression
                                    ? 'var(--affine-text-secondary-color)'
                                    : 'var(--affine-text-primary-color)',
                                  cursor: stagingAiNoiseSuppression ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => {
                                  if (!stagingAiNoiseSuppression) setStagingAns(p => !p);
                                }}
                                title="Active Noise Suppression"
                              >
                                {stagingAiNoiseSuppression ? 'ANS (Bypassed)' : 'ANS'}
                              </span>
                            </div>
                          </div>
                       </div>

                       {/* AI Noise Suppression option */}
                       <div
                         style={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'space-between',
                           background: 'var(--affine-background-secondary-color)',
                           padding: '12px 16px',
                           borderRadius: '12px',
                           border: '1px solid var(--affine-border-color)',
                           gap: '12px',
                           marginTop: '4px',
                         }}
                       >
                         <div style={{ display: 'flex', alignItems: 'center' }}>
                           <span
                             style={{
                               fontSize: '12.5px',
                               fontWeight: 600,
                               color: 'var(--affine-text-primary-color)',
                               userSelect: 'none',
                             }}
                           >
                             Enable AI noise suppression
                           </span>
                           <span
                             style={{
                               background: 'rgba(30, 150, 235, 0.1)',
                               color: 'var(--affine-brand-color, #1e96eb)',
                               padding: '2px 6px',
                               borderRadius: '4px',
                               fontSize: '9px',
                               fontWeight: 700,
                               marginLeft: '8px',
                               textTransform: 'uppercase',
                               letterSpacing: '0.5px',
                             }}
                           >
                             Beta
                           </span>
                         </div>
                         <button
                           type="button"
                           onClick={() => setStagingAiNoiseSuppression(p => !p)}
                           style={{
                             width: '46px',
                             height: '24px',
                             borderRadius: '12px',
                             background: stagingAiNoiseSuppression
                               ? 'var(--affine-brand-color, #1e96eb)'
                               : 'rgba(120,120,128,0.2)',
                             border: 'none',
                             position: 'relative',
                             cursor: 'pointer',
                             transition: 'all 0.25s ease',
                             padding: 0,
                             flexShrink: 0,
                           }}
                         >
                           <div
                             style={{
                               width: '18px',
                               height: '18px',
                               borderRadius: '50%',
                               background: '#fff',
                               position: 'absolute',
                               top: '3px',
                               left: stagingAiNoiseSuppression ? '25px' : '3px',
                               transition: 'all 0.25s ease',
                               boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                             }}
                           />
                         </button>
                       </div>

                       <div
                         style={{
                           fontSize: '10px',
                           color: 'var(--affine-text-secondary-color)',
                           lineHeight: '1.4',
                           background: 'rgba(30, 150, 235, 0.04)',
                           border: '1px solid rgba(30, 150, 235, 0.1)',
                           borderRadius: '8px',
                           padding: '10px 12px',
                           marginTop: '2px',
                         }}
                       >
                         <strong>Note:</strong> Native noise suppression is already enabled. AI noise suppression works only on compatible systems and is recommended only for very noisy environments.
                       </div>
                     </div>
                   )}

                   {/* Video Tab Panel */}
                   {activeTab === 'video' && showVideoTab && videoInputs.length > 0 && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                         <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--affine-text-secondary-color)' }}>
                           Select Video Source
                         </label>
                         <select
                           value={stagingVideoInput}
                           onChange={e => setStagingVideoInput(e.target.value)}
                           style={{
                             width: '100%',
                             background: 'var(--affine-background-secondary-color)',
                             border: '1px solid var(--affine-border-color)',
                             borderRadius: '10px',
                             padding: '10px 14px',
                             color: 'var(--affine-text-primary-color)',
                             fontSize: '12px',
                             outline: 'none',
                             cursor: 'pointer',
                           }}
                         >
                           {videoInputs.map(d => (
                             <option key={d.deviceId} value={d.deviceId}>
                               {d.label || 'Camera'}
                             </option>
                           ))}
                         </select>
                       </div>

                       <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                         <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--affine-text-secondary-color)' }}>
                           Virtual Background
                         </label>
                         <select
                           value={activeVirtualBg}
                           onChange={e => setActiveVirtualBg(e.target.value as any)}
                           style={{
                             width: '100%',
                             background: 'var(--affine-background-secondary-color)',
                             border: '1px solid var(--affine-border-color)',
                             borderRadius: '8px',
                             padding: '8px 10px',
                             color: 'var(--affine-text-primary-color)',
                             fontSize: '11.5px',
                             outline: 'none',
                             cursor: 'pointer',
                           }}
                         >
                           <option value="none">None</option>
                           <option value="blur">Background Blur</option>
                           <option value="office">Office Room</option>
                           <option value="beach">Sunny Beach</option>
                           <option value="custom">Custom Image...</option>
                         </select>
                       </div>

                       {activeVirtualBg === 'custom' && (
                         <div
                           style={{
                             display: 'flex',
                             flexDirection: 'column',
                             gap: '4px',
                             animation: 'presentScaleUp 0.18s ease',
                           }}
                         >
                           <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--affine-text-secondary-color)' }}>
                             Upload Image
                           </label>
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
                               fontSize: '10.5px',
                               color: 'var(--affine-text-secondary-color)',
                             }}
                           />
                         </div>
                       )}
                     </div>
                   )}
                 </>
               );
             })()}

            {/* Mic Volume Tester */}
            {stagingMicOn && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--affine-text-secondary-color)',
                  }}
                >
                  <span>Microphone Test Meter</span>
                  <span>{stagingAudioLevel}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--affine-background-secondary-color)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid var(--affine-border-color)',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${stagingAudioLevel}%`,
                      background:
                        'linear-gradient(90deg, #10b981, var(--affine-brand-color, #1e96eb))',
                      transition: 'width 0.1s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Join Action button */}
            {(() => {
              const isInvalidGuestName =
                !stagingName.trim() || stagingName.trim().toLowerCase() === 'guest';
              return (
                <button
                  onClick={() => {
                    if (isInvalidGuestName) return;
                    handleStagingJoin();
                  }}
                  disabled={isInvalidGuestName}
                  style={{
                    width: '100%',
                    background: isInvalidGuestName
                      ? 'var(--affine-hover-color)'
                      : 'var(--affine-brand-color, #1e96eb)',
                    color: isInvalidGuestName
                      ? 'var(--affine-text-secondary-color)'
                      : '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '16px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isInvalidGuestName ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: isInvalidGuestName
                      ? 'none'
                      : '0 8px 24px rgba(30, 150, 235, 0.2)',
                    marginTop: '10px',
                  }}
                >
                  {requiresApproval ? 'Request to Join Meeting' : 'Join Meeting'}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
