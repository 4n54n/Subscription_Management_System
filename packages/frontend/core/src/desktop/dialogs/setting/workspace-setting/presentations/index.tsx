import { useEffect, useState, useRef } from 'react';
import { Button, useConfirmModal, Modal, Switch } from '@affine/component';
import { OpenInNewIcon } from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';

import { WorkspaceService } from '@affine/core/modules/workspace';
import {
  PresentationService,
  getDefaultMeetingTimes,
  calculateEndTime,
} from '../../../../../modules/presentation';
import type { PresentationRoom } from '../../../../../modules/presentation/types';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';

/** Minimal inline button styles keyed to CSS variables, not hard-coded colours */
const btnBase: React.CSSProperties = {
  height: '28px',
  padding: '0 12px',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'opacity 0.15s ease',
};

export const WorkspaceSettingPresentations = () => {
  const workspaceService = useService(WorkspaceService);
  const presentationService = useService(PresentationService);
  const { openConfirmModal } = useConfirmModal();

  const [rooms, setRooms] = useState<PresentationRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAttendeesRoom, setSelectedAttendeesRoom] = useState<PresentationRoom | null>(null);
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});

  const workspace = workspaceService.workspace;

  const getRoomAttendeeEmails = (room: PresentationRoom) => {
    const p = (room.permissions as any) || {};
    const items = new Map<string, string>();

    const add = (val: any) => {
      if (!val) return;
      if (typeof val === 'string') {
        const clean = val.trim();
        if (clean) items.set(clean.toLowerCase(), clean);
      } else if (typeof val === 'object') {
        const str = (val.email || val.name || val.id || val.userId || '').toString().trim();
        if (str) items.set(str.toLowerCase(), str);
      }
    };

    const checkArray = (arr: any) => {
      if (Array.isArray(arr)) arr.forEach(add);
    };

    checkArray((room as any).invitedEmails);
    checkArray((room as any).invitedMembers);
    checkArray((room as any).workspaceMembers);
    checkArray((room as any).members);

    checkArray(p.workspaceMembers);
    checkArray(p.workspaceUsers);
    checkArray(p.invitedMembers);
    checkArray(p.members);
    checkArray(p.customEmails);
    checkArray(p.invitedEmails);
    checkArray(p.emails);
    checkArray(p.guestEmails);

    return Array.from(items.values());
  };

  const loadRooms = async () => {
    try {
      const data = await presentationService.listRooms(workspace.id);
      setRooms(data);
    } catch (e) {
      console.error('Failed to load presentation rooms history', e);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceMembers = async () => {
    try {
      const res = await fetch(`/api/presentation/workspace-members?workspaceId=${workspace.id}`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const map: Record<string, string> = {};
          list.forEach((m: any) => {
            if (m.email) {
              map[m.email.toLowerCase()] = m.name || m.email.split('@')[0] || '';
            }
          });
          setMemberMap(map);
        }
      }
    } catch (e) {
      console.error('Failed to load workspace members for history dialog', e);
    }
  };

  useEffect(() => {
    loadRooms();
    loadWorkspaceMembers();
  }, [workspace.id]);

  const [editingRoom, setEditingRoom] = useState<PresentationRoom | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editTimezone, setEditTimezone] = useState('(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi');
  const [editTzSearch, setEditTzSearch] = useState('');
  const [showEditTzDropdown, setShowEditTzDropdown] = useState(false);
  const editTzDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editTzDropdownRef.current && !editTzDropdownRef.current.contains(e.target as Node)) {
        setShowEditTzDropdown(false);
      }
    };
    if (showEditTzDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEditTzDropdown]);
  const [editWorkspaceMembers, setEditWorkspaceMembers] = useState<any[]>([]);
  const [editSelectedEmails, setEditSelectedEmails] = useState<string[]>([]);
  const [editManualEmails, setEditManualEmails] = useState<string[]>([]);
  const [editManualInput, setEditManualInput] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAllowTranslation, setEditAllowTranslation] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const handleEditStartDateChange = (newStartDate: string) => {
    setEditStartDate(newStartDate);
    if (newStartDate && editStartTime) {
      const end = calculateEndTime(newStartDate, editStartTime);
      if (end) {
        setEditEndDate(end.endDate);
      }
    }
  };

  const handleEditStartTimeChange = (newStartTime: string) => {
    setEditStartTime(newStartTime);
    if (editStartDate && newStartTime) {
      const end = calculateEndTime(editStartDate, newStartTime);
      if (end) {
        setEditEndDate(end.endDate);
        setEditEndTime(end.endTime);
      }
    }
  };

  const openEditModal = async (room: PresentationRoom) => {
    setEditingRoom(room);
    const perm = (room.permissions || {}) as any;
    setEditTitle(perm.title || getDocTitle(room.docId));
    setEditDescription(perm.description || '');

    const def = getDefaultMeetingTimes();
    if (perm.startTime) {
      const s = perm.startTime.split('T');
      setEditStartDate(s[0] || def.startDate);
      setEditStartTime(s[1]?.slice(0, 5) || def.startTime);
    } else {
      setEditStartDate(def.startDate);
      setEditStartTime(def.startTime);
    }

    if (perm.endTime) {
      const e = perm.endTime.split('T');
      setEditEndDate(e[0] || def.endDate);
      setEditEndTime(e[1]?.slice(0, 5) || def.endTime);
    } else {
      setEditEndDate(def.endDate);
      setEditEndTime(def.endTime);
    }

    if (perm.timezone) {
      setEditTimezone(perm.timezone);
    }

    setEditAllowTranslation(perm.allowTranslation ?? perm.allowGuestTranslation ?? false);
    setEditManualInput('');
    setEditNote('');

    // Extract all room attendee emails (including custom external emails)
    const allRoomEmails = getRoomAttendeeEmails(room);

    let currentWsMembers: any[] = editWorkspaceMembers;
    try {
      const res = await fetch(`/api/presentation/workspace-members?workspaceId=${workspace.id}`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          currentWsMembers = list;
          setEditWorkspaceMembers(list);
        }
      }
    } catch (e) {
      console.error('Failed to load workspace members for edit modal', e);
    }

    const wsEmailSet = new Set(currentWsMembers.map((m: any) => m.email?.toLowerCase()).filter(Boolean));
    const selectedWs: string[] = [];
    const customManual: string[] = [];

    allRoomEmails.forEach(email => {
      const lower = email.toLowerCase();
      if (wsEmailSet.has(lower)) {
        selectedWs.push(email);
      } else {
        customManual.push(email);
      }
    });

    setEditSelectedEmails(selectedWs);
    setEditManualEmails(customManual);
    setEditModalOpen(true);
  };

  const handleSaveEditMeeting = async () => {
    if (!editingRoom) return;
    setEditSaving(true);
    try {
      const allRecipients = Array.from(new Set([...editSelectedEmails, ...editManualEmails]));

      // 1. Extract existing attendee emails before the edit
      const initialEmails = new Set(getRoomAttendeeEmails(editingRoom).map(e => e.toLowerCase()));

      // 2. Identify ONLY newly added users
      const newlyAddedRecipients = allRecipients.filter(
        email => !initialEmails.has(email.toLowerCase())
      );

      // 3. Send invitation emails ONLY to newly added users (not to all users again!)
      if (newlyAddedRecipients.length > 0) {
        await presentationService.sendRoomInvitations({
          workspaceId: workspace.id,
          inviteToken: editingRoom.inviteToken,
          docId: editingRoom.docId,
          emails: newlyAddedRecipients,
          note: editNote,
        });
      }

      // 4. Update the room record with all updated attendee emails in the database
      await presentationService.updateRoom(editingRoom.id, {
        title: editTitle,
        description: editDescription,
        startTime: editStartDate + 'T' + editStartTime,
        endTime: editEndDate + 'T' + editEndTime,
        timezone: editTimezone,
        invitedEmails: allRecipients,
        allowTranslation: editAllowTranslation,
        allowGuestTranslation: editAllowTranslation,
      });

      setEditModalOpen(false);

      // 5. Instantly update local state so "Attendees: X info" box updates immediately
      setRooms(prev =>
        prev.map(r =>
          r.id === editingRoom.id
            ? {
                ...r,
                invitedEmails: allRecipients,
                permissions: {
                  ...(r.permissions || {}),
                  invitedEmails: allRecipients,
                  allowTranslation: editAllowTranslation,
                  allowGuestTranslation: editAllowTranslation,
                },
              }
            : r
        )
      );

      if (selectedAttendeesRoom && selectedAttendeesRoom.id === editingRoom.id) {
        setSelectedAttendeesRoom(prev =>
          prev
            ? {
                ...prev,
                invitedEmails: allRecipients,
                permissions: {
                  ...(prev.permissions || {}),
                  invitedEmails: allRecipients,
                  allowTranslation: editAllowTranslation,
                  allowGuestTranslation: editAllowTranslation,
                },
              }
            : null
        );
      }

      await loadRooms();
    } catch (e) {
      console.error('Failed to save updated meeting details', e);
    } finally {
      setEditSaving(false);
    }
  };

  const handleCancelMeeting = (roomItem: PresentationRoom) => {
    const roomId = roomItem.id;
    openConfirmModal({
      title: 'Cancel Presentation Meeting',
      description:
        'Are you sure you want to cancel this scheduled presentation meeting? A cancellation notification email will be sent to all attendees.',
      confirmText: 'Cancel Meeting',
      cancelText: 'Keep Scheduled',
      confirmButtonOptions: {
        variant: 'error',
      },
      onConfirm: async () => {
        try {
          const allAttendeeEmails = getRoomAttendeeEmails(roomItem);
          await presentationService.cancelRoom(roomId, {
            workspaceId: workspace.id,
            inviteToken: roomItem.inviteToken,
            docId: roomItem.docId,
            emails: allAttendeeEmails,
          });
          setRooms(prev =>
            prev.map(r =>
              r.id === roomId ? { ...r, status: 'ended' as const } : r
            )
          );
          await loadRooms();
        } catch (e) {
          console.error('Failed to cancel meeting', e);
        }
      },
    });
  };

  const handleEndRoom = (roomId: string) => {
    openConfirmModal({
      title: 'End Presentation Room',
      description:
        'Are you sure you want to end this presentation room? All guests will be disconnected.',
      confirmText: 'End Room',
      cancelText: 'Cancel',
      confirmButtonOptions: {
        variant: 'error',
      },
      onConfirm: async () => {
        try {
          const tempDocId = `temp-${roomId}`;
          workspace.docCollection.removeDoc(tempDocId);
        } catch (err) {
          console.error('Failed to remove temp doc on end', err);
        }

        try {
          await presentationService.endRoom(roomId);
          setRooms(prev =>
            prev.map(r =>
              r.id === roomId ? { ...r, status: 'ended' as const } : r
            )
          );
        } catch (e) {
          console.error('Failed to end presentation room', e);
        }
      },
    });
  };

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const getDocTitle = (docId: string) => {
    return (
      workspace.docCollection.meta.docMetas.find(meta => meta.id === docId)
        ?.title || 'Untitled document'
    );
  };

  return (
    <>
      <SettingHeader
        title="Live Presentations History"
        subtitle="Manage your live presentation rooms, copy invite URLs, or rejoin active meetings."
      />
      <SettingWrapper title="History Logs">
        {loading ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: cssVar('textSecondaryColor'),
            }}
          >
            Loading history...
          </div>
        ) : rooms.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              border: `1.5px dashed ${cssVar('borderColor')}`,
              borderRadius: '12px',
              color: cssVar('textSecondaryColor'),
              fontSize: '13px',
            }}
          >
            No presentation history found for this workspace.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: 'calc(85vh - 240px)',
              overflowY: 'auto',
              paddingRight: '6px',
            }}
          >
            {rooms.map(room => {
              const isActive = room.status === 'active';
              const inviteUrl = `${window.location.origin}/join/${room.inviteToken}`;
              const hasRecipients =
                (room.invitedEmails || room.permissions?.invitedEmails || [])
                  .length > 0;

              const locks = room.permissions?.lockContentFor;
              const activeLocks = Array.isArray(locks)
                ? locks
                : locks === 'guests'
                  ? ['guests']
                  : locks === 'me'
                    ? ['me']
                    : [];
              const lockVal =
                activeLocks.length === 0
                  ? 'None'
                  : activeLocks
                      .map(x => ({ me: 'Me', guests: 'Guests' })[x] || x)
                      .join(' & ');

              const allowedMedia = [];
              if (room.permissions?.allowVideo ?? room.permissions?.allowGuestVideo) allowedMedia.push('Video');
              if (room.permissions?.allowAudio ?? room.permissions?.allowGuestAudio) allowedMedia.push('Audio');
              if (room.permissions?.allowScreenShare ?? room.permissions?.allowGuestScreenShare) allowedMedia.push('Screen');
              const mediaVal =
                allowedMedia.length > 0 ? allowedMedia.join(', ') : 'None';

              return (
                <div
                  key={room.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: isActive
                      ? '1px solid rgba(30, 136, 229, 0.4)'
                      : `1px solid ${cssVar('borderColor')}`,
                    background: isActive
                      ? 'rgba(30, 136, 229, 0.04)'
                      : cssVar('backgroundPrimaryColor'),
                    boxShadow: isActive
                      ? '0 4px 18px rgba(30, 136, 229, 0.12)'
                      : 'none',
                    opacity: isActive ? 1 : 0.8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Row: Title, Status Badge & Action Capsule Button Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 650,
                          color: cssVar('textPrimaryColor'),
                        }}
                      >
                        {getDocTitle(room.docId)}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: isActive
                            ? 'rgba(34, 197, 94, 0.12)'
                            : 'rgba(113, 113, 122, 0.12)',
                          color: isActive
                            ? '#16a34a'
                            : cssVar('textSecondaryColor'),
                          border: isActive
                            ? '1px solid rgba(34, 197, 94, 0.25)'
                            : '1px solid rgba(113, 113, 122, 0.2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        {isActive && (
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#16a34a',
                              boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)',
                            }}
                          />
                        )}
                        {isActive ? 'Active' : 'Ended'}
                      </span>
                    </div>

                    {/* Action Buttons styled in clean Capsule Container */}
                    {isActive && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '10px',
                          background: cssVar('backgroundSecondaryColor'),
                          border: `1px solid ${cssVar('borderColor')}`,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <button
                          onClick={() => handleCopy(room.id, inviteUrl)}
                          style={{
                            ...btnBase,
                            height: '30px',
                            background: cssVar('backgroundPrimaryColor'),
                            color: cssVar('textPrimaryColor'),
                            border: `1px solid ${cssVar('borderColor')}`,
                          }}
                        >
                          {copiedId === room.id ? '✓ Copied Link' : 'Copy Link'}
                        </button>

                        <button
                          onClick={() => openEditModal(room)}
                          style={{
                            ...btnBase,
                            height: '30px',
                            background: cssVar('backgroundPrimaryColor'),
                            color: cssVar('brandColor'),
                            border: `1px solid ${cssVar('borderColor')}`,
                          }}
                        >
                          Update Meeting
                        </button>

                        <button
                          onClick={() => handleCancelMeeting(room)}
                          style={{
                            ...btnBase,
                            height: '30px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: cssVar('errorColor'),
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                          }}
                          title="Cancel meeting & send cancellation email to all attendees"
                        >
                          Cancel Meeting
                        </button>

                        <button
                          onClick={() => handleEndRoom(room.id)}
                          style={{
                            ...btnBase,
                            height: '30px',
                            background: 'rgba(245, 158, 11, 0.08)',
                            color: '#d97706',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                          }}
                          title="End meeting immediately without sending email notification"
                        >
                          End Meeting
                        </button>

                        <button
                          onClick={() => {
                            window.open(
                              `/workspace/${workspace.id}/present/${room.id}`,
                              '_blank',
                              'noopener'
                            );
                          }}
                          style={{
                            ...btnBase,
                            height: '30px',
                            background: cssVar('brandColor'),
                            color: '#ffffff',
                            boxShadow: '0 2px 8px rgba(30, 136, 229, 0.25)',
                          }}
                        >
                          <OpenInNewIcon style={{ fontSize: '13px' }} />
                          Rejoin
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Timestamp & Metadata Badges */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      paddingTop: '8px',
                      borderTop: `1px dashed ${cssVar('borderColor')}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: cssVar('textSecondaryColor'),
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Created by:</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: cssVar('textPrimaryColor'),
                        }}
                      >
                        {room.hostUser?.name ||
                          room.hostUser?.email?.split('@')[0] ||
                          'User'}
                      </span>
                      <span>•</span>
                      <span>{new Date(room.createdAt).toLocaleString()}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Row 1: Lock, Join Without Approval, Private Chat */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            Lock:
                          </span>
                          <span
                            style={{
                              color: cssVar('textPrimaryColor'),
                              fontWeight: 500,
                            }}
                          >
                            {lockVal}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            Join Without Approval:
                          </span>
                          <span
                            style={{
                              color: cssVar('textPrimaryColor'),
                              fontWeight: 500,
                            }}
                          >
                            {room.permissions?.allowWithoutPermission !== false
                              ? 'On'
                              : 'Off'}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            Private Chat:
                          </span>
                          <span
                            style={{
                              color: cssVar('textPrimaryColor'),
                              fontWeight: 500,
                            }}
                          >
                            {room.permissions?.privateChat ? 'On' : 'Off'}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Media, Translation, Attendees */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            Media:
                          </span>
                          <span
                            style={{
                              color: cssVar('textPrimaryColor'),
                              fontWeight: 500,
                            }}
                          >
                            {mediaVal}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              color: cssVar('textSecondaryColor'),
                            }}
                          >
                            Translation:
                          </span>
                          <span
                            style={{
                              color: (room.permissions?.allowTranslation ?? room.permissions?.allowGuestTranslation)
                                ? '#16a34a'
                                : cssVar('textPrimaryColor'),
                              fontWeight: (room.permissions?.allowTranslation ?? room.permissions?.allowGuestTranslation)
                                ? 600
                                : 500,
                            }}
                          >
                            {(room.permissions?.allowTranslation ?? room.permissions?.allowGuestTranslation)
                              ? 'On (STT)'
                              : 'Off'}
                          </span>
                        </div>

                        {/* Attendees Count & Info Button */}
                        {(() => {
                          const attendeeEmails = getRoomAttendeeEmails(room);
                          const totalCount = attendeeEmails.length;

                          return (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                background: totalCount > 0 ? 'rgba(15, 98, 254, 0.08)' : 'transparent',
                                padding: totalCount > 0 ? '3px 10px' : '0',
                                borderRadius: '6px',
                                border: totalCount > 0 ? '1px solid rgba(15, 98, 254, 0.2)' : 'none',
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: cssVar('textSecondaryColor'),
                                }}
                              >
                                Attendees:
                              </span>
                              <span
                                style={{
                                  color: totalCount > 0 ? cssVar('brandColor') : cssVar('textPrimaryColor'),
                                  fontWeight: 700,
                                }}
                              >
                                {totalCount}
                              </span>
                              {totalCount > 0 && (
                                <button
                                  onClick={() => setSelectedAttendeesRoom(room)}
                                  style={{
                                    border: '1px solid rgba(15, 98, 254, 0.3)',
                                    background: 'rgba(15, 98, 254, 0.12)',
                                    color: cssVar('brandColor'),
                                    borderRadius: '12px',
                                    padding: '1px 7px',
                                    height: '20px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    marginLeft: '4px',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title="Click to view all attendee emails and names"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                  <span>info</span>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SettingWrapper>

      {/* Edit / Update Scheduled Meeting Modal */}
      {editModalOpen && editingRoom && (
        <Modal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          width={520}
          closeButtonOptions={{
            style: {
              top: '16px',
              right: '16px',
            },
          }}
          contentOptions={{
            style: {
              position: 'relative',
              padding: '24px',
              background: cssVar('backgroundPrimaryColor'),
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              maxHeight: '85vh',
              overflowY: 'auto',
            },
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>
                Update Scheduled Meeting
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: cssVar('textSecondaryColor') }}>
                Reschedule meeting time, update title, agenda, and manage participants.
              </p>
            </div>

            {/* Meeting Details Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: cssVar('backgroundSecondaryColor'), borderRadius: '8px', border: `1px solid ${cssVar('borderColor')}` }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>Meeting Schedule & Details</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional meeting agenda..."
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px', outline: 'none', resize: 'none' }}
                />
              </div>

              {/* Start Date & Time */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Start Date</label>
                  <input type="date" value={editStartDate} onChange={e => handleEditStartDateChange(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Start Time</label>
                  <input type="time" value={editStartTime} onChange={e => handleEditStartTimeChange(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px' }} />
                </div>
              </div>

              {/* End Date & Time */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>End Date</label>
                  <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>End Time</label>
                  <input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} style={{ padding: '6px 8px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px' }} />
                </div>
              </div>

              {/* Timezone */}
              <div ref={editTzDropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: cssVar('textSecondaryColor') }}>Timezone</label>
                <div
                  onClick={() => setShowEditTzDropdown(prev => !prev)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editTimezone}</span>
                  <span style={{ fontSize: '10px', color: cssVar('textSecondaryColor') }}>▼</span>
                </div>
                {showEditTzDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: cssVar('backgroundPrimaryColor'), border: `1px solid ${cssVar('borderColor')}`, borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '6px', maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input
                      type="text"
                      placeholder="Search timezone..."
                      value={editTzSearch}
                      onChange={e => setEditTzSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: '4px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundSecondaryColor'), color: cssVar('textPrimaryColor'), fontSize: '11px', outline: 'none' }}
                    />
                    {[
                      '(UTC-08:00) Pacific Time (US & Canada)',
                      '(UTC-05:00) Eastern Time (US & Canada)',
                      '(UTC+00:00) London, Dublin, Lisbon',
                      '(UTC+01:00) Paris, Berlin, Madrid, Rome',
                      '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
                      '(UTC+08:00) Singapore, Hong Kong, Beijing',
                      '(UTC+09:00) Tokyo, Seoul',
                    ].filter(tz => tz.toLowerCase().includes(editTzSearch.toLowerCase())).map(tz => (
                      <div
                        key={tz}
                        onClick={() => { setEditTimezone(tz); setShowEditTzDropdown(false); }}
                        style={{ padding: '6px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', background: editTimezone === tz ? `${cssVar('brandColor')}15` : 'transparent', color: editTimezone === tz ? cssVar('brandColor') : cssVar('textPrimaryColor') }}
                      >
                        {tz}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Audio Translation Toggle Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: cssVar('backgroundPrimaryColor'),
                  border: `1px solid ${cssVar('borderColor')}`,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>
                      Live Audio Translation
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        color: cssVar('brandColor'),
                        fontWeight: 600,
                        background: `${cssVar('brandColor')}15`,
                        padding: '1px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      STT
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: cssVar('textSecondaryColor') }}>
                    Real-time speech transcription and multi-language translation
                  </span>
                </div>
                <Switch
                  checked={editAllowTranslation}
                  onChange={setEditAllowTranslation}
                />
              </div>
            </div>

            {/* Edit Workspace Participants Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: cssVar('backgroundSecondaryColor'), borderRadius: '8px', border: `1px solid ${cssVar('borderColor')}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: cssVar('textPrimaryColor') }}>Manage Participants</span>
                {editWorkspaceMembers.length > 0 && (
                  <span
                    onClick={() => {
                      if (editSelectedEmails.length === editWorkspaceMembers.length) {
                        setEditSelectedEmails([]);
                      } else {
                        setEditSelectedEmails(editWorkspaceMembers.map(m => m.email));
                      }
                    }}
                    style={{ fontSize: '11px', fontWeight: 600, color: cssVar('brandColor'), cursor: 'pointer' }}
                  >
                    {editSelectedEmails.length === editWorkspaceMembers.length ? 'Deselect All' : 'Select All'}
                  </span>
                )}
              </div>

              {/* Workspace Members List */}
              {editWorkspaceMembers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {editWorkspaceMembers.map(m => {
                    const isSelected = editSelectedEmails.includes(m.email);
                    return (
                      <div
                        key={m.id || m.email}
                        onClick={() => {
                          setEditSelectedEmails(prev =>
                            prev.includes(m.email)
                              ? prev.filter(x => x !== m.email)
                              : [...prev, m.email]
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: isSelected ? `${cssVar('brandColor')}15` : cssVar('backgroundPrimaryColor'),
                          border: `1px solid ${isSelected ? cssVar('brandColor') : cssVar('borderColor')}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: cssVar('brandColor'), color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(m.name || m.email).charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: cssVar('textPrimaryColor') }}>{m.name || m.email}</span>
                        </div>
                        <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: cssVar('brandColor') }} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Custom Email */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="email"
                  placeholder="Enter external guest email..."
                  value={editManualInput}
                  onChange={e => setEditManualInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && editManualInput.trim()) {
                      e.preventDefault();
                      if (!editManualEmails.includes(editManualInput.trim())) {
                        setEditManualEmails(prev => [...prev, editManualInput.trim()]);
                      }
                      setEditManualInput('');
                    }
                  }}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: `1px solid ${cssVar('borderColor')}`, background: cssVar('backgroundPrimaryColor'), color: cssVar('textPrimaryColor'), fontSize: '12px', outline: 'none' }}
                />
                <Button
                  onClick={() => {
                    if (editManualInput.trim() && !editManualEmails.includes(editManualInput.trim())) {
                      setEditManualEmails(prev => [...prev, editManualInput.trim()]);
                      setEditManualInput('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              {/* Manual Emails Tag List */}
              {editManualEmails.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {editManualEmails.map(email => (
                    <span
                      key={email}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', background: `${cssVar('brandColor')}15`, color: cssVar('brandColor'), fontSize: '11px', fontWeight: 500 }}
                    >
                      {email}
                      <span
                        onClick={() => setEditManualEmails(prev => prev.filter(x => x !== email))}
                        style={{ cursor: 'pointer', fontWeight: 700 }}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <Button
                variant="secondary"
                onClick={() => setEditModalOpen(false)}
                style={{ flex: 1, padding: '8px 0' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditMeeting}
                disabled={editSaving}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: cssVar('brandColor'),
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {editSaving ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Attendees Details Modal Popup */}
      {selectedAttendeesRoom && (
        <Modal
          open={!!selectedAttendeesRoom}
          onOpenChange={open => !open && setSelectedAttendeesRoom(null)}
          width={480}
          closeButtonOptions={{
            style: {
              top: '16px',
              right: '16px',
            },
          }}
          contentOptions={{
            style: {
              position: 'relative',
              padding: '24px',
              background: cssVar('backgroundPrimaryColor'),
              borderRadius: '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              maxHeight: '80vh',
              overflowY: 'auto',
            },
          }}
        >
          {(() => {
            const emails = getRoomAttendeeEmails(selectedAttendeesRoom);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(15, 98, 254, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cssVar('brandColor') }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: cssVar('textPrimaryColor') }}>
                      Invited Attendees
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: cssVar('textSecondaryColor') }}>
                      {getDocTitle(selectedAttendeesRoom.docId)} • {emails.length} Total Invited • Translation: {(selectedAttendeesRoom.permissions?.allowTranslation ?? selectedAttendeesRoom.permissions?.allowGuestTranslation) ? 'Enabled (STT)' : 'Disabled'}
                    </p>
                  </div>
                </div>

                {/* List of Attendees */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                  {emails.map(email => {
                    const lower = email.toLowerCase();
                    const name = memberMap[lower] || null;
                    const displayName = name ? name : 'Guest';
                    const isGuest = !name;

                    return (
                      <div
                        key={email}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: cssVar('backgroundSecondaryColor'),
                          border: `1px solid ${cssVar('borderColor')}`,
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isGuest ? '#8b5cf6' : cssVar('brandColor'),
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: cssVar('textPrimaryColor'),
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {displayName}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                color: cssVar('textSecondaryColor'),
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {email}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            flexShrink: 0,
                            background: isGuest ? 'rgba(139, 92, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                            color: isGuest ? '#8b5cf6' : '#16a34a',
                            border: isGuest ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(34, 197, 94, 0.25)',
                          }}
                        >
                          {isGuest ? 'Guest' : 'Member'}
                        </span>
                      </div>
                    );
                  })}

                  {emails.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: cssVar('textSecondaryColor'), fontSize: '12px' }}>
                      No invited attendees recorded for this presentation room.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button
                    onClick={() => setSelectedAttendeesRoom(null)}
                    style={{
                      padding: '8px 20px',
                      background: cssVar('brandColor'),
                      color: '#ffffff',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </>
  );
};
