import test from 'ava';
import { PrismaClient } from '@prisma/client';

import { createTestingModule, TestingModule } from '../../../__tests__/utils';
import {
  Models,
  User,
  Workspace,
  WorkspaceMemberStatus,
  WorkspaceRole,
} from '../../../models';
import { PermissionModule } from '..';
import { mapWorkspaceRoleToPermissions } from '../types';
import { WorkspaceAccessController } from '../workspace';

let module: TestingModule;
let models: Models;
let ac: WorkspaceAccessController;
let user: User;
let ws: Workspace;

test.before(async () => {
  module = await createTestingModule({ imports: [PermissionModule] });
  models = module.get<Models>(Models);
  ac = new WorkspaceAccessController(models, module.get(PrismaClient));
});

test.beforeEach(async () => {
  await module.initTestingDB();
  user = await models.user.create({ email: 'u1@affine.pro' });
  ws = await models.workspace.create(user.id);
});

test.after.always(async () => {
  await module.close();
});

test('should get null role', async t => {
  const role = await ac.getRole({
    workspaceId: 'ws1',
    userId: 'u1',
  });

  t.is(role, null);
});

test('should return null if role is not accepted', async t => {
  const u2 = await models.user.create({ email: 'u2@affine.pro' });
  await models.workspaceUser.set(
    ws.id,
    u2.id,
    WorkspaceRole.Collaborator,
    WorkspaceMemberStatus.UnderReview
  );

  const role = await ac.getRole({
    workspaceId: ws.id,
    userId: u2.id,
  });

  t.is(role, null);
});

test('should return [Owner] role if workspace is not found but local is allowed', async t => {
  const role = await ac.getRole({
    workspaceId: 'ws1',
    userId: 'u1',
    allowLocal: true,
  });

  t.is(role, WorkspaceRole.Owner);
});

test('should fallback to [External] if workspace is public', async t => {
  await models.workspace.update(ws.id, {
    public: true,
  });

  const role = await ac.getRole({
    workspaceId: ws.id,
    userId: 'random-user-id',
  });

  t.is(role, WorkspaceRole.External);
});

test('should return null even workspace has public doc', async t => {
  await models.doc.publish(ws.id, 'doc1');

  const role = await ac.getRole({
    workspaceId: ws.id,
    userId: 'random-user-id',
  });

  t.is(role, null);
});

test('should return mapped external permission for workspace has public docs', async t => {
  await models.doc.publish(ws.id, 'doc1');

  const { permissions } = await ac.role({
    workspaceId: ws.id,
    userId: 'random-user-id',
  });

  t.deepEqual(
    permissions,
    mapWorkspaceRoleToPermissions(WorkspaceRole.External)
  );
});

test('should return mapped permissions', async t => {
  const { permissions } = await ac.role({
    workspaceId: ws.id,
    userId: user.id,
  });

  t.deepEqual(permissions, mapWorkspaceRoleToPermissions(WorkspaceRole.Owner));
});

test('should assert action', async t => {
  await t.notThrowsAsync(
    ac.assert(
      { workspaceId: ws.id, userId: user.id },
      'Workspace.TransferOwner'
    )
  );

  const u2 = await models.user.create({ email: 'u2@affine.pro' });

  await t.throwsAsync(
    ac.assert({ workspaceId: ws.id, userId: u2.id }, 'Workspace.Sync')
  );

  await models.workspaceUser.set(
    ws.id,
    u2.id,
    WorkspaceRole.Admin,
    WorkspaceMemberStatus.Accepted
  );

  await t.notThrowsAsync(
    ac.assert(
      { workspaceId: ws.id, userId: u2.id },
      'Workspace.Settings.Update'
    )
  );
});

test('should return [Collaborator] role for active presentation guest session', async t => {
  const db = module.get(PrismaClient);

  // 1. Create a guest user (registered: false, email ends with @guest.presentation)
  const guestUser = await models.user.create({
    email: 'guest-session-123@guest.presentation',
    registered: false,
  });

  // 2. Create a presentation room in this workspace
  const room = await db.presentationRoom.create({
    data: {
      workspaceId: ws.id,
      docId: 'doc-1',
      hostUserId: user.id,
      inviteToken: 'invite-token-123',
      status: 'active',
    },
  });

  // 3. Create a guest session
  await db.presentationGuestSession.create({
    data: {
      userId: guestUser.id,
      roomId: room.id,
      inviteToken: 'invite-token-123',
    },
  });

  // 4. Assert getRole returns Collaborator
  const role = await ac.getRole({
    workspaceId: ws.id,
    userId: guestUser.id,
  });
  t.is(role, WorkspaceRole.Collaborator);

  // 5. Assert another workspace returns null (no access)
  const otherWs = await models.workspace.create(user.id);
  const otherRole = await ac.getRole({
    workspaceId: otherWs.id,
    userId: guestUser.id,
  });
  t.is(otherRole, null);

  // 6. Assert if room is ended, returns null
  await db.presentationRoom.update({
    where: { id: room.id },
    data: { status: 'ended' },
  });
  const endedRole = await ac.getRole({
    workspaceId: ws.id,
    userId: guestUser.id,
  });
  t.is(endedRole, null);
});
