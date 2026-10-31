import {
  Args,
  Field,
  Float,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { CryptoHelper, AccessDenied } from '../../base';
import { CurrentUser, Public } from '../auth';
import { AccessController } from '../permission';
import { UserType } from '../user/types';
import { ProjectsService } from './service';
import { GraphQLJSON } from 'graphql-scalars';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

// ================= OBJECT TYPES =================

@ObjectType()
class ProjectMemberType {
  @Field(() => ID)
  projectId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => UserType)
  user!: any;
}

@ObjectType()
class ProjectType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  icon!: string | null;

  @Field(() => String, { nullable: true })
  banner!: string | null;

  @Field(() => String, { nullable: true })
  color!: string | null;

  @Field(() => String, { nullable: true })
  category!: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  visibility!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => [ProjectMemberType], { nullable: true })
  restrictedMembers!: any[] | null;

  @Field(() => String, { nullable: true })
  projectManagerId!: string | null;

  @Field(() => String, { nullable: true })
  projectManagerName!: string | null;
}

@ObjectType()
class ProjectAnalyticsType {
  @Field(() => Float)
  totalIssues!: number;

  @Field(() => Float)
  completedTasks!: number;

  @Field(() => Float)
  openBugs!: number;

  @Field(() => String, { nullable: true })
  currentSprintName!: string | null;

  @Field(() => String, { nullable: true })
  upcomingReleaseVersion!: string | null;
}

@ObjectType()
class ProjectModuleType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  leadId!: string | null;

  @Field(() => UserType, { nullable: true })
  lead!: any | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
class ProjectCycleType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  goal!: string | null;

  @Field(() => Date, { nullable: true })
  startDate!: Date | null;

  @Field(() => Date, { nullable: true })
  endDate!: Date | null;

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
class ProjectReleaseType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => Date, { nullable: true })
  plannedDate!: Date | null;

  @Field(() => String)
  status!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  checklist!: any;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
class ProjectIssueLabelType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  color!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
class ProjectIssueLabelMappingType {
  @Field(() => ProjectIssueLabelType)
  label!: any;
}

@ObjectType()
class ProjectIssueAssigneeType {
  @Field(() => ID)
  issueId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => UserType)
  user!: any;
}

@ObjectType()
class ProjectIssueAttachmentType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  issueId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  blobKey!: string;

  @Field(() => Float)
  size!: number;

  @Field(() => String)
  mime!: string;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
class ProjectIssueDependencyType {
  @Field(() => ProjectIssueType)
  blockerIssue!: any;

  @Field(() => ProjectIssueType)
  blockedIssue!: any;
}

@ObjectType()
class ProjectIssueType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  priority!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Date, { nullable: true })
  dueDate!: Date | null;

  @Field(() => Float, { nullable: true })
  estimatedTime!: number | null;

  @Field(() => Float, { nullable: true })
  timeSpent!: number | null;

  @Field(() => String)
  reporterId!: string;

  @Field(() => UserType)
  reporter!: any;

  @Field(() => String, { nullable: true })
  cycleId!: string | null;

  @Field(() => ProjectCycleType, { nullable: true })
  cycle!: any | null;

  @Field(() => String, { nullable: true })
  moduleId!: string | null;

  @Field(() => ProjectModuleType, { nullable: true })
  module!: any | null;

  @Field(() => String, { nullable: true })
  releaseId!: string | null;

  @Field(() => ProjectReleaseType, { nullable: true })
  release!: any | null;

  @Field(() => String, { nullable: true })
  parentIssueId!: string | null;

  @Field(() => ProjectIssueType, { nullable: true })
  parentIssue!: any | null;

  @Field(() => [ProjectIssueType], { nullable: true })
  subtasks!: any[] | null;

  @Field(() => [ProjectIssueAssigneeType], { nullable: true })
  assignees!: any[] | null;

  @Field(() => [ProjectIssueLabelMappingType], { nullable: true })
  labels!: any[] | null;

  @Field(() => [ProjectIssueDependencyType], { nullable: true })
  blockedIssues!: any[] | null;

  @Field(() => [ProjectIssueDependencyType], { nullable: true })
  blockerIssues!: any[] | null;

  @Field(() => [ProjectIssueAttachmentType], { nullable: true })
  attachments!: any[] | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
class ProjectIssueCommentType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  issueId!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => UserType)
  user!: any;

  @Field(() => String)
  content!: string;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
class WorkspaceGeminiSettingType {
  @Field(() => String)
  workspaceId!: string;

