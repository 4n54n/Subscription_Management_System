import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Switch } from '@affine/component';
import { cssVar } from '@toeverything/theme';
import { useService } from '@toeverything/infra';
import {
  PresentationService,
  getDefaultMeetingTimes,
  calculateEndTime,
} from '../../../modules/presentation';
import type { RoomPermissions } from '../../../modules/presentation/types';
import { useQuery } from '@affine/core/components/hooks/use-query';
import { workspaceGeminiSettingQuery } from '@affine/graphql';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  docId: string;
  onJoinRoom: (roomId: string) => void;
}

const TIMEZONES = [
  '(UTC-11:00) Midway Island, Samoa',
  '(UTC-10:00) Hawaii',
  '(UTC-09:00) Alaska',
  '(UTC-08:00) Pacific Time (US & Canada)',
  '(UTC-07:00) Mountain Time (US & Canada)',
  '(UTC-06:00) Central Time (US & Canada), Mexico City',
  '(UTC-05:00) Eastern Time (US & Canada), Bogota, Lima',
  '(UTC-04:00) Atlantic Time (Canada), Caracas, La Paz',
  '(UTC-03:30) Newfoundland',
  '(UTC-03:00) Buenos Aires, Georgetown, Brasilia',
  '(UTC-02:00) Mid-Atlantic',
  '(UTC-01:00) Azores, Cape Verde Islands',
  '(UTC+00:00) Western European Time, London, Dublin, Lisbon',
  '(UTC+01:00) Central European Time, Paris, Berlin, Madrid, Rome',
  '(UTC+02:00) Eastern European Time, Athens, Cairo, Johannesburg',
  '(UTC+03:00) Moscow, St. Petersburg, Kuwait, Riyadh, Nairobi',
  '(UTC+03:30) Tehran',
  '(UTC+04:00) Abu Dhabi, Muscat, Baku, Tbilisi',
  '(UTC+04:30) Kabul',
  '(UTC+05:00) Tashkent, Islamabad, Karachi',
  '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
  '(UTC+05:45) Kathmandu',
  '(UTC+06:00) Almaty, Dhaka, Astana',
  '(UTC+06:30) Yangon (Rangoon)',
  '(UTC+07:00) Bangkok, Hanoi, Jakarta',
  '(UTC+08:00) Beijing, Hong Kong, Singapore, Taipei, Perth',
  '(UTC+09:00) Tokyo, Osaka, Sapporo, Seoul',
  '(UTC+09:30) Adelaide, Darwin',
  '(UTC+10:00) Sydney, Melbourne, Brisbane, Guam',
  '(UTC+11:00) Magadan, Solomon Islands, New Caledonia',
  '(UTC+12:00) Auckland, Wellington, Fiji, Kamchatka',
];

