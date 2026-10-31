import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@affine/admin/components/ui/avatar';
import { FeatureType } from '@affine/graphql';
import {
  AccountIcon,
  EmailIcon,
  EmailWarningIcon,
  LockIcon,
  UnlockIcon,
} from '@blocksuite/icons/rc';
import type { ColumnDef } from '@tanstack/react-table';
import { cssVarV2 } from '@toeverything/theme/v2';
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useMemo,
  useState,
  useEffect,
} from 'react';

import { Checkbox } from '../../../components/ui/checkbox';
import type { UserType } from '../schema';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';

const PhishActionButton = ({ userId }: { userId: string }) => {
  const [isMonitored, setIsMonitored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titleMsg, setTitleMsg] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetPhishUsers {
            phishMonitoredUsers {
              userId
              status
              msMailboxStatus
            }
          }
        `,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (active && data?.data?.phishMonitoredUsers) {
          const found = data.data.phishMonitoredUsers.find((u: any) => u.userId === userId);
          if (found && (found.status === 'monitored' || found.status === 'unchecked' || found.status === 'failed')) {
            setIsMonitored(true);
            setTitleMsg(found.msMailboxStatus || '');
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      if (isMonitored) {
        const mutation = `
          mutation RemovePhish($userId: String!) {
            removeUserFromPhishMonitoring(userId: $userId)
          }
        `;
        const res = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: mutation, variables: { userId } }),
        });
        const data = await res.json();
        if (data?.data?.removeUserFromPhishMonitoring) {
          setIsMonitored(false);
          setTitleMsg('Removed from Phish Monitoring');
        }
      } else {
        const mutation = `
          mutation FetchMailbox($userId: String!) {
            fetchUserMicrosoftMailbox(userId: $userId) {
              id
              status
              msMailboxStatus
            }
          }
        `;
        const res = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: mutation, variables: { userId } }),
        });
        const data = await res.json();
        if (data?.data?.fetchUserMicrosoftMailbox) {
          const rec = data.data.fetchUserMicrosoftMailbox;
          setIsMonitored(rec.status === 'monitored' || rec.status === 'failed');
          setTitleMsg(rec.msMailboxStatus || '');
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={
        titleMsg ||
        (isMonitored
          ? 'Click to remove user from Phish Monitoring'
          : 'Click to verify MS Mailbox & add user to Phish Monitoring')
      }
      style={{
        background: isMonitored ? '#fef2f2' : '#ecfdf5',
        border: `1px solid ${isMonitored ? '#fca5a5' : '#a7f3d0'}`,
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 600,
        color: isMonitored ? '#b91c1c' : '#047857',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {loading
        ? 'Updating...'
        : isMonitored
          ? '- Remove from Phish'
          : '+ Add to Phish'}
    </button>
  );
};

const StatusItem = ({
  condition,
  IconTrue,
  IconFalse,
  textTrue,
  textFalse,
}: {
  condition: boolean | null;
  IconTrue: ReactNode;
  IconFalse: ReactNode;
  textTrue: string;
  textFalse: string;
}) => (
  <div
    className="flex gap-1 items-center"
    style={{
      color: condition ? cssVarV2('text/secondary') : cssVarV2('status/error'),
    }}
  >
    {condition ? (
      <>
        {IconTrue}
        {textTrue}
      </>
    ) : (
      <>
        {IconFalse}
        {textFalse}
      </>
    )}
  </div>
);
export const useColumns = ({
  setSelectedUserIds,
}: {
  setSelectedUserIds: Dispatch<SetStateAction<Set<string>>>;
}) => {
  const columns: ColumnDef<UserType>[] = useMemo(() => {
    return [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => {
              if (value) {
                setSelectedUserIds(
                  prev =>
                    new Set([
                      ...prev,
                      ...table
                        .getFilteredRowModel()
                        .rows.map(row => row.original.id),
                    ])
                );
              } else {
                // remove selected users in the current page
                setSelectedUserIds(
                  prev =>
                    new Set(
                      [...prev].filter(
                        id =>
                          !table
                            .getFilteredRowModel()
                            .rows.some(row => row.original.id === id)
                      )
                    )
                );
              }

              table.toggleAllPageRowsSelected(!!value);
            }}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => {
              if (value) {
                setSelectedUserIds(prev => new Set([...prev, row.original.id]));
              } else {
                setSelectedUserIds(
                  prev =>
                    new Set([...prev].filter(id => id !== row.original.id))
                );
              }
              row.toggleSelected(!!value);
            }}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'info',
        header: ({ column }) => (
          <DataTableColumnHeader
            className="text-xs"
            column={column}
            title="Name"
          />
        ),
        cell: ({ row }) => (
          <div className="flex gap-4 items-center max-w-[50vw] overflow-hidden">
            <Avatar className="w-10 h-10">
              <AvatarImage src={row.original.avatarUrl ?? undefined} />
              <AvatarFallback>
                <AccountIcon fontSize={20} />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 max-w-full overflow-hidden">
              <div className="text-sm font-medium max-w-full overflow-hidden gap-[6px]">
                <span>{row.original.name}</span>
                {row.original.features.includes(FeatureType.Admin) && (
                  <span
                    className="ml-2 rounded px-2 py-0.5 text-xs h-5 border text-center inline-flex items-center font-normal"
                    style={{
                      borderRadius: '4px',
                      backgroundColor: cssVarV2('chip/label/blue'),
                      borderColor: cssVarV2('layer/insideBorder/border'),
                    }}
                  >
                    Admin
                  </span>
                )}
                {row.original.disabled && (
                  <span
                    className="ml-2 rounded px-2 py-0.5 text-xs h-5 border"
                    style={{
                      borderRadius: '4px',
                      backgroundColor: cssVarV2('chip/label/white'),
                      borderColor: cssVarV2('layer/insideBorder/border'),
                    }}
                  >
                    Disabled
                  </span>
                )}
              </div>
              <div
                className="text-xs font-medium max-w-full overflow-hidden"
                style={{
                  color: cssVarV2('text/secondary'),
                }}
              >
                {row.original.email}
              </div>
            </div>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'property',
        header: ({ column }) => (
          <DataTableColumnHeader
            className="text-xs max-md:hidden"
            column={column}
            title="UUID"
          />
        ),
        cell: ({ row: { original: user } }) => (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-2 text-xs max-md:hidden">
              <div className="flex justify-start">{user.id}</div>
              <div className="flex gap-3 items-center justify-start">
                <StatusItem
                  condition={user.hasPassword}
                  IconTrue={
                    <LockIcon
                      fontSize={16}
                      color={cssVarV2('selfhost/icon/tertiary')}
                    />
                  }
                  IconFalse={
                    <UnlockIcon
                      fontSize={16}
                      color={cssVarV2('toast/iconState/error')}
                    />
                  }
                  textTrue="Password Set"
                  textFalse="No Password"
                />
                <StatusItem
                  condition={user.emailVerified}
                  IconTrue={
                    <EmailIcon
                      fontSize={16}
                      color={cssVarV2('selfhost/icon/tertiary')}
                    />
                  }
                  IconFalse={
                    <EmailWarningIcon
                      fontSize={16}
                      color={cssVarV2('toast/iconState/error')}
                    />
                  }
                  textTrue="Email Verified"
                  textFalse="Email Not Verified"
                />
                <span className="text-xs" style={{ color: cssVarV2('text/secondary') }}>
                  Quota: {user.storageQuotaGB ?? (user.features?.some(f => f === FeatureType.Admin || f === ('administrator' as any) || f === ('admin' as any)) ? 100 : 10)} GB
                </span>
                <PhishActionButton userId={user.id} />
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: ({ column }) => (
          <DataTableColumnHeader
            className="text-xs"
            column={column}
            title="Actions"
          />
        ),
        cell: ({ row: { original: user } }) => (
          <DataTableRowActions user={user} />
        ),
      },
    ];
  }, [setSelectedUserIds]);
  return columns;
};