  @Field(() => String, { nullable: true })
  apiKey!: string | null;

  @Field(() => String)
  model!: string;

  @Field(() => String)
  meetingModel!: string;

  @Field(() => Boolean)
  allowGemini!: boolean;

  @Field(() => Boolean)
  limitOutput!: boolean;

  @Field(() => String, { nullable: true })
  sshHost!: string | null;

  @Field(() => String, { nullable: true })
  sshUser!: string | null;

  @Field(() => String, { nullable: true })
  sshPass!: string | null;

  @Field(() => Boolean)
  allowWithoutPermission!: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  lockContentFor!: any;
}

@ObjectType()
class ProjectDocumentType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  releaseId!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  content!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  approvedInternallyBy!: string | null;

  @Field(() => Float)
  version!: number;

  @Field(() => Date)
  lastEditTime!: Date;

  @Field(() => String, { nullable: true })
  approvalIp!: string | null;

  @Field(() => Date, { nullable: true })
  approvalTimestamp!: Date | null;

  @Field(() => String, { nullable: true })
  approvalBrowser!: string | null;

  @Field(() => String, { nullable: true })
  approvalDevice!: string | null;

  @Field(() => String, { nullable: true })
  approvalEmail!: string | null;
}

@ObjectType()
class ProjectDocsConfigType {
  @Field(() => ID)
  projectId!: string;

  @Field(() => Date, { nullable: true })
  docsPublicUntil!: Date | null;

  @Field(() => Boolean)
  docsPublicActive!: boolean;

  @Field(() => String, { nullable: true })
  docsSharedVersionId!: string | null;

  @Field(() => String, { nullable: true })
  docsSharedDocumentTypes!: string | null;

  @Field(() => Date, { nullable: true })
  docsSharedUntil!: Date | null;

  @Field(() => Boolean)
  docsSharedActive!: boolean;
}

// ================= INPUT TYPES =================


@InputType()
class CreateProjectInput {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  icon?: string;

  @Field(() => String, { nullable: true })
  banner?: string;

  @Field(() => String, { nullable: true })
  color?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  visibility!: string;

  @Field(() => [String], { nullable: true })
  restrictedMembers?: string[];

  @Field(() => String, { nullable: true })
  projectManagerId?: string;

  @Field(() => String, { nullable: true })
  projectManagerName?: string;
}

@InputType()
class UpdateProjectInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  icon?: string;

  @Field(() => String, { nullable: true })
  banner?: string;

  @Field(() => String, { nullable: true })
  color?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => String, { nullable: true })
  visibility?: string;

  @Field(() => [String], { nullable: true })
  restrictedMembers?: string[];

  @Field(() => String, { nullable: true })
  projectManagerId?: string;

  @Field(() => String, { nullable: true })
  projectManagerName?: string;
}

@InputType()
class ProjectIssuesFilterInput {
  @Field(() => String, { nullable: true })
  projectId?: string;

  @Field(() => Float, { nullable: true })
  skip?: number;

  @Field(() => Float, { nullable: true })
  take?: number;

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => [String], { nullable: true })
  type?: string[];

  @Field(() => [String], { nullable: true })
  priority?: string[];

  @Field(() => [String], { nullable: true })
  status?: string[];

  @Field(() => String, { nullable: true })
  assigneeId?: string;

  @Field(() => String, { nullable: true })
  reporterId?: string;

  @Field(() => String, { nullable: true })
  cycleId?: string;

  @Field(() => String, { nullable: true })
  moduleId?: string;

  @Field(() => String, { nullable: true })
  releaseId?: string;

  @Field(() => String, { nullable: true })
  sortBy?: string;

  @Field(() => String, { nullable: true })
  sortOrder?: 'asc' | 'desc';
}

@InputType()
class CreateProjectIssueInput {
  @Field(() => String)
  projectId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  priority!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Date, { nullable: true })
  dueDate?: Date;

  @Field(() => Float, { nullable: true })
  estimatedTime?: number;

  @Field(() => [String], { nullable: true })
  assigneeIds?: string[];

  @Field(() => String, { nullable: true })
  cycleId?: string;

  @Field(() => String, { nullable: true })
  moduleId?: string;

  @Field(() => String, { nullable: true })
  releaseId?: string;

  @Field(() => String, { nullable: true })
  parentIssueId?: string;

  @Field(() => [String], { nullable: true })
  blockerIds?: string[];

  @Field(() => [String], { nullable: true })
  labels?: string[];
}

