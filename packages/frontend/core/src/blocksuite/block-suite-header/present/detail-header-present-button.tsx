import { useState } from 'react';
import { IconButton } from '@affine/component';
import { PresentationIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

import { DocService } from '@affine/core/modules/doc';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { CreateRoomDialog } from './create-room-dialog';

export const DetailPageHeaderPresentButton = () => {
  const workspaceService = useService(WorkspaceService);
  const docService = useService(DocService);
  const permissionService = useService(WorkspacePermissionService);

  const [dialogOpen, setDialogOpen] = useState(false);

  const workspace = workspaceService.workspace;
  const doc = docService.doc;
  const isOwner = useLiveData(permissionService.permission.isOwner$);

  // Only Workspace Owner can see and manage presentations
  if (!isOwner) {
    return null;
  }

  const handleJoinRoom = (roomId: string) => {
    window.open(`/workspace/${workspace.id}/present/${roomId}`, '_blank');
  };

  return (
    <>
      <IconButton
        style={{ flexShrink: 0 }}
        size="24"
        onClick={() => setDialogOpen(true)}
      >
        <PresentationIcon />
      </IconButton>

      <CreateRoomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspace.id}
        docId={doc.id}
        onJoinRoom={handleJoinRoom}
      />
    </>
  );
};
