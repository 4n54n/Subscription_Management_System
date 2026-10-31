import { Button } from '@affine/admin/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@affine/admin/components/ui/card';
import { Badge } from '@affine/admin/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@affine/admin/components/ui/dialog';
import { affineFetch } from '@affine/admin/fetch-utils';
import { RefreshCw, Trash2, FileText, Container, Users, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ContainerInfo {
  id: string;
  name: string;
  roomId: string | null;
  status: string;
  created: string;
  isMeetingEnded: boolean;
  roomStatus: string | null;
}

interface CleanupStats {
  tempAccountsCount: number;
  clonedPagesCount: number;
  endedContainersCount: number;
  containers: ContainerInfo[];
}

interface ConfirmModalState {
  title: string;
  description: React.ReactNode;
  confirmText: string;
  onConfirm: () => Promise<void>;
}

export function MeetingCleanup() {
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingClonedPages, setDeletingClonedPages] = useState(false);
  const [deletingContainers, setDeletingContainers] = useState(false);
  const [clearingTempAccounts, setClearingTempAccounts] = useState(false);
  const [deletingSingleContainerId, setDeletingSingleContainerId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await affineFetch('/api/presentation/admin/cleanup-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        toast.error('Failed to load meeting cleanup statistics');
      }
    } catch (err: any) {
      toast.error(`Error loading stats: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const executeDeleteClonedPages = useCallback(async () => {
    try {
      setDeletingClonedPages(true);
      const res = await affineFetch('/api/presentation/admin/delete-cloned-pages', {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(`Successfully deleted ${result.deletedCount || 0} cloned meeting page(s).`);
        fetchStats();
      } else {
        toast.error('Failed to delete cloned meeting pages');
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message || err}`);
    } finally {
      setDeletingClonedPages(false);
    }
  }, [fetchStats]);

  const openDeleteClonedPagesDialog = useCallback(() => {
    if (!stats || stats.clonedPagesCount === 0) {
      toast.info('No cloned meeting pages for ended meetings to delete.');
      return;
    }

    setConfirmModal({
      title: 'Delete Cloned Meeting Pages?',
      description: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Found <span className="font-semibold text-foreground">{stats.clonedPagesCount}</span> cloned page(s) belonging to ended presentation meetings.
          </p>
          <p>
            Are you sure you want to delete these cloned meeting pages? This operation cannot be undone.
          </p>
        </div>
      ),
      confirmText: 'Delete Cloned Pages',
      onConfirm: executeDeleteClonedPages,
    });
  }, [stats, executeDeleteClonedPages]);

  const executeDeleteContainers = useCallback(async () => {
    try {
      setDeletingContainers(true);
      const res = await affineFetch('/api/presentation/admin/delete-containers', {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(`Successfully removed ${result.deletedCount || 0} ended meeting container(s).`);
        fetchStats();
      } else {
        toast.error('Failed to remove Docker containers');
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message || err}`);
    } finally {
      setDeletingContainers(false);
    }
  }, [fetchStats]);

  const openDeleteContainersDialog = useCallback(() => {
    if (!stats || stats.endedContainersCount === 0) {
      toast.info('No ended meeting Docker containers to delete.');
      return;
    }

    setConfirmModal({
      title: 'Delete Ended Containers?',
      description: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Found <span className="font-semibold text-foreground">{stats.endedContainersCount}</span> Docker container(s) belonging to ended or inactive presentation meetings.
          </p>
          <p className="text-amber-600 dark:text-amber-400 font-medium">
            Containers for active meetings will NOT be deleted.
          </p>
          <p>
            Are you sure you want to delete all ended meeting containers?
          </p>
        </div>
      ),
      confirmText: 'Delete Containers',
      onConfirm: executeDeleteContainers,
    });
  }, [stats, executeDeleteContainers]);

  const executeClearTempAccounts = useCallback(async () => {
    try {
      setClearingTempAccounts(true);
      const res = await affineFetch('/api/presentation/admin/clear-temp-accounts', {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(`Successfully cleared ${result.deletedCount || 0} temporary guest account(s).`);
        fetchStats();
      } else {
        toast.error('Failed to clear temporary guest accounts');
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message || err}`);
    } finally {
      setClearingTempAccounts(false);
    }
  }, [fetchStats]);

  const openClearTempAccountsDialog = useCallback(() => {
    if (!stats || stats.tempAccountsCount === 0) {
      toast.info('No temporary guest accounts found.');
      return;
    }

    setConfirmModal({
      title: 'Clear Temporary Guest Accounts?',
      description: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Found <span className="font-semibold text-foreground">{stats.tempAccountsCount}</span> temporary guest account(s) created for presentation rooms.
          </p>
          <p>
            Are you sure you want to delete all temporary guest accounts? This operation cannot be undone.
          </p>
        </div>
      ),
      confirmText: 'Clear Temp Accounts',
      onConfirm: executeClearTempAccounts,
    });
  }, [stats, executeClearTempAccounts]);

  const executeDeleteSingleContainer = useCallback(async (containerId: string) => {
    try {
      setDeletingSingleContainerId(containerId);
      const res = await affineFetch(`/api/presentation/admin/container/${containerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`Successfully removed container ${containerId.substring(0, 12)}.`);
        fetchStats();
      } else {
        toast.error('Failed to remove container');
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message || err}`);
    } finally {
      setDeletingSingleContainerId(null);
    }
  }, [fetchStats]);

  const openDeleteSingleContainerDialog = useCallback((containerId: string) => {
    setConfirmModal({
      title: 'Delete Docker Container?',
      description: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Are you sure you want to delete Docker container <span className="font-mono font-semibold text-foreground">{containerId.substring(0, 12)}</span>?
          </p>
          <p>
            This container will be permanently stopped and removed.
          </p>
        </div>
      ),
      confirmText: 'Delete Container',
      onConfirm: () => executeDeleteSingleContainer(containerId),
    });
  }, [executeDeleteSingleContainer]);

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    try {
      setActionInProgress(true);
      await confirmModal.onConfirm();
      setConfirmModal(null);
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-4 border-t border-border mt-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Meeting & Sandbox Maintenance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage leftover resources from presentation meetings, Docker sandbox containers, and guest accounts.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Cloned Pages */}
        <Card className="flex flex-col justify-between p-4 shadow-sm border">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground leading-snug">Cloned Meeting Pages</h3>
              </div>
              <Badge variant={stats && stats.clonedPagesCount > 0 ? 'secondary' : 'outline'} className="shrink-0 text-xs px-2.5 py-0.5 font-semibold">
                {stats ? stats.clonedPagesCount : 0} ended
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Document clones created when launching a meeting presentation, for meetings that have been marked as ended by the host.
            </p>
          </div>
          <div className="pt-4 mt-2">
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2 text-xs font-semibold cursor-pointer"
              onClick={openDeleteClonedPagesDialog}
              disabled={deletingClonedPages || !stats || stats.clonedPagesCount === 0}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingClonedPages ? 'Deleting...' : 'Delete Cloned Meeting Pages'}
            </Button>
          </div>
        </Card>

        {/* Card 2: Docker Containers */}
        <Card className="flex flex-col justify-between p-4 shadow-sm border">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Container className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground leading-snug">Terminal Sandboxes</h3>
              </div>
              <Badge variant={stats && stats.endedContainersCount > 0 ? 'secondary' : 'outline'} className="shrink-0 text-xs px-2.5 py-0.5 font-semibold">
                {stats ? stats.endedContainersCount : 0} inactive
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Docker containers created by the meeting terminal button. Active meeting containers are automatically protected.
            </p>
          </div>
          <div className="pt-4 mt-2">
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2 text-xs font-semibold cursor-pointer"
              onClick={openDeleteContainersDialog}
              disabled={deletingContainers || !stats || stats.endedContainersCount === 0}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingContainers ? 'Deleting...' : 'Delete Ended Containers'}
            </Button>
          </div>
        </Card>

        {/* Card 3: Clear Temp Accounts */}
        <Card className="flex flex-col justify-between p-4 shadow-sm border">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground leading-snug">Temp Guest Accounts</h3>
              </div>
              <Badge variant={stats && stats.tempAccountsCount > 0 ? 'secondary' : 'outline'} className="shrink-0 text-xs px-2.5 py-0.5 font-semibold">
                {stats ? stats.tempAccountsCount : 0} guest(s)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Temporary attendee guest user accounts created specifically for presentation room sessions.
            </p>
          </div>
          <div className="pt-4 mt-2">
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2 text-xs font-semibold cursor-pointer"
              onClick={openClearTempAccountsDialog}
              disabled={clearingTempAccounts || !stats || stats.tempAccountsCount === 0}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearingTempAccounts ? 'Clearing...' : 'Clear Temp Accounts'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Detailed Containers List */}
      {stats && stats.containers && stats.containers.length > 0 && (
        <Card className="mt-2 shadow-sm border">
          <CardHeader className="py-4 px-4 border-b bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center justify-between flex-wrap gap-2">
              <span>Docker Containers Created by Meeting Terminals</span>
              <span className="text-xs font-normal text-muted-foreground">
                Total: {stats.containers.length} ({stats.endedContainersCount} ended/inactive, {stats.containers.length - stats.endedContainersCount} active)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Container ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Room ID</th>
                    <th className="px-4 py-3">Meeting Status</th>
                    <th className="px-4 py-3">Container State</th>
                    <th className="px-4 py-3">Action Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.containers.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono">{c.id.substring(0, 12)}</td>
                      <td className="px-4 py-3 font-mono truncate max-w-[200px]" title={c.name}>{c.name}</td>
                      <td className="px-4 py-3 font-mono">{c.roomId ? c.roomId.substring(0, 8) + '...' : 'N/A'}</td>
                      <td className="px-4 py-3">
                        {c.roomStatus === 'active' ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-semibold">
                            Active
                          </Badge>
                        ) : c.roomStatus === 'ended' ? (
                          <Badge variant="outline" className="text-muted-foreground font-semibold">
                            Ended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 font-semibold">
                            No Room Record
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 truncate max-w-[140px] text-muted-foreground">{c.status}</td>
                      <td className="px-4 py-3">
                        {c.isMeetingEnded ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] gap-1 font-semibold cursor-pointer"
                            onClick={() => openDeleteSingleContainerDialog(c.id)}
                            disabled={deletingSingleContainerId === c.id}
                          >
                            <Trash2 className="w-3 h-3" />
                            {deletingSingleContainerId === c.id ? 'Deleting...' : 'Delete Container'}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Protected (Active)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal */}
      <Dialog
        open={Boolean(confirmModal)}
        onOpenChange={open => {
          if (!open && !actionInProgress) {
            setConfirmModal(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{confirmModal?.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-2">{confirmModal?.description}</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <div className="flex justify-end gap-2 items-center w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmModal(null)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmAction}
                disabled={actionInProgress}
                className="gap-1.5 cursor-pointer"
              >
                {actionInProgress && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {confirmModal?.confirmText}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