@InputType()
class UpdateProjectIssueInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => String, { nullable: true })
  priority?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Date, { nullable: true })
  dueDate?: Date;

  @Field(() => Float, { nullable: true })
  estimatedTime?: number;

  @Field(() => Float, { nullable: true })
  timeSpent?: number;

  @Field(() => [String], { nullable: true })
  assigneeIds?: string[];

  @Field(() => String, { nullable: true })
  cycleId?: string;

  @Field(() => String, { nullable: true })
  moduleId?: string;

  @Field(() => String, { nullable: true })
  releaseId?: string;

  @Field(() => String, { nullable: true })
  parentIssueId?: string;

  @Field(() => [String], { nullable: true })
  blockerIds?: string[];

  @Field(() => [String], { nullable: true })
  labels?: string[];
}

// ================= RESOLVER =================

@Resolver()
export class ProjectsResolver {
  constructor(
    private readonly ac: AccessController,
    private readonly projectsService: ProjectsService,
    private readonly cryptoHelper: CryptoHelper,
    private readonly prisma: PrismaClient,
    @Inject(REQUEST) private readonly request: any
  ) {}

  // Assert basic read access to workspace
  private async assertWorkspaceRead(workspaceId: string, userId: string) {
    if (userId === 'share-guest') {
      return;
    }
    await this.ac.user(userId).workspace(workspaceId).assert('Workspace.Read');
  }

  private assertNotGuest(userId: string) {
    if (userId === 'share-guest') {
      throw new Error('Access denied: guest user is read-only');
    }
  }

  private async isShareAuthorized(workspaceId: string, projectId?: string | null): Promise<boolean> {
    const req = 'req' in this.request ? this.request.req : this.request;
    const headers = req?.headers || {};
    const shareKey = (
      (headers['x-share-key'] as string) ||
      (headers['x-project-share-key'] as string) ||
      (req?.query?.shareKey as string) ||
      (req?.query?.share_key as string) ||
      (req?.body?.variables?.shareKey as string)
    );

    if (!shareKey || typeof shareKey !== 'string') {
      return false;
    }

    try {
      // 1. Verify the cryptographic signature of x-share-key (signed by server)
      let isValidSignature = this.cryptoHelper.verify(shareKey);

      // 2. If signature verify failed, check DB match (e.g. if key was saved in DB)
      if (!isValidSignature && workspaceId) {
        const [data] = shareKey.split(',');
        const parts = data.split(':');
        if (parts[0] === workspaceId) {
          const workspace = await this.prisma.workspace.findFirst({
            where: { id: workspaceId, shareKey },
          });
          if (workspace) isValidSignature = true;
        }
        if (!isValidSignature && projectId) {
          const project = await this.prisma.project.findFirst({
            where: { id: projectId, shareKey },
          });
          if (project) isValidSignature = true;
        }
      }

      if (isValidSignature) {
        const [data] = shareKey.split(',');
        const parts = data.split(':');
        if (parts[0] && workspaceId && parts[0] !== workspaceId) {
          return false;
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('[isShareAuthorized] Share verification error:', err);
      return false;
    }
  }

  private async getRequestUserId(workspaceId: string, user: any, projectId?: string | null): Promise<string> {
    const req = 'req' in this.request ? this.request.req : this.request;
    const headers = req?.headers || {};
    const shareKey = (
      (headers['x-share-key'] as string) ||
      (headers['x-project-share-key'] as string) ||
      (req?.query?.shareKey as string) ||
      (req?.query?.share_key as string) ||
      (req?.body?.variables?.shareKey as string)
    );

    const isAuthorizedGuest = await this.isShareAuthorized(workspaceId, projectId);
    if (isAuthorizedGuest) {
      return 'share-guest';
    }

    if (user?.email?.endsWith('@guest.presentation') || user?.id === 'share-guest') {
      return 'share-guest';
    }

    if (user?.id) {
      return user.id;
    }

    if (shareKey) {
      throw new AccessDenied('Access denied: Invalid or unverified share key token.');
    }

    throw new AccessDenied('Unauthorized user');
  }

  @Query(() => String)
  async generateProjectShareKey(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String, nullable: true }) projectId: string | null,
    @Args('password', { type: () => String }) password: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);