export const CreateRoomDialog = ({
  open,
  onOpenChange,
  workspaceId,
  docId,
  onJoinRoom,
}: CreateRoomDialogProps) => {
  const presentationService = useService(PresentationService);
  const [loading, setLoading] = useState(false);
  const [roomCreated, setRoomCreated] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Meeting Schedule & Details State
  const [meetingTitle, setMeetingTitle] = useState('Live Presentation Room');
  const [meetingDescription, setMeetingDescription] = useState('');
  const initialTimes = getDefaultMeetingTimes();
  const [startDate, setStartDate] = useState(initialTimes.startDate);
  const [startTime, setStartTime] = useState(initialTimes.startTime);
  const [endDate, setEndDate] = useState(initialTimes.endDate);
  const [endTime, setEndTime] = useState(initialTimes.endTime);
  const [selectedTimezone, setSelectedTimezone] = useState('(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi');
  const [tzSearch, setTzSearch] = useState('');
  const [showTzDropdown, setShowTzDropdown] = useState(false);
  const tzDropdownRef = useRef<HTMLDivElement>(null);

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    if (newStartDate && startTime) {
      const end = calculateEndTime(newStartDate, startTime);
      if (end) {
        setEndDate(end.endDate);
      }
    }
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    if (startDate && newStartTime) {
      const end = calculateEndTime(startDate, newStartTime);
      if (end) {
        setEndDate(end.endDate);
        setEndTime(end.endTime);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target as Node)) {
        setShowTzDropdown(false);
      }
    };
    if (showTzDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTzDropdown]);

  // Invitation Page State
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [fetchingMembers, setFetchingMembers] = useState(false);

  const { data } = useQuery({
    query: workspaceGeminiSettingQuery,
    variables: { workspaceId },
  });

  const [permissions, setPermissions] = useState<RoomPermissions>({
    allowGemini: true,
    allowVideo: false,
    allowAudio: false,
    allowScreenShare: false,
    allowWithoutPermission: true,
    allowTranslation: false,
    apiKey: '',
    limitOutput: false,
    privateChat: false,
    lockContentFor: [],
  });

  const [models, setModels] = useState<
    Array<{ name: string; displayName: string }>
  >([
    { name: 'gemini-3.5-flash', displayName: 'Gemini 3.5 Flash' },
    { name: 'gemini-3.5-pro', displayName: 'Gemini 3.5 Pro' },
    { name: 'gemini-3.0-pro', displayName: 'Gemini 3.0 Pro' },
    { name: 'gemini-3.0-flash', displayName: 'Gemini 3.0 Flash' },
    { name: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
    { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
    { name: 'gemini-2.0-pro-exp-02-05', displayName: 'Gemini 2.0 Pro (Experimental)' },
    { name: 'gemini-2.0-flash-thinking-exp-01-21', displayName: 'Gemini 2.0 Flash Thinking' },
    { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
    { name: 'gemini-2.0-flash-lite', displayName: 'Gemini 2.0 Flash-Lite' },
    { name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
    { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
    { name: 'gemini-1.5-flash-8b', displayName: 'Gemini 1.5 Flash 8B' },
  ]);

  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');

  // Reset dialog state when opened
  useEffect(() => {
    if (open) {
      setStep(1);
      setRoomCreated(null);
      setCopied(false);
      setManualEmails([]);
      setManualInput('');
      setInviteNote('');
      const defaultTimes = getDefaultMeetingTimes();
      setStartDate(defaultTimes.startDate);
      setStartTime(defaultTimes.startTime);
      setEndDate(defaultTimes.endDate);
      setEndTime(defaultTimes.endTime);
    }
  }, [open]);

  // Sync settings when loaded from DB
  useEffect(() => {
    if (data?.workspaceGeminiSetting) {
      const gs = data.workspaceGeminiSetting;
      setPermissions(prev => ({
        ...prev,
        allowGemini: gs.allowGemini,
        allowWithoutPermission: gs.allowWithoutPermission ?? true,
        apiKey: gs.apiKey || '',
        limitOutput: gs.limitOutput,
        lockContentFor: (() => {
          const val = gs.lockContentFor;
          if (Array.isArray(val)) return val as ('me' | 'guests')[];
          return [];
        })(),
      }));
      const rawModel = gs.meetingModel || 'gemini-2.5-flash';
      const cleanModel = rawModel.includes('3.') || rawModel.includes('1.0') ? 'gemini-2.5-flash' : rawModel;
      setSelectedModel(cleanModel);
    }
  }, [data]);

  // Fetch workspace members for page 2
  useEffect(() => {
    if (!open) return;
    let active = true;
    const fetchMembers = async () => {
      setFetchingMembers(true);
      try {
        const res = await fetch(
          `/api/presentation/workspace-members?workspaceId=${workspaceId}`
        );
        if (!res.ok) throw new Error('Failed to fetch workspace members');
        const list = await res.json();
        if (Array.isArray(list) && active) {
          setWorkspaceMembers(list);
          setSelectedEmails([]); // By default deselect all as requested
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setFetchingMembers(false);
      }
    };
    fetchMembers();
    return () => {
      active = false;
    };
  }, [open, workspaceId]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const fetchModels = async () => {
      try {
        const key = permissions.apiKey?.trim() || '';
        const res = await fetch(
          `/api/presentation/gemini/models?workspaceId=${workspaceId}&apiKey=${encodeURIComponent(key)}`
        );
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (Array.isArray(data) && active) {
          setModels(data);
          const exists = data.some((m: any) => m.name === selectedModel);
          if (!exists && data.length > 0) {
            setSelectedModel(data[0].name);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchModels();
    return () => {
      active = false;
    };
  }, [open, permissions.apiKey, workspaceId]);

  const handleToggle = (key: keyof RoomPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAllowAll = () => {
    const boolValues = [
      permissions.allowVideo,
      permissions.allowAudio,
      permissions.allowScreenShare,
    ];
    const allOn = !boolValues.every(Boolean);
    setPermissions(prev => ({
      ...prev,
      allowVideo: allOn,
      allowAudio: allOn,
      allowScreenShare: allOn,
    }));
  };

  const validatePage1 = () => {
    const hasSshCustom = permissions.sshHost || permissions.sshUser || permissions.sshPass;
    if (hasSshCustom && (!permissions.sshHost?.trim() || !permissions.sshUser?.trim())) {
      alert('IP/Host and Username are mandatory when entering custom Terminal SSH credentials.');
      return false;
    }
    return true;
  };

  const handleGoToPage2 = () => {
    if (validatePage1()) {
      setStep(2);
    }
  };

  const handleAddManualEmail = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!manualEmails.includes(trimmed) && !selectedEmails.includes(trimmed)) {
      setManualEmails(prev => [...prev, trimmed]);
    }
    setManualInput('');
  };

  const handleRemoveManualEmail = (emailToRemove: string) => {
    setManualEmails(prev => prev.filter(e => e !== emailToRemove));
  };

  const toggleSelectMember = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleCreateRoomProcess = async (sendMail: boolean) => {
    setLoading(true);
    try {
      const allRecipientEmails = Array.from(
        new Set([...selectedEmails, ...manualEmails])
      );
      const room = await presentationService.createRoom({
        workspaceId,
        docId,
        permissions: {
          ...permissions,
          title: meetingTitle,
          description: meetingDescription,
          startTime: `${startDate}T${startTime}:00`,
          endTime: `${endDate}T${endTime}:00`,
          timezone: selectedTimezone,
          invitedEmails: allRecipientEmails,
        },
        geminiModel: selectedModel,
      });

      if (sendMail) {
        const allRecipientEmails = Array.from(
          new Set([...selectedEmails, ...manualEmails])
        );
        if (allRecipientEmails.length > 0) {
          try {
            await fetch('/api/presentation/rooms/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workspaceId,
                inviteToken: room.inviteToken,
                docId,
                emails: allRecipientEmails,
                note: inviteNote,
              }),
            });
          } catch (err) {
            console.error('Failed to send room invitations', err);
          }
        }
      }

      setRoomCreated(room);

      // Copy invite URL to clipboard
      const inviteUrl = `${window.location.origin}/join/${room.inviteToken}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Failed to create presentation room', e);
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = roomCreated
    ? `${window.location.origin}/join/${roomCreated.inviteToken}`
    : '';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      width={480}
      contentOptions={{
        style: {
          padding: '24px',
          background: cssVar('backgroundPrimaryColor'),
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxHeight: 'calc(90vh - 48px)',
        }}
      >
        {/* Modal Header */}
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              margin: 0,
              color: cssVar('textPrimaryColor'),
            }}
          >
            {roomCreated
              ? 'Room Ready!'
              : step === 1
                ? 'Start a Live Presentation'
                : 'Send Meeting Invitations'}
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: cssVar('textSecondaryColor'),
              marginTop: '4px',
              margin: 0,
            }}
          >
            {roomCreated
              ? 'Invite attendees using the link below.'
              : step === 1
                ? 'Step 1 of 2: Configure meeting permissions before starting.'
                : 'Step 2 of 2: Choose workspace attendees or add manual emails.'}
          </p>

          {/* Indicator line under title */}
          {!roomCreated && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '12px',
              }}
            >
              <div
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background:
                    step >= 1 ? cssVar('brandColor') : cssVar('borderColor'),
                  cursor: 'pointer',
                  transition: 'background 0.3s ease',
                }}
                title="Step 1: Setup"
              />
              <div
                onClick={() => validatePage1() && setStep(2)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background:
                    step >= 2 ? cssVar('brandColor') : cssVar('borderColor'),
                  cursor: 'pointer',
                  transition: 'background 0.3s ease',
                }}
                title="Step 2: Invite Attendees"
              />
            </div>
          )}
        </div>

        {/* Modal Body Container with Horizontal Swipe Transition */}
        {!roomCreated ? (
          <div
            style={{
              position: 'relative',
              overflowX: 'hidden',
              overflowY: 'auto',
              width: '100%',
              paddingRight: '2px',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '200%',
                transform: step === 1 ? 'translateX(0%)' : 'translateX(-50%)',
                transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* PAGE 1: Room Configuration */}
              <div
                style={{
                  width: '50%',
                  paddingRight: '12px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: cssVar('textSecondaryColor'),
                    }}
                  >
                    Quick Setup
                  </span>
                  <Button variant="secondary" onClick={handleAllowAll}>
                    Toggle All
                  </Button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Allow Video */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        Allow Video
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVar('textSecondaryColor'),
                        }}
                      >
                        Let attendees turn on their webcam
                      </div>
                    </div>
                    <Switch
                      checked={permissions.allowVideo}
                      onChange={() => handleToggle('allowVideo')}
                    />
                  </div>

                  {/* Allow Audio */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        Allow Audio
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVar('textSecondaryColor'),
                        }}
                      >
                        Let attendees use microphone
                      </div>
                    </div>
                    <Switch
                      checked={permissions.allowAudio}
                      onChange={() => handleToggle('allowAudio')}
                    />
                  </div>

                  {/* Allow Screen Sharing */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        Allow Screen Sharing
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVar('textSecondaryColor'),
                        }}
                      >
                        Let attendees share screen
                      </div>
                    </div>
                    <Switch
                      checked={permissions.allowScreenShare}
                      onChange={() => handleToggle('allowScreenShare')}
                    />
                  </div>

                  {/* MISSING FIX: Allow Join Without Approval */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        Allow Join Without Approval
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVar('textSecondaryColor'),
                        }}
                      >
                        Let attendees join the presentation room directly without host approval
                      </div>
                    </div>
                    <Switch
                      checked={permissions.allowWithoutPermission}
                      onChange={() => handleToggle('allowWithoutPermission')}
                    />
                  </div>

                  {/* Private Chat for Attendees */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        Enable Private Chat for Attendees
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVar('textSecondaryColor'),
                        }}
                      >
                        Attendee messages are only visible to the host
                      </div>
                    </div>
                    <Switch
                      checked={permissions.privateChat || false}
                      onChange={() => handleToggle('privateChat')}
                    />
                  </div>

                  {/* Live Audio Translation Toggle (Agora STT) */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Live Audio Translation</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: 'rgba(15, 98, 254, 0.1)',
                            color: 'var(--affine-brand-color, #0f62fe)',
                          }}
                        >
                          STT
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVar('textSecondaryColor'),
                        }}
                      >
                        Real-time speech transcription and multi-language translation (Disabled by default)
                      </div>
                    </div>
                    <Switch
                      checked={permissions.allowTranslation || false}
                      onChange={() => handleToggle('allowTranslation')}
                    />
                  </div>

                  {/* SSH Auto-Login Configuration */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                      border: `1px solid ${cssVar('borderColor')}`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        Terminal SSH Auto-Login
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVar('textSecondaryColor'),
                        }}
                      >
                        Entering values below will override default workspace test server.
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '6px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: 0,
                          }}
                        >
                          <label
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            IP / HOST <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 192.168.1.100"
                            value={permissions.sshHost || ''}
                            onChange={e =>
                              setPermissions(prev => ({
                                ...prev,
                                sshHost: e.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              minWidth: 0,
                              boxSizing: 'border-box',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: `1px solid ${cssVar('borderColor')}`,
                              background: cssVar('backgroundPrimaryColor'),
                              color: cssVar('textPrimaryColor'),
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: 0,
                          }}
                        >
                          <label
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            USERNAME <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            value={permissions.sshUser || ''}
                            onChange={e =>
                              setPermissions(prev => ({
                                ...prev,
                                sshUser: e.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              minWidth: 0,
                              boxSizing: 'border-box',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: `1px solid ${cssVar('borderColor')}`,
                              background: cssVar('backgroundPrimaryColor'),
                              color: cssVar('textPrimaryColor'),
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: 0,
                          }}
                        >
                          <label
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            PASSWORD
                          </label>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={permissions.sshPass || ''}
                            onChange={e =>
                              setPermissions(prev => ({
                                ...prev,
                                sshPass: e.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              minWidth: 0,
                              boxSizing: 'border-box',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: `1px solid ${cssVar('borderColor')}`,
                              background: cssVar('backgroundPrimaryColor'),
                              color: cssVar('textPrimaryColor'),
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View Only Mode */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '10px 12px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        View Only Mode
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVar('textSecondaryColor'),
                        }}
                      >
                        Who cannot select, move, or edit pre-existing content
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {(['no-one', 'guests', 'me'] as const).map(opt => {
                        const labels: Record<string, string> = {
                          'no-one': 'No one',
                          guests: 'Guests',
                          me: 'Me',
                        };
                        const activeLocks = permissions.lockContentFor || [];
                        const isActive =
                          opt === 'no-one'
                            ? activeLocks.length === 0
                            : activeLocks.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              setPermissions(prev => {
                                const current = prev.lockContentFor || [];
                                let next: ('me' | 'guests')[];
                                if (opt === 'no-one') {
                                  next = [];
                                } else {
                                  if (current.includes(opt)) {
                                    next = current.filter(x => x !== opt);
                                  } else {
                                    next = [...current, opt];
                                  }
                                }
                                return { ...prev, lockContentFor: next };
                              });
                            }}
                            style={{
                              flex: 1,
                              padding: '6px 0',
                              borderRadius: '6px',
                              border: `1.5px solid ${isActive ? cssVar('brandColor') : cssVar('borderColor')}`,
                              background: isActive
                                ? `${cssVar('brandColor')}18`
                                : cssVar('backgroundPrimaryColor'),
                              color: isActive
                                ? cssVar('brandColor')
                                : cssVar('textSecondaryColor'),
                              fontSize: '12px',
                              fontWeight: isActive ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {labels[opt]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGoToPage2}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    marginTop: '10px',
                    background: cssVar('brandColor'),
                    color: '#fff',
                  }}
                >
                  Next: Schedule & Invite Attendees
                </Button>
              </div>

              {/* PAGE 2: Schedule & Invite Attendees */}
              <div
                style={{
                  width: '50%',
                  paddingLeft: '12px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Meeting Details & Schedule Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: cssVar('backgroundSecondaryColor'), borderRadius: '8px', border: `1px solid ${cssVar('borderColor')}` }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>Meeting Schedule & Details</span>

                  {/* Meeting Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Meeting Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Project Roadmap & Presentation"
                      value={meetingTitle}
                      onChange={e => setMeetingTitle(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px', outline: 'none' }}
                    />
                  </div>

                  {/* Description */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Description</label>
                    <textarea
                      rows={2}
                      placeholder="Optional meeting agenda or notes..."
                      value={meetingDescription}
                      onChange={e => setMeetingDescription(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px', outline: 'none', resize: 'none' }}
                    />
                  </div>

                  {/* Start Date & Time */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Start Date</label>
                      <input type="date" value={startDate} onChange={e => handleStartDateChange(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px' }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Start Time</label>
                      <input type="time" value={startTime} onChange={e => handleStartTimeChange(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px' }} />
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>End Date</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px' }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>End Time</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px' }} />
                    </div>
                  </div>

                  {/* Searchable Timezone Dropdown */}
                  <div ref={tzDropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Timezone</label>
                    <div
                      onClick={() => setShowTzDropdown(prev => !prev)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedTimezone}</span>
                      <span style={{ fontSize: '10px', color: cssVar('textSecondaryColor') }}>▼</span>
                    </div>
                    {showTzDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: cssVar('backgroundPrimaryColor'), border: `1px solid ${cssVar('borderColor')}`, borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '6px', maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <input
                          type="text"
                          placeholder="Search timezone..."
                          value={tzSearch}
                          onChange={e => setTzSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor'), fontSize: '11px', outline: 'none' }}
                        />
                        {TIMEZONES.filter(tz => tz.toLowerCase().includes(tzSearch.toLowerCase())).map(tz => (
                          <div
                            key={tz}
                            onClick={() => { setSelectedTimezone(tz); setShowTzDropdown(false); }}
                            style={{ padding: '6px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', background: selectedTimezone === tz ? cssVar('brandColor') + '15' : 'transparent', color: selectedTimezone === tz ? cssVar('brandColor') : cssVar('textPrimaryColor') }}
                          >
                            {tz}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Workspace Members Selection */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: cssVar('textPrimaryColor'),
                      }}
                    >
                      Workspace Attendees
                    </span>
                    {workspaceMembers.length > 0 && (
                      <span
                        onClick={() => {
                          if (selectedEmails.length === workspaceMembers.length) {
                            setSelectedEmails([]);
                          } else {
                            setSelectedEmails(workspaceMembers.map(m => m.email));
                          }
                        }}
                        style={{
                          fontSize: '11px',
                          color: cssVar('brandColor'),
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {selectedEmails.length === workspaceMembers.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '8px',
                      background: cssVar('backgroundSecondaryColor'),
                      borderRadius: '8px',
                      border: `1px solid ${cssVar('borderColor')}`,
                    }}
                  >
                    {fetchingMembers ? (
                      <div
                        style={{
                          fontSize: '12px',
                          color: cssVar('textSecondaryColor'),
                          padding: '10px',
                          textAlign: 'center',
                        }}
                      >
                        Loading workspace members...
                      </div>
                    ) : workspaceMembers.length === 0 ? (
                      <div
                        style={{
                          fontSize: '12px',
                          color: cssVar('textSecondaryColor'),
                          padding: '10px',
                          textAlign: 'center',
                        }}
                      >
                        No other members found in workspace.
                      </div>
                    ) : (
                      workspaceMembers.map(m => {
                        const isSelected = selectedEmails.includes(m.email);
                        return (
                          <div
                            key={m.id || m.email}
                            onClick={() => toggleSelectMember(m.email)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: isSelected
                                ? `${cssVar('brandColor')}12`
                                : cssVar('backgroundPrimaryColor'),
                              border: `1px solid ${isSelected ? cssVar('brandColor') : cssVar('borderColor')}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: cssVar('brandColor'),
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {(m.name || m.email)[0].toUpperCase()}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: cssVar('textPrimaryColor'),
                                  }}
                                >
                                  {m.name || m.email.split('@')[0]}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: cssVar('textSecondaryColor'),
                                  }}
                                >
                                  {m.email}
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Manual Email Addition */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: cssVar('textPrimaryColor'),
                    }}
                  >
                    Add External Email Addresses
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="email"
                      placeholder="e.g. attendee@company.com"
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualEmail();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${cssVar('borderColor')}`,
                        background: cssVar('backgroundPrimaryColor'),
                        color: cssVar('textPrimaryColor'),
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                    <Button variant="secondary" onClick={handleAddManualEmail}>
                      Add
                    </Button>
                  </div>

                  {manualEmails.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '4px',
                      }}
                    >
                      {manualEmails.map(email => (
                        <span
                          key={email}
                          style={{
                            fontSize: '11px',
                            background: cssVar('backgroundSecondaryColor'),
                            border: `1px solid ${cssVar('borderColor')}`,
                            borderRadius: '12px',
                            padding: '3px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: cssVar('textPrimaryColor'),
                          }}
                        >
                          {email}
                          <span
                            onClick={() => handleRemoveManualEmail(email)}
                            style={{
                              cursor: 'pointer',
                              fontWeight: 700,
                              marginLeft: '2px',
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            ×
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Note */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: cssVar('textPrimaryColor'),
                    }}
                  >
                    Personalized Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add an optional message to include in the invitation email..."
                    value={inviteNote}
                    onChange={e => setInviteNote(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${cssVar('borderColor')}`,
                      background: cssVar('backgroundPrimaryColor'),
                      color: cssVar('textPrimaryColor'),
                      fontSize: '12px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Page 2 Bottom Single Smart Primary Button */}
                <div style={{ marginTop: '8px' }}>
                  <Button
                    onClick={() =>
                      handleCreateRoomProcess(
                        selectedEmails.length + manualEmails.length > 0
                      )
                    }
                    loading={loading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '13px',
                      background: cssVar('brandColor'),
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {selectedEmails.length + manualEmails.length > 0
                      ? 'Invite & Create Presentation Room'
                      : 'Skip & Create Presentation Room'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ROOM CREATED SCREEN */
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '16px',
                background: cssVar('backgroundSecondaryColor'),
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: cssVar('textSecondaryColor'),
                  fontWeight: 500,
                }}
              >
                INVITE LINK
              </div>
              <div
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${cssVar('borderColor')}`,
                    background: cssVar('backgroundPrimaryColor'),
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                style={{ flex: 1, padding: '10px' }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  onJoinRoom(roomCreated.id);
                  onOpenChange(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: cssVar('brandColor'),
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                Join Now
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
