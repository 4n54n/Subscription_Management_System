import { PrismaClient } from '@prisma/client';
import type { TestFn } from 'ava';
import ava from 'ava';

import { createModule, TestingModule } from './create-module';
import { AppModule } from '../app.module';
import { ProjectsService } from '../core/projects/service';
import { MockUser, MockWorkspace } from './mocks';

const test = ava as TestFn<{
  module: TestingModule;
  prisma: PrismaClient;
  service: ProjectsService;
  userId: string;
  workspaceId: string;
  projectId: string;
}>;

test.before(async t => {
  const module = await createModule({
    imports: [AppModule],
  });
  const prisma = module.get(PrismaClient);
  const service = module.get(ProjectsService);

  t.context.module = module;
  t.context.prisma = prisma;
  t.context.service = service;
});

test.beforeEach(async t => {
  const { prisma, module } = t.context;
  
  // Clean DB
  await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE workspaces CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE projects CASCADE');

  // Create seed user & workspace
  const uniqueEmail = `pm-${Math.random().toString(36).substring(2, 9)}@affine.pro`;
  const user = await module.create(MockUser, {
    email: uniqueEmail,
    name: 'Ansan Mathew',
    companyName: 'IntoAI Technologies',
    companyMail: 'ansan@intoai.co',
  } as any);

  const workspace = await module.create(MockWorkspace, {
    owner: user,
  });
  
  // Create project
  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'E-Commerce Platform',
      status: 'Active',
      visibility: 'WorkspaceWide',
      shareKey: 'test-share-key',
    },
  });

  t.context.userId = user.id;
  t.context.workspaceId = workspace.id;
  t.context.projectId = project.id;
});

test.after.always(async t => {
  await t.context.module.close();
});

test('should successfully upsert project document stubs and prevent edits on signed documents', async t => {
  const { service, workspaceId, projectId, prisma, userId } = t.context;

  // Create a release first
  const release = await prisma.projectRelease.create({
    data: {
      workspaceId,
      projectId,
      name: 'v1.0.0',
      status: 'Planned',
    },
  });

  // Upsert document
  const doc = await service.upsertProjectDocument(
    workspaceId,
    projectId,
    release.id,
    'BRD',
    'Business Requirements Document',
    'Default Content Scope',
    userId
  );

  t.is(doc.type, 'BRD');
  t.is(doc.status, 'Draft');
  t.is(doc.version, 1);

  // Lock document by marking client signed
  await (prisma as any).projectDocument.update({
    where: { id: doc.id },
    data: { status: 'SignedByClient' },
  });

  // Ensure upsert fails on signed document (Immutability Protection)
  await t.throwsAsync(
    service.upsertProjectDocument(
      workspaceId,
      projectId,
      release.id,
      'BRD',
      'Modified BRD',
      'Should Fail',
      userId
    ),
    { message: 'Approved/signed documents are immutable and cannot be updated.' }
  );
});

test('should fail to copy from previous version on initial release, and succeed on subsequent releases', async t => {
  const { service, workspaceId, projectId, prisma, userId } = t.context;

  // Release v1.0.0 (First)
  const rel1 = await prisma.projectRelease.create({
    data: {
      workspaceId,
      projectId,
      name: 'v1.0.0',
      status: 'Released',
      createdAt: new Date(Date.now() - 10000),
    },
  });

  // Release v2.0.0 (Second)
  const rel2 = await prisma.projectRelease.create({
    data: {
      workspaceId,
      projectId,
      name: 'v2.0.0',
      status: 'Planned',
      createdAt: new Date(),
    },
  });

  // 1. Copying on first release returns null (no previous release to copy from)
  const initialCopy = await service.copyDocumentFromPreviousVersion(workspaceId, projectId, rel1.id, 'SRS', userId);
  t.is(initialCopy, null);

  // 2. Create document in v1.0.0
  await (prisma as any).projectDocument.create({
    data: {
      workspaceId,
      projectId,
      releaseId: rel1.id,
      type: 'SRS',
      title: 'SRS v1',
      content: 'Functional requirements spec',
      status: 'Draft',
    },
  });

  // 3. Copying into v2.0.0 succeeds
  const copied = await service.copyDocumentFromPreviousVersion(workspaceId, projectId, rel2.id, 'SRS', userId);
  t.truthy(copied);
  t.is(copied?.title, 'SRS v1');
  t.is(copied?.content, 'Functional requirements spec');
  t.is(copied?.status, 'Draft');
});