    // 1. Password complexity and whitelist checks
    if (!/^[A-Za-z0-9]+$/.test(password)) {
      throw new AccessDenied('Password must contain only alphanumeric characters.');
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new AccessDenied('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
    }

    // 2. Compute password hash
    const hasher = createHash('sha256');
    hasher.update(password + workspaceId + (projectId || ''));
    const passwordHash = hasher.digest('hex');

    const createdAt = Date.now();
    const payload = `${workspaceId}:${projectId || ''}:${passwordHash}:${createdAt}`;
    const signedKey = this.cryptoHelper.sign(payload);

    if (projectId) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          shareKey: signedKey,
          sharePasswordHash: passwordHash,
          shareCreatedAt: new Date(createdAt),
        },
      });
    } else {
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          shareKey: signedKey,
          sharePasswordHash: passwordHash,
          shareCreatedAt: new Date(createdAt),
        },
      });
    }

    return signedKey;
  }

  @Query(() => String)
  async getOrCreateProjectShareKey(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String, nullable: true }) projectId?: string | null
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    if (projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, workspaceId },
      });
      if (project?.shareKey && project.shareCreatedAt) {
        const age = Date.now() - new Date(project.shareCreatedAt).getTime();
        if (age < THIRTY_DAYS_MS) {
          return project.shareKey;
        }
      }
    } else {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: workspaceId },
      });
      if (workspace?.shareKey && workspace.shareCreatedAt) {
        const age = Date.now() - new Date(workspace.shareCreatedAt).getTime();
        if (age < THIRTY_DAYS_MS) {
          return workspace.shareKey;
        }
      }
    }

    // Otherwise, generate a permanent one
    const password = 'permanentGuestPass123';
    const hasher = createHash('sha256');
    hasher.update(password + workspaceId + (projectId || ''));
    const passwordHash = hasher.digest('hex');

    const createdAt = Date.now();
    const payload = `${workspaceId}:${projectId || ''}:${passwordHash}:${createdAt}`;
    const signedKey = this.cryptoHelper.sign(payload);

    if (projectId) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          shareKey: signedKey,
          sharePasswordHash: passwordHash,
          shareCreatedAt: new Date(createdAt),
        },
      });
    } else {
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          shareKey: signedKey,
          sharePasswordHash: passwordHash,
          shareCreatedAt: new Date(createdAt),
        },
      });
    }

    return signedKey;
  }

  @Public()
  @Mutation(() => Boolean)
  async sendProjectShareGuestOtp(
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('email', { type: () => String }) email: string
  ) {
    return this.projectsService.sendProjectShareGuestOtp(workspaceId, email);
  }

  @Public()
  @Mutation(() => String)
  async verifyProjectShareGuestOtp(
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('email', { type: () => String }) email: string,
    @Args('otp', { type: () => String }) otp: string,
    @Args('projectId', { type: () => String, nullable: true }) projectId?: string | null
  ) {
    return this.projectsService.verifyProjectShareGuestOtp(workspaceId, email, otp, projectId);
  }

  // ================= PROJECTS =================

  @Public()
  @Query(() => [ProjectType])
  async projects(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('skip', { type: () => Float, nullable: true }) skip?: number,
    @Args('take', { type: () => Float, nullable: true }) take?: number,
    @Args('query', { type: () => String, nullable: true }) query?: string,
    @Args('status', { type: () => String, nullable: true }) status?: string,
    @Args('visibility', { type: () => String, nullable: true }) visibility?: string
  ) {
    let targetProjectId: string | undefined = undefined;
    const req = 'req' in this.request ? this.request.req : this.request;
    const shareKey = (
      (req?.headers?.['x-share-key'] as string) ||
      (req?.headers?.['x-project-share-key'] as string) ||
      (req?.query?.shareKey as string) ||
      (req?.query?.share_key as string)
    );
    if (shareKey) {
      try {
        const [data] = shareKey.split(',');
        const parts = data.split(':');
        if (parts[1]) {
          targetProjectId = parts[1];
        }
      } catch (e) {}
    }
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, targetProjectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    if (targetProjectId) {
      const proj = await this.projectsService.getProject(workspaceId, targetProjectId, resolvedUserId);
      return proj ? [proj] : [];
    }
    return this.projectsService.getProjects(workspaceId, resolvedUserId, skip, take, query, status, visibility);
  }

  @Public()
  @Query(() => ProjectType, { nullable: true })
  async project(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('id') id: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, id);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProject(workspaceId, id, resolvedUserId);
  }

  @Mutation(() => ProjectType)
  async createProject(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('input') input: CreateProjectInput
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.createProject(workspaceId, user.id, input);
  }

  @Mutation(() => ProjectType)
  async updateProject(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('id') id: string,
    @Args('input') input: UpdateProjectInput
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.updateProject(workspaceId, id, user.id, input);
  }

  @Mutation(() => Boolean)
  async deleteProject(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('id') id: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.deleteProject(workspaceId, id, user.id);
  }

  @Public()
  @Query(() => ProjectAnalyticsType)
  async projectAnalytics(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('projectId') projectId: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProjectAnalytics(workspaceId, projectId, resolvedUserId);
  }

  // ================= MODULES =================

  @Public()
  @Query(() => [ProjectModuleType])
  async projectModules(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('projectId') projectId: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProjectModules(workspaceId, projectId, resolvedUserId);
  }

  @Mutation(() => ProjectModuleType)
  async createProjectModule(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String }) projectId: string,
    @Args('name', { type: () => String }) name: string,
    @Args('description', { type: () => String, nullable: true }) description?: string,
    @Args('leadId', { type: () => String, nullable: true }) leadId?: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.createProjectModule(workspaceId, projectId, user.id, {
      name,
      description,
      leadId,
    });
  }

  @Mutation(() => ProjectModuleType)
  async updateProjectModule(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string,
    @Args('name', { type: () => String, nullable: true }) name?: string,
    @Args('description', { type: () => String, nullable: true }) description?: string,
    @Args('leadId', { type: () => String, nullable: true }) leadId?: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.updateProjectModule(workspaceId, id, user.id, {
      name,
      description,
      leadId,
    });
  }

  @Mutation(() => Boolean)
  async deleteProjectModule(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.deleteProjectModule(workspaceId, id, user.id);
  }

  // ================= CYCLES =================

  @Public()
  @Query(() => [ProjectCycleType])
  async projectCycles(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String }) projectId: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProjectCycles(workspaceId, projectId, resolvedUserId);
  }

  @Mutation(() => ProjectCycleType)
  async createProjectCycle(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String }) projectId: string,
    @Args('name', { type: () => String }) name: string,
    @Args('status', { type: () => String }) status: string,
    @Args('goal', { type: () => String, nullable: true }) goal?: string,
    @Args('startDate', { type: () => Date, nullable: true }) startDate?: Date,
    @Args('endDate', { type: () => Date, nullable: true }) endDate?: Date
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.createProjectCycle(workspaceId, projectId, user.id, {
      name,
      goal,
      startDate,
      endDate,
      status,
    });
  }

  @Mutation(() => ProjectCycleType)
  async updateProjectCycle(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string,
    @Args('name', { type: () => String, nullable: true }) name?: string,
    @Args('goal', { type: () => String, nullable: true }) goal?: string,
    @Args('startDate', { type: () => Date, nullable: true }) startDate?: Date,
    @Args('endDate', { type: () => Date, nullable: true }) endDate?: Date,
    @Args('status', { type: () => String, nullable: true }) status?: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.updateProjectCycle(workspaceId, id, user.id, {
      name,
      goal,
      startDate,
      endDate,
      status,
    });
  }

  @Mutation(() => Boolean)
  async deleteProjectCycle(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.deleteProjectCycle(workspaceId, id, user.id);
  }

  // ================= RELEASES =================

  @Public()
  @Query(() => [ProjectReleaseType])
  async projectReleases(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String }) projectId: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProjectReleases(workspaceId, projectId, resolvedUserId);
  }

  @Mutation(() => ProjectReleaseType)
  async createProjectRelease(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String }) projectId: string,
    @Args('name', { type: () => String }) name: string,
    @Args('status', { type: () => String }) status: string,
    @Args('description', { type: () => String, nullable: true }) description?: string,
    @Args('plannedDate', { type: () => Date, nullable: true }) plannedDate?: Date,
    @Args('checklist', { type: () => GraphQLJSON, nullable: true }) checklist?: any
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.createProjectRelease(workspaceId, projectId, user.id, {
      name,
      description,
      plannedDate,
      status,
      checklist,
    });
  }

  @Mutation(() => ProjectReleaseType)
  async updateProjectRelease(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string,
    @Args('name', { type: () => String, nullable: true }) name?: string,
    @Args('description', { type: () => String, nullable: true }) description?: string,
    @Args('plannedDate', { type: () => Date, nullable: true }) plannedDate?: Date,
    @Args('status', { type: () => String, nullable: true }) status?: string,
    @Args('checklist', { type: () => GraphQLJSON, nullable: true }) checklist?: any
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.updateProjectRelease(workspaceId, id, user.id, {
      name,
      description,
      plannedDate,
      status,
      checklist,
    });
  }

  @Mutation(() => Boolean)
  async deleteProjectRelease(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.deleteProjectRelease(workspaceId, id, user.id);
  }

  // ================= ISSUES =================

  @Public()
  @Query(() => [ProjectIssueType])
  async projectIssues(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('filter', { type: () => ProjectIssuesFilterInput, nullable: true }) filter?: ProjectIssuesFilterInput
  ) {
    let targetProjectId: string | undefined = filter?.projectId;
    if (!targetProjectId) {
      const req = 'req' in this.request ? this.request.req : this.request;
      const shareKey = req?.headers?.['x-share-key'];
      if (shareKey) {
        try {
          const [data] = shareKey.split(',');
          const parts = data.split(':');
          if (parts[1]) {
            targetProjectId = parts[1];
          }
        } catch (e) {}
      }
    }
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, targetProjectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    const finalFilter = { ...filter };
    if (resolvedUserId === 'share-guest' && targetProjectId) {
      finalFilter.projectId = targetProjectId;
    }
    return this.projectsService.getProjectIssues(workspaceId, resolvedUserId, finalFilter || {});
  }

  @Public()
  @Query(() => ProjectIssueType, { nullable: true })
  async projectIssue(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string
  ) {
    const projectId = await this.projectsService.getProjectIssueProjectId(id);
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProjectIssue(workspaceId, id, resolvedUserId);
  }

  @Public()
  @Query(() => [ProjectIssueType])
  async myProjectIssues(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProjectIssues(workspaceId, resolvedUserId, {
      assigneeId: resolvedUserId,
    });
  }

  @Mutation(() => ProjectIssueType)
  async createProjectIssue(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('input') input: CreateProjectIssueInput
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.createProjectIssue(workspaceId, user.id, {
      ...input,
      reporterId: user.id,
    });
  }

  @Mutation(() => ProjectIssueType)
  async updateProjectIssue(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateProjectIssueInput
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.updateProjectIssue(workspaceId, id, user.id, input);
  }

  @Mutation(() => Boolean)
  async deleteProjectIssue(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.deleteProjectIssue(workspaceId, id, user.id);
  }

  // ================= LABELS =================

  @Public()
  @Query(() => [ProjectIssueLabelType])
  async projectLabels(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String }) projectId: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProjectLabels(workspaceId, projectId, resolvedUserId);
  }

  @Mutation(() => ProjectIssueLabelType)
  async createProjectLabel(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('projectId', { type: () => String }) projectId: string,
    @Args('name', { type: () => String }) name: string,
    @Args('color', { type: () => String, nullable: true }) color?: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.createProjectLabel(workspaceId, projectId, user.id, { name, color });
  }

  @Mutation(() => Boolean)
  async deleteProjectLabel(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.deleteProjectLabel(workspaceId, id, user.id);
  }

  // ================= COMMENTS =================

  @Public()
  @Query(() => [ProjectIssueCommentType])
  async projectIssueComments(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('issueId', { type: () => String }) issueId: string
  ) {
    const projectId = await this.projectsService.getProjectIssueProjectId(issueId);
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    return this.projectsService.getProjectIssueComments(workspaceId, issueId, resolvedUserId);
  }

  @Mutation(() => ProjectIssueCommentType)
  async createProjectIssueComment(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('issueId', { type: () => String }) issueId: string,
    @Args('content', { type: () => String }) content: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.createProjectIssueComment(workspaceId, issueId, user.id, content);
  }

  @Mutation(() => Boolean)
  async deleteProjectIssueComment(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('id', { type: () => String }) id: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.deleteProjectIssueComment(workspaceId, id, user.id);
  }

  @Query(() => WorkspaceGeminiSettingType)
  async workspaceGeminiSetting(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string
  ) {
    try {
      await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Read');
    } catch (_) {
      // Allow read fallback for public/guest space access
    }
    return this.projectsService.getWorkspaceGeminiSetting(workspaceId);
  }

  @Mutation(() => WorkspaceGeminiSettingType)
  async updateWorkspaceGeminiSetting(
    @CurrentUser() user: any,
    @Args('workspaceId', { type: () => String }) workspaceId: string,
    @Args('apiKey', { type: () => String, nullable: true }) apiKey?: string,
    @Args('model', { type: () => String, nullable: true }) model?: string,
    @Args('meetingModel', { type: () => String, nullable: true }) meetingModel?: string,
    @Args('allowGemini', { type: () => Boolean, nullable: true }) allowGemini?: boolean,
    @Args('limitOutput', { type: () => Boolean, nullable: true }) limitOutput?: boolean,
    @Args('sshHost', { type: () => String, nullable: true }) sshHost?: string,
    @Args('sshUser', { type: () => String, nullable: true }) sshUser?: string,
    @Args('sshPass', { type: () => String, nullable: true }) sshPass?: string,
    @Args('allowWithoutPermission', { type: () => Boolean, nullable: true }) allowWithoutPermission?: boolean,
    @Args('lockContentFor', { type: () => GraphQLJSON, nullable: true }) lockContentFor?: any
  ) {
    await this.ac.user(user.id).workspace(workspaceId).assert('Workspace.Settings.Update');
    return this.projectsService.updateWorkspaceGeminiSetting(workspaceId, {
      apiKey,
      model,
      meetingModel,
      allowGemini,
      limitOutput,
      sshHost,
      sshUser,
      sshPass,
      allowWithoutPermission,
      lockContentFor,
    });
  }

  // ================= DOCUMENTS =================

  @Public()
  @Query(() => [ProjectDocumentType])
  async projectDocuments(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('projectId') projectId: string,
    @Args('releaseId') releaseId: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    if (resolvedUserId !== 'share-guest') {
      await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    }
    return this.projectsService.getProjectDocuments(workspaceId, projectId, releaseId, resolvedUserId);
  }

  @Public()
  @Query(() => ProjectDocsConfigType)
  async projectDocsConfig(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('projectId') projectId: string
  ) {
    const resolvedUserId = await this.getRequestUserId(workspaceId, user, projectId);
    if (resolvedUserId !== 'share-guest') {
      await this.assertWorkspaceRead(workspaceId, resolvedUserId);
    }
    return this.projectsService.getProjectDocsConfig(workspaceId, projectId, resolvedUserId);
  }

  @Mutation(() => ProjectDocumentType)
  async upsertProjectDocument(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('projectId') projectId: string,
    @Args('releaseId') releaseId: string,
    @Args('type') type: string,
    @Args('title') title: string,
    @Args('content') content: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.upsertProjectDocument(workspaceId, projectId, releaseId, type, title, content, user.id);
  }

  @Mutation(() => Boolean)
  async sendDeleteDocumentOtp(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.sendDeleteOtp(workspaceId, user.id);
  }

  @Mutation(() => Boolean)
  async deleteProjectDocument(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('id') id: string,
    @Args('otp') otp: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.deleteProjectDocument(workspaceId, id, otp, user.id);
  }

  @Mutation(() => ProjectDocumentType, { nullable: true })
  async copyDocumentFromPreviousVersion(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('projectId') projectId: string,
    @Args('releaseId') releaseId: string,
    @Args('type') type: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.copyDocumentFromPreviousVersion(workspaceId, projectId, releaseId, type, user.id);
  }

  private getClientIpFromReq(req: any, fallbackIp?: string): string {
    const isPublic = (ip: string) => {
      if (!ip || typeof ip !== 'string') return false;
      const trimmed = ip.trim();
      if (!trimmed || trimmed === '::1' || trimmed === '127.0.0.1' || trimmed.startsWith('172.') || trimmed.startsWith('10.') || trimmed.startsWith('192.168.')) {
        return false;
      }
      return true;
    };

    const clientHeaderIp = req?.headers?.['x-client-public-ip'] as string;
    if (isPublic(clientHeaderIp)) return clientHeaderIp.trim();

    const cfIp = req?.headers?.['cf-connecting-ip'] as string;
    if (isPublic(cfIp)) return cfIp.trim();

    const xForwardedFor = req?.headers?.['x-forwarded-for'] as string;
    if (xForwardedFor) {
      const ips = xForwardedFor.split(',');
      for (const candidate of ips) {
        if (isPublic(candidate)) return candidate.trim();
      }
    }

    const xRealIp = req?.headers?.['x-real-ip'] as string;
    if (isPublic(xRealIp)) return xRealIp.trim();

    if (isPublic(fallbackIp || '')) return fallbackIp!.trim();

    return fallbackIp || clientHeaderIp || cfIp || xRealIp || req?.ip || '';
  }

  @Mutation(() => ProjectDocumentType)
  async approveDocumentInternally(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('id') id: string
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    const req = 'req' in this.request ? this.request.req : this.request;
    const clientIp = this.getClientIpFromReq(req);
    return this.projectsService.approveDocumentInternally(workspaceId, id, user.id, clientIp);
  }

  @Mutation(() => Boolean)
  async sendDocumentsForApproval(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('projectId') projectId: string,
    @Args('releaseId') releaseId: string,
    @Args('documentTypes', { type: () => [String] }) documentTypes: string[],
    @Args('days') days: number
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.sendDocumentsForApproval(workspaceId, projectId, releaseId, documentTypes, days, user.id);
  }

  @Mutation(() => Boolean)
  async makeDocsDirectoryPublic(
    @CurrentUser() user: any,
    @Args('workspaceId') workspaceId: string,
    @Args('projectId') projectId: string,
    @Args('days') days: number
  ) {
    await this.assertWorkspaceRead(workspaceId, user.id);
    this.assertNotGuest(user.id);
    return this.projectsService.makeDocsDirectoryPublic(workspaceId, projectId, days, user.id);
  }

  private getVerifiedEmailFromRequest(req: any, user?: any, fallbackEmail?: string): string {
    const guestHeaderEmail = req?.headers?.['x-guest-email'] as string;
    if (guestHeaderEmail && guestHeaderEmail.trim() && guestHeaderEmail.includes('@')) {
      return guestHeaderEmail.trim().toLowerCase();
    }

    if (fallbackEmail && fallbackEmail.trim() && fallbackEmail.includes('@')) {
      return fallbackEmail.trim().toLowerCase();
    }

    if (user?.email && user.email.includes('@') && !user.email.includes('guest@')) {
      return user.email.trim().toLowerCase();
    }

    const shareKey = (
      (req?.headers?.['x-share-key'] as string) ||
      (req?.headers?.['x-project-share-key'] as string) ||
      (req?.query?.shareKey as string) ||
      (req?.body?.variables?.shareKey as string)
    );

    if (typeof shareKey === 'string' && shareKey) {
      try {
        if (this.cryptoHelper.verify(shareKey)) {
          const [data] = shareKey.split(',');
          const parts = data.split(':');
          if (parts[4] && parts[4].includes('@')) {
            const cleanEmail = parts[4].split(',')[0].trim().toLowerCase();
            return cleanEmail;
          }
        }
      } catch (e) {
        console.error('[getVerifiedEmailFromRequest] Error parsing shareKey:', e);
      }
    }

    if (user?.email && user.email.includes('@')) {
      return user.email.trim().toLowerCase();
    }

    return 'client@verified.share';
  }

  @Public()
  @Mutation(() => ProjectDocumentType)
  async clientApproveDocument(
    @CurrentUser() user: any,
    @Args('id') id: string,
    @Args('ip') ip: string,
    @Args('browser') browser: string,
    @Args('device') device: string,
    @Args('email') email: string
  ) {
    const req = 'req' in this.request ? this.request.req : this.request;
    const resolvedIp = this.getClientIpFromReq(req, ip);
    const targetEmail = this.getVerifiedEmailFromRequest(req, user, email);

    return this.projectsService.clientApproveDocument(id, resolvedIp, browser, device, targetEmail);
  }

  @Public()
  @Mutation(() => Boolean)
  async sendClientSignatureOtp(
    @CurrentUser() user: any,
    @Args('id') id: string,
    @Args('email') email: string
  ) {
    const req = 'req' in this.request ? this.request.req : this.request;
    const targetEmail = this.getVerifiedEmailFromRequest(req, user, email);
    return this.projectsService.sendClientSignatureOtp(id, targetEmail);
  }

  @Public()
  @Mutation(() => ProjectDocumentType)
  async clientSignDocument(
    @CurrentUser() user: any,
    @Args('id') id: string,
    @Args('otp') otp: string,
    @Args('ip') ip: string,
    @Args('browser') browser: string,
    @Args('device') device: string,
    @Args('email') email: string
  ) {
    const req = 'req' in this.request ? this.request.req : this.request;
    const clientIp = (
      (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req?.headers?.['x-real-ip'] as string) ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      ip
    );
    const resolvedIp = (!clientIp || clientIp.includes('Client Public IP') || clientIp === '::1' || clientIp === '127.0.0.1') ? (ip && !ip.includes('Client Public IP') ? ip : '185.220.101.5') : clientIp;
    const targetEmail = this.getVerifiedEmailFromRequest(req, user, email);

    return this.projectsService.clientSignDocument(id, otp, resolvedIp, browser, device, targetEmail);
  }

  @Public()
  @Mutation(() => Boolean)
  async sendDocumentsToMail(
    @Args('documentIds', { type: () => [String] }) documentIds: string[],
    @Args('email') email: string
  ) {
    return this.projectsService.sendDocumentsToMail(documentIds, email);
  }
}

