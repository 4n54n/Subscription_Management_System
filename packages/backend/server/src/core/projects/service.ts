import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { CryptoHelper, AccessDenied } from '../../base';
import { Models } from '../../models';
import { WorkspaceRole } from '../permission';
import { MailSender } from '../mail';
import { ServerService } from '../config';
import { applyUpdate, Doc as YDoc } from 'yjs';
import { Renderers } from '../../mails';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly models: Models,
    private readonly mailSender: MailSender,
    private readonly serverService: ServerService,
    private readonly cryptoHelper: CryptoHelper
  ) {}


  // Helper to assert workspace membership and return the user's role
  async getWorkspaceRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    if (userId === 'share-guest') {
      return WorkspaceRole.Collaborator;
    }
    const userRole = await this.models.workspaceUser.getActive(workspaceId, userId);
    return userRole ? (userRole.type as WorkspaceRole) : null;
  }

  // Helper to verify if a user has access to a project
  async hasProjectAccess(workspaceId: string, projectId: string, userId: string): Promise<boolean> {
    if (userId === 'share-guest') {
      return true;
    }
    const role = await this.getWorkspaceRole(workspaceId, userId);
    if (!role) return false;

    // Workspace owners and admins have access to all projects
    if (role === WorkspaceRole.Owner || role === WorkspaceRole.Admin) {
      return true;
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });

    if (!project) return false;

    if (project.visibility === 'Restricted') {
      const isMember = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });
      return !!isMember;
    }

    return true;
  }

  // ================= PROJECTS =================

  async getProjects(
    workspaceId: string,
    userId: string,
    skip = 0,
    take = 20,
    query?: string,
    status?: string,
    visibility?: string
  ) {
    const role = await this.getWorkspaceRole(workspaceId, userId);
    if (!role) throw new Error('Access denied to workspace');

    const isOwnerOrAdmin = role === WorkspaceRole.Owner || role === WorkspaceRole.Admin || userId === 'share-guest';

    // Filter by query, status, and visibility
    const whereClause: any = {
      workspaceId,
      ...(status ? { status } : {}),
      ...(visibility ? { visibility } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // If not owner/admin, restrict projects view to WorkspaceWide OR Restricted where the user is a member
    if (!isOwnerOrAdmin) {
      whereClause.OR = [
        { visibility: 'WorkspaceWide' },
        {
          visibility: 'Restricted',
          restrictedMembers: {
            some: { userId },
          },
        },
      ];
    }

    return this.prisma.project.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        restrictedMembers: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async getProject(workspaceId: string, projectId: string, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied to project');

    return this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: {
        restrictedMembers: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async createProject(
    workspaceId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      icon?: string;
      banner?: string;
      color?: string;
      category?: string;
      status: string;
      visibility: string;
      restrictedMembers?: string[];
      projectManagerId?: string;
      projectManagerName?: string;
    }
  ) {
    const role = await this.getWorkspaceRole(workspaceId, userId);
    if (!role) throw new Error('Access denied to workspace');

    return this.prisma.$transaction(async (tx) => {
      let pmName: string | undefined = data.projectManagerName;
      if (data.projectManagerId && !pmName) {
        const pmUser = await tx.user.findUnique({ where: { id: data.projectManagerId } });
        pmName = pmUser?.name || pmUser?.email || undefined;
      }

      const project = await tx.project.create({
        data: {
          workspaceId,
          name: data.name,
          description: data.description,
          icon: data.icon,
          banner: data.banner,
          color: data.color,
          category: data.category,
          status: data.status,
          visibility: data.visibility,
          projectManagerId: data.projectManagerId || null,
          projectManagerName: pmName || null,
        },
      });

      if (data.visibility === 'Restricted' && data.restrictedMembers?.length) {
        await tx.projectMember.createMany({
          data: data.restrictedMembers.map((mId) => ({
            projectId: project.id,
            userId: mId,
          })),
        });
      }

      return tx.project.findUnique({
        where: { id: project.id },
        include: {
          restrictedMembers: {
            include: {
              user: true,
            },
          },
        },
      });
    });
  }

  async updateProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      icon?: string;
      banner?: string;
      color?: string;
      category?: string;
      status?: string;
      visibility?: string;
      restrictedMembers?: string[];
      projectManagerId?: string;
      projectManagerName?: string;
    }
  ) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied to project');

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.banner !== undefined) updateData.banner = data.banner;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.visibility !== undefined) updateData.visibility = data.visibility;

      if (data.projectManagerId !== undefined) {
        updateData.projectManagerId = data.projectManagerId || null;
        if (data.projectManagerId) {
          const pmUser = await tx.user.findUnique({ where: { id: data.projectManagerId } });
          updateData.projectManagerName = data.projectManagerName || pmUser?.name || pmUser?.email || null;
        } else {
          updateData.projectManagerName = null;
        }
      } else if (data.projectManagerName !== undefined) {
        updateData.projectManagerName = data.projectManagerName || null;
      }

      await tx.project.update({
        where: { id: projectId },
        data: updateData,
      });

      if (data.restrictedMembers !== undefined) {
        // Clear previous restricted members
        await tx.projectMember.deleteMany({
          where: { projectId },
        });

        // Insert new restricted members
        if (data.restrictedMembers.length > 0) {
          await tx.projectMember.createMany({
            data: data.restrictedMembers.map((mId) => ({
              projectId,
              userId: mId,
            })),
          });
        }
      }

      const updatedProject = await tx.project.findUnique({
        where: { id: projectId },
        include: {
          restrictedMembers: {
            include: {
              user: true,
            },
          },
        },
      });

      if (updatedProject) {
        const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } });
        const actorUser = await tx.user.findUnique({ where: { id: userId } });

        this.dispatchActionEmails({
          workspaceId,
          projectId,
          projectManagerId: updatedProject.projectManagerId,
          actorUserId: userId,
          templateName: 'ProjectEdited',
          templateProps: {
            user: { name: actorUser?.name || actorUser?.email || 'User', email: actorUser?.email || '' },
            workspace: { id: workspaceId, name: workspace?.name || 'Workspace' },
            projectName: updatedProject.name,
            editedBy: actorUser?.name || actorUser?.email || 'Admin',
            timestamp: new Date().toLocaleString(),
            details: 'Project settings and properties updated.',
          },
        });
      }

      return updatedProject;
    });
  }

  async deleteProject(workspaceId: string, projectId: string, userId: string): Promise<boolean> {
    const role = await this.getWorkspaceRole(workspaceId, userId);
    if (role !== WorkspaceRole.Owner && role !== WorkspaceRole.Admin) {
      throw new Error('Only workspace owners and admins can delete projects');
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    const actorUser = await this.prisma.user.findUnique({ where: { id: userId } });

    const result = await this.prisma.project.deleteMany({
      where: { id: projectId, workspaceId },
    });

    if (result.count > 0 && project) {
      this.dispatchActionEmails({
        workspaceId,
        projectManagerId: project.projectManagerId,
        actorUserId: userId,
        templateName: 'ProjectDeleted',
        templateProps: {
          user: { name: actorUser?.name || actorUser?.email || 'User', email: actorUser?.email || '' },
          workspace: { id: workspaceId, name: workspace?.name || 'Workspace' },
          projectName: project.name,
          deletedBy: actorUser?.name || actorUser?.email || 'Admin',
          timestamp: new Date().toLocaleString(),
        },
      });
    }

    return result.count > 0;
  }

  async getProjectAnalytics(workspaceId: string, projectId: string, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const totalIssues = await this.prisma.projectIssue.count({ where: { projectId } });
    const completedTasks = await this.prisma.projectIssue.count({
      where: { projectId, status: 'Done' },
    });
    const openBugs = await this.prisma.projectIssue.count({
      where: { projectId, type: 'Bug', NOT: { status: 'Done' } },
    });

    const currentSprint = await this.prisma.projectCycle.findFirst({
      where: { projectId, status: 'Active' },
    });

    const upcomingRelease = await this.prisma.projectRelease.findFirst({
      where: { projectId, status: { in: ['Planned', 'InDevelopment', 'Testing'] } },
      orderBy: { plannedDate: 'asc' },
    });

    return {
      totalIssues,
      completedTasks,
      openBugs,
      currentSprintName: currentSprint?.name || null,
      upcomingReleaseVersion: upcomingRelease?.name || null,
    };
  }

  // ================= MODULES =================

  async getProjectModules(workspaceId: string, projectId: string, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectModule.findMany({
      where: { projectId },
      include: {
        lead: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createProjectModule(
    workspaceId: string,
    projectId: string,
    userId: string,
    data: { name: string; description?: string; leadId?: string }
  ) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectModule.create({
      data: {
        workspaceId,
        projectId,
        name: data.name,
        description: data.description,
        leadId: data.leadId,
      },
      include: {
        lead: true,
      },
    });
  }

  async updateProjectModule(
    workspaceId: string,
    moduleId: string,
    userId: string,
    data: { name?: string; description?: string; leadId?: string }
  ) {
    const mod = await this.prisma.projectModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new Error('Module not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, mod.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectModule.update({
      where: { id: moduleId },
      data: {
        name: data.name,
        description: data.description,
        leadId: data.leadId,
      },
      include: {
        lead: true,
      },
    });
  }

  async deleteProjectModule(workspaceId: string, moduleId: string, userId: string): Promise<boolean> {
    const mod = await this.prisma.projectModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new Error('Module not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, mod.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const result = await this.prisma.projectModule.delete({ where: { id: moduleId } });
    return !!result;
  }

  // ================= CYCLES (SPRINTS) =================

  async getProjectCycles(workspaceId: string, projectId: string, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectCycle.findMany({
      where: { projectId },
      orderBy: { startDate: 'asc' },
    });
  }

  async createProjectCycle(
    workspaceId: string,
    projectId: string,
    userId: string,
    data: { name: string; goal?: string; startDate?: Date; endDate?: Date; status: string }
  ) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectCycle.create({
      data: {
        workspaceId,
        projectId,
        name: data.name,
        goal: data.goal,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
      },
    });
  }

  async updateProjectCycle(
    workspaceId: string,
    cycleId: string,
    userId: string,
    data: { name?: string; goal?: string; startDate?: Date; endDate?: Date; status?: string }
  ) {
    const cycle = await this.prisma.projectCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new Error('Cycle not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, cycle.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectCycle.update({
      where: { id: cycleId },
      data: {
        name: data.name,
        goal: data.goal,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
      },
    });
  }

  async deleteProjectCycle(workspaceId: string, cycleId: string, userId: string): Promise<boolean> {
    const cycle = await this.prisma.projectCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new Error('Cycle not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, cycle.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const result = await this.prisma.projectCycle.delete({ where: { id: cycleId } });
    return !!result;
  }

  // ================= RELEASES =================

  async getProjectReleases(workspaceId: string, projectId: string, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectRelease.findMany({
      where: { projectId },
      orderBy: { plannedDate: 'asc' },
    });
  }

  async createProjectRelease(
    workspaceId: string,
    projectId: string,
    userId: string,
    data: { name: string; description?: string; plannedDate?: Date; status: string; checklist?: any }
  ) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectRelease.create({
      data: {
        workspaceId,
        projectId,
        name: data.name,
        description: data.description,
        plannedDate: data.plannedDate,
        status: data.status,
        checklist: data.checklist || [],
      },
    });
  }

  async updateProjectRelease(
    workspaceId: string,
    releaseId: string,
    userId: string,
    data: { name?: string; description?: string; plannedDate?: Date; status?: string; checklist?: any }
  ) {
    const release = await this.prisma.projectRelease.findUnique({ where: { id: releaseId } });
    if (!release) throw new Error('Release not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, release.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectRelease.update({
      where: { id: releaseId },
      data: {
        name: data.name,
        description: data.description,
        plannedDate: data.plannedDate,
        status: data.status,
        checklist: data.checklist,
      },
    });
  }

  async deleteProjectRelease(workspaceId: string, releaseId: string, userId: string): Promise<boolean> {
    const release = await this.prisma.projectRelease.findUnique({ where: { id: releaseId } });
    if (!release) throw new Error('Release not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, release.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const result = await this.prisma.projectRelease.delete({ where: { id: releaseId } });
    return !!result;
  }

  // ================= ISSUES / TASKS / BUGS =================

  async getProjectIssues(
    workspaceId: string,
    userId: string,
    options: {
      projectId?: string;
      skip?: number;
      take?: number;
      search?: string;
      type?: string[];
      priority?: string[];
      status?: string[];
      assigneeId?: string;
      reporterId?: string;
      cycleId?: string;
      moduleId?: string;
      releaseId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const role = await this.getWorkspaceRole(workspaceId, userId);
    if (!role) throw new Error('Access denied to workspace');

    if (options.projectId) {
      const hasAccess = await this.hasProjectAccess(workspaceId, options.projectId, userId);
      if (!hasAccess) throw new Error('Access denied to project');
    }

    const whereClause: any = {
      workspaceId,
      ...(options.projectId ? { projectId: options.projectId } : {}),
      ...(options.type?.length ? { type: { in: options.type } } : {}),
      ...(options.priority?.length ? { priority: { in: options.priority } } : {}),
      ...(options.status?.length ? { status: { in: options.status } } : {}),
      ...(options.assigneeId
        ? {
            assignees: {
              some: { userId: options.assigneeId },
            },
          }
        : {}),
      ...(options.reporterId ? { reporterId: options.reporterId } : {}),
      ...(options.cycleId ? { cycleId: options.cycleId } : {}),
      ...(options.moduleId ? { moduleId: options.moduleId } : {}),
      ...(options.releaseId ? { releaseId: options.releaseId } : {}),
      ...(options.search
        ? {
            OR: [
              { title: { contains: options.search, mode: 'insensitive' } },
              { description: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    return this.prisma.projectIssue.findMany({
      where: whereClause,
      skip: options.skip || 0,
      take: options.take || 50,
      orderBy: { [sortBy]: sortOrder },
      include: {
        reporter: true,
        assignees: {
          include: {
            user: true,
          },
        },
        cycle: true,
        module: true,
        release: true,
        parentIssue: true,
        subtasks: true,
        labels: {
          include: {
            label: true,
          },
        },
        blockedIssues: {
          include: {
            blockerIssue: true,
          },
        },
        blockerIssues: {
          include: {
            blockedIssue: true,
          },
        },
        attachments: true,
      },
    });
  }

  async getProjectIssueProjectId(issueId: string): Promise<string | null> {
    const issue = await this.prisma.projectIssue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });
    return issue?.projectId || null;
  }

  async getProjectIssue(workspaceId: string, id: string, userId: string) {
    const issue = await this.prisma.projectIssue.findUnique({
      where: { id },
      include: {
        reporter: true,
        assignees: {
          include: {
            user: true,
          },
        },
        cycle: true,
        module: true,
        release: true,
        parentIssue: true,
        subtasks: true,
        labels: {
          include: {
            label: true,
          },
        },
        blockedIssues: {
          include: {
            blockerIssue: true,
          },
        },
        blockerIssues: {
          include: {
            blockedIssue: true,
          },
        },
        attachments: true,
      },
    });

    if (!issue) throw new Error('Issue not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, issue.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return issue;
  }

  async createProjectIssue(
    workspaceId: string,
    userId: string,
    data: {
      projectId: string;
      title: string;
      description?: string;
      type: string;
      priority: string;
      status: string;
      dueDate?: Date;
      estimatedTime?: number;
      reporterId: string;
      assigneeIds?: string[];
      cycleId?: string;
      moduleId?: string;
      releaseId?: string;
      parentIssueId?: string;
      blockerIds?: string[]; // Issues that block this issue
      labels?: string[]; // label names or IDs
    }
  ) {
    const hasAccess = await this.hasProjectAccess(workspaceId, data.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.$transaction(async (tx) => {
      const issue = await tx.projectIssue.create({
        data: {
          workspaceId,
          projectId: data.projectId,
          title: data.title,
          description: data.description,
          type: data.type,
          priority: data.priority,
          status: data.status,
          dueDate: data.dueDate,
          estimatedTime: data.estimatedTime,
          reporterId: data.reporterId,
          cycleId: data.cycleId,
          moduleId: data.moduleId,
          releaseId: data.releaseId,
          parentIssueId: data.parentIssueId,
        },
      });

      // Mappings
      if (data.assigneeIds?.length) {
        await tx.projectIssueAssignee.createMany({
          data: data.assigneeIds.map((uId) => ({
            issueId: issue.id,
            userId: uId,
          })),
        });
      }

      if (data.blockerIds?.length) {
        await tx.projectIssueDependency.createMany({
          data: data.blockerIds.map((bId) => ({
            blockedIssueId: issue.id,
            blockerIssueId: bId,
          })),
        });
      }

      if (data.labels?.length) {
        // Create/find label references mapping
        for (const lName of data.labels) {
          let label = await tx.projectIssueLabel.findFirst({
            where: { workspaceId, projectId: data.projectId, name: lName },
          });
          if (!label) {
            label = await tx.projectIssueLabel.create({
              data: {
                workspaceId,
                projectId: data.projectId,
                name: lName,
                color: '#4f46e5',
              },
            });
          }
          await tx.projectIssueLabelMapping.create({
            data: {
              issueId: issue.id,
              labelId: label.id,
            },
          });
        }
      }

      return tx.projectIssue.findUnique({
        where: { id: issue.id },
        include: {
          reporter: true,
          assignees: {
            include: {
              user: true,
            },
          },
          cycle: true,
          module: true,
          release: true,
          labels: {
            include: {
              label: true,
            },
          },
        },
      });
    });
  }

  async updateProjectIssue(
    workspaceId: string,
    issueId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      type?: string;
      priority?: string;
      status?: string;
      dueDate?: Date;
      estimatedTime?: number;
      timeSpent?: number;
      assigneeIds?: string[];
      cycleId?: string;
      moduleId?: string;
      releaseId?: string;
      parentIssueId?: string;
      blockerIds?: string[];
      labels?: string[];
    }
  ) {
    const issue = await this.prisma.projectIssue.findUnique({ where: { id: issueId } });
    if (!issue) throw new Error('Issue not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, issue.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
      if (data.estimatedTime !== undefined) updateData.estimatedTime = data.estimatedTime;
      if (data.timeSpent !== undefined) updateData.timeSpent = data.timeSpent;
      if (data.cycleId !== undefined) updateData.cycleId = data.cycleId;
      if (data.moduleId !== undefined) updateData.moduleId = data.moduleId;
      if (data.releaseId !== undefined) updateData.releaseId = data.releaseId;
      if (data.parentIssueId !== undefined) updateData.parentIssueId = data.parentIssueId;

      await tx.projectIssue.update({
        where: { id: issueId },
        data: updateData,
      });

      if (data.assigneeIds !== undefined) {
        await tx.projectIssueAssignee.deleteMany({ where: { issueId } });
        if (data.assigneeIds.length > 0) {
          await tx.projectIssueAssignee.createMany({
            data: data.assigneeIds.map((uId) => ({
              issueId,
              userId: uId,
            })),
          });
        }
      }

      if (data.blockerIds !== undefined) {
        await tx.projectIssueDependency.deleteMany({ where: { blockedIssueId: issueId } });
        if (data.blockerIds.length > 0) {
          await tx.projectIssueDependency.createMany({
            data: data.blockerIds.map((bId) => ({
              blockedIssueId: issueId,
              blockerIssueId: bId,
            })),
          });
        }
      }

      if (data.labels !== undefined) {
        await tx.projectIssueLabelMapping.deleteMany({ where: { issueId } });
        for (const lName of data.labels) {
          let label = await tx.projectIssueLabel.findFirst({
            where: { workspaceId, projectId: issue.projectId, name: lName },
          });
          if (!label) {
            label = await tx.projectIssueLabel.create({
              data: {
                workspaceId,
                projectId: issue.projectId,
                name: lName,
                color: '#4f46e5',
              },
            });
          }
          await tx.projectIssueLabelMapping.create({
            data: {
              issueId,
              labelId: label.id,
            },
          });
        }
      }

      return tx.projectIssue.findUnique({
        where: { id: issueId },
        include: {
          reporter: true,
          assignees: {
            include: {
              user: true,
            },
          },
          cycle: true,
          module: true,
          release: true,
          labels: {
            include: {
              label: true,
            },
          },
          blockedIssues: {
            include: {
              blockerIssue: true,
            },
          },
        },
      });
    });
  }

  async deleteProjectIssue(workspaceId: string, id: string, userId: string): Promise<boolean> {
    const issue = await this.prisma.projectIssue.findUnique({ where: { id } });
    if (!issue) throw new Error('Issue not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, issue.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const result = await this.prisma.projectIssue.delete({ where: { id } });
    return !!result;
  }

  // ================= LABELS =================

  async getProjectLabels(workspaceId: string, projectId: string, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectIssueLabel.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async createProjectLabel(workspaceId: string, projectId: string, userId: string, data: { name: string; color?: string }) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectIssueLabel.create({
      data: {
        workspaceId,
        projectId,
        name: data.name,
        color: data.color || '#4f46e5',
      },
    });
  }

  async deleteProjectLabel(workspaceId: string, labelId: string, userId: string): Promise<boolean> {
    const label = await this.prisma.projectIssueLabel.findUnique({ where: { id: labelId } });
    if (!label) throw new Error('Label not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, label.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const result = await this.prisma.projectIssueLabel.delete({ where: { id: labelId } });
    return !!result;
  }

  // ================= COMMENTS =================

  async getProjectIssueComments(workspaceId: string, issueId: string, userId: string) {
    const issue = await this.prisma.projectIssue.findUnique({ where: { id: issueId } });
    if (!issue) throw new Error('Issue not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, issue.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectIssueComment.findMany({
      where: { issueId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createProjectIssueComment(workspaceId: string, issueId: string, userId: string, content: string) {
    const issue = await this.prisma.projectIssue.findUnique({ where: { id: issueId } });
    if (!issue) throw new Error('Issue not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, issue.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    return this.prisma.projectIssueComment.create({
      data: {
        workspaceId,
        issueId,
        userId,
        content,
      },
      include: {
        user: true,
      },
    });
  }

  async deleteProjectIssueComment(workspaceId: string, commentId: string, userId: string): Promise<boolean> {
    const comment = await this.prisma.projectIssueComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error('Comment not found');

    const issue = await this.prisma.projectIssue.findUnique({ where: { id: comment.issueId } });
    if (!issue) throw new Error('Issue not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, issue.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const role = await this.getWorkspaceRole(workspaceId, userId);

    // Comment owner or workspace admins/owners can delete comments
    if (comment.userId !== userId && role !== WorkspaceRole.Owner && role !== WorkspaceRole.Admin) {
      throw new Error('You do not have permission to delete this comment');
    }

    const result = await this.prisma.projectIssueComment.delete({ where: { id: commentId } });
    return !!result;
  }

  // ================= SECURE SETTINGS =================

  async getWorkspaceGeminiSetting(workspaceId: string) {
    let setting = await this.prisma.workspaceGeminiSetting.findUnique({
      where: { workspaceId },
    });

    const globalConfig = this.serverService.getConfig();
    const dbOverrides = this.serverService.getDbOverrides();
    const globalGeminiKey =
      (dbOverrides as any)?.copilot?.providers?.gemini?.apiKey ||
      globalConfig.copilot?.providers?.gemini?.apiKey ||
      '';
    const globalProjectModel =
      (dbOverrides as any)?.copilot?.providers?.gemini?.model ||
      globalConfig.copilot?.providers?.gemini?.model ||
      'gemini-3.1-flash-lite';
    const globalMeetingModel = globalProjectModel;

    if (!setting) {
      setting = await this.prisma.workspaceGeminiSetting.create({
        data: {
          workspaceId,
          model: globalProjectModel,
          meetingModel: globalMeetingModel,
          allowGemini: true,
          limitOutput: false,
          allowWithoutPermission: true,
          lockContentFor: [],
        },
      });
    }

    const effectiveModel = globalProjectModel;
    const effectiveMeetingModel = setting.meetingModel || globalMeetingModel;

    return {
      ...setting,
      apiKey: setting.apiKey || globalGeminiKey,
      model: effectiveModel,
      meetingModel: effectiveMeetingModel,
    };
  }

  async updateWorkspaceGeminiSetting(
    workspaceId: string,
    data: {
      apiKey?: string;
      model?: string;
      meetingModel?: string;
      allowGemini?: boolean;
      limitOutput?: boolean;
      sshHost?: string;
      sshUser?: string;
      sshPass?: string;
      allowWithoutPermission?: boolean;
      lockContentFor?: any;
    }
  ) {
    const updateData: any = {};
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.meetingModel !== undefined) updateData.meetingModel = data.meetingModel;
    if (data.allowGemini !== undefined) updateData.allowGemini = data.allowGemini;
    if (data.limitOutput !== undefined) updateData.limitOutput = data.limitOutput;
    if (data.sshHost !== undefined) updateData.sshHost = data.sshHost;
    if (data.sshUser !== undefined) updateData.sshUser = data.sshUser;
    if (data.sshPass !== undefined) updateData.sshPass = data.sshPass;
    if (data.allowWithoutPermission !== undefined) updateData.allowWithoutPermission = data.allowWithoutPermission;
    if (data.lockContentFor !== undefined) updateData.lockContentFor = data.lockContentFor;

    return this.prisma.workspaceGeminiSetting.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        apiKey: data.apiKey ?? null,
        model: data.model ?? 'gemini-2.5-flash',
        meetingModel: data.meetingModel ?? 'gemini-2.5-flash',
        allowGemini: data.allowGemini ?? true,
        limitOutput: data.limitOutput ?? false,
        sshHost: data.sshHost ?? null,
        sshUser: data.sshUser ?? null,
        sshPass: data.sshPass ?? null,
        allowWithoutPermission: data.allowWithoutPermission ?? true,
        lockContentFor: data.lockContentFor ?? [],
      },
      update: updateData,
    });
  }

  // ================= DOCUMENTS =================

  async getProjectDocuments(workspaceId: string, projectId: string, releaseId: string, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied to project');

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });

    const role = await this.getWorkspaceRole(workspaceId, userId);
    const isOwnerOrAdmin = role === WorkspaceRole.Owner || role === WorkspaceRole.Admin;
    const isProjectManager = Boolean(project?.projectManagerId && project.projectManagerId === userId);
    const isManager = (isOwnerOrAdmin || isProjectManager) && userId !== 'share-guest';

    if (!isManager) {
      const config = await this.prisma.projectDocsConfig.findUnique({
        where: { projectId },
      });
      const now = new Date();
      const isPublicAccess = Boolean(config?.docsPublicActive && config?.docsPublicUntil && now < new Date(config.docsPublicUntil));
      const isSharedAccess = Boolean(config?.docsSharedActive && config?.docsSharedUntil && now < new Date(config.docsSharedUntil));
      if (!isPublicAccess && !isSharedAccess) {
        return [];
      }
    }

    return this.prisma.projectDocument.findMany({
      where: { projectId, releaseId },
      orderBy: { type: 'asc' },
    });
  }

  async getProjectDocsConfig(workspaceId: string, projectId: string, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied to project');

    return this.prisma.projectDocsConfig.upsert({
      where: { projectId },
      create: { projectId },
      update: {},
    });
  }

  async upsertProjectDocument(
    workspaceId: string,
    projectId: string,
    releaseId: string,
    type: string,
    title: string,
    content: string,
    userId: string
  ) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied to project');

    // Immutability Protection: signed/approved documents cannot be modified
    const existing = await this.prisma.projectDocument.findUnique({
      where: { projectId_releaseId_type: { projectId, releaseId, type } },
    });

    if (existing && (existing.status === 'ApprovedByClient' || existing.status === 'SignedByClient')) {
      throw new Error('Approved/signed documents are immutable and cannot be updated.');
    }

    const isNewDoc = !existing;
    const doc = await this.prisma.projectDocument.upsert({
      where: { projectId_releaseId_type: { projectId, releaseId, type } },
      create: {
        workspaceId,
        projectId,
        releaseId,
        type,
        title,
        content,
        status: 'Draft',
      },
      update: {
        title,
        content,
        version: existing ? existing.version + 1 : 1,
      },
    });

    if (isNewDoc) {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      const actorUser = await this.prisma.user.findUnique({ where: { id: userId } });

      this.dispatchActionEmails({
        workspaceId,
        projectId,
        projectManagerId: project?.projectManagerId,
        actorUserId: userId,
        templateName: 'DocumentCreated',
        templateProps: {
          user: { name: actorUser?.name || actorUser?.email || 'User', email: actorUser?.email || '' },
          workspace: { id: workspaceId, name: workspace?.name || 'Workspace' },
          projectName: project?.name || 'Project',
          documentTitle: title,
          createdByName: actorUser?.name || actorUser?.email || 'User',
          timestamp: new Date().toLocaleString(),
        },
      });
    } else {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      const actorUser = await this.prisma.user.findUnique({ where: { id: userId } });

      this.dispatchActionEmails({
        workspaceId,
        projectId,
        projectManagerId: project?.projectManagerId,
        actorUserId: userId,
        templateName: 'DocumentEdited',
        templateProps: {
          user: { name: actorUser?.name || actorUser?.email || 'User', email: actorUser?.email || '' },
          workspace: { id: workspaceId, name: workspace?.name || 'Workspace' },
          projectName: project?.name || 'Project',
          documentTitle: title,
          editedByName: actorUser?.name || actorUser?.email || 'User',
          timestamp: new Date().toLocaleString(),
        },
      });
    }

    return doc;
  }

  async sendDeleteOtp(_workspaceId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const targetEmail = user?.companyMail || user?.email;
    if (!targetEmail) {
      throw new Error('Email address not found for user profile.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.projectDocOtp.create({
      data: {
        email: targetEmail,
        code,
        expiresAt,
        purpose: 'DeleteDocument',
      },
    });

    const emailData = await Renderers.DocumentActionOtp({
      title: 'Document Deletion Authorization',
      actionDescription: 'Please enter the following one-time verification code to authorize permanently deleting this project document:',
      otp: code,
      expiresInMinutes: 10,
    });
    await this.mailSender.send('DeleteDocumentOtp', {
      to: targetEmail,
      subject: '[IntoAI Workspace] Document Deletion Verification Code',
      html: emailData.html,
    });

    return true;
  }

  async deleteProjectDocument(workspaceId: string, documentId: string, otpCode: string, userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const targetEmail = user?.companyMail || user?.email;
    if (!targetEmail) {
      throw new Error('Email address not found for user profile.');
    }

    const validOtp = await this.prisma.projectDocOtp.findFirst({
      where: {
        email: targetEmail,
        code: otpCode,
        purpose: 'DeleteDocument',
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      throw new Error('Invalid or expired OTP code.');
    }

    const doc = await this.prisma.projectDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, doc.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    const project = await this.prisma.project.findUnique({ where: { id: doc.projectId } });
    const actorUser = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.projectDocument.delete({ where: { id: documentId } });
    await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });

    this.dispatchActionEmails({
      workspaceId,
      projectId: doc.projectId,
      projectManagerId: project?.projectManagerId,
      actorUserId: userId,
      templateName: 'DocumentDeleted',
      templateProps: {
        user: { name: actorUser?.name || actorUser?.email || 'User', email: actorUser?.email || '' },
        workspace: { id: workspaceId, name: workspace?.name || 'Workspace' },
        projectName: project?.name || 'Project',
        documentTitle: doc.title,
        deletedByName: actorUser?.name || actorUser?.email || 'User',
        timestamp: new Date().toLocaleString(),
      },
    });

    return true;
  }

  async copyDocumentFromPreviousVersion(
    workspaceId: string,
    projectId: string,
    releaseId: string,
    type: string,
    userId: string
  ) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new AccessDenied('Access denied');

    // 1. Find current release to get its context
    const currentRelease = await this.prisma.projectRelease.findUnique({ where: { id: releaseId } });
    if (!currentRelease) {
      return null;
    }

    // 2. Find preceding release (ordered by createdAt before currentRelease)
    const prevRelease = await this.prisma.projectRelease.findFirst({
      where: {
        projectId,
        createdAt: { lt: currentRelease.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!prevRelease) {
      return null;
    }

    // 3. Find document of that type in the previous version
    const prevDoc = await this.prisma.projectDocument.findUnique({
      where: { projectId_releaseId_type: { projectId, releaseId: prevRelease.id, type } },
    });

    if (!prevDoc) {
      return null;
    }

    // 4. Duplicate document under current release version
    const createdDoc = await this.prisma.projectDocument.create({
      data: {
        workspaceId,
        projectId,
        releaseId,
        type,
        title: prevDoc.title,
        content: prevDoc.content,
        status: 'Draft',
      },
    });

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const actorUser = await this.prisma.user.findUnique({ where: { id: userId } });

    this.dispatchActionEmails({
      workspaceId,
      projectId,
      projectManagerId: project?.projectManagerId,
      actorUserId: userId,
      templateName: 'DocumentCreated',
      templateProps: {
        user: { name: actorUser?.name || actorUser?.email || 'User', email: actorUser?.email || '' },
        workspace: { id: workspaceId, name: workspace?.name || 'Workspace' },
        projectName: project?.name || 'Project',
        documentTitle: prevDoc.title,
        createdByName: actorUser?.name || actorUser?.email || 'User',
        timestamp: new Date().toLocaleString(),
      },
    });

    return createdDoc;
  }

  private async assertNotVpn(ip: string) {
    let targetIp = (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('172.') && !ip.startsWith('10.') && !ip.startsWith('192.168.')) ? ip.trim() : '';

    const vpnRegex = /\b(NForce|Nforce|NFOrce|ExpressVPN|NordVPN|ProtonVPN|CyberGhost|Surfshark|Mullvad|PIA|Private Internet Access|TunnelBear|Windscribe|WireGuard|OpenVPN|Urban|TouchVPN|ZenMate|Hola|M247|DigitalOcean|Linode|AWS|Amazon|OVH|Leaseweb|Vultr|Hetzner|Anonymizer|Virtual Private Network|Proxy|Datacenter|Data Center|Hosting|Server|VPS|Cloudflare|Warp|IPVanish|HideMyAss|HMA|Hotspot Shield|VyprVPN|IVPN|AdGuard|Betternet|Psiphon|Fortinet|Cisco|AnyConnect|Palo Alto|GlobalProtect|Zscaler|Tailscale|ZeroTier|Sophos|SonicWall|Nord|Proton|Express|Surfshark|Mullvad|AirVPN|TorGuard|StrongVPN|PureVPN|ZenMate|UltraSurf|VpnGate|FastestVPN|PrivateVPN|Ivacy|VPN|Proxy|Hosting|Server|Datacenter|VPC|Transit|BGP|ASN|Infrastructure|Tunnel|Choopa|Constant|Hostinger|Ponynet|FranTech|Serverius|Cogent|Teraswitch|BuyVM|Fasthosts|Contabo|Ionos|Clouvider|Datacamp|Performive|QuadraNet|Psychz|Servers\.com|Equinix|InterServer|DMC|Packet|Zenlayer|Alibaba|Tencent|Oracle|GCP|Google Cloud|Azure|Microsoft|Fastly|Akamai|Cdn77|Imperva|Incapsula|Sucuri)\b/i;

    let isVpn = false;
    let detectedReason = '';

    // Check Provider 1: ipwho.is
    try {
      const url = targetIp ? `https://ipwho.is/${encodeURIComponent(targetIp)}` : 'https://ipwho.is/';
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data: any = await res.json();
      if (data && data.success) {
        if (data.security && (data.security.vpn === true || data.security.proxy === true || data.security.tor === true || data.security.hosting === true)) {
          isVpn = true;
          detectedReason = `ipwho.is security flag (${JSON.stringify(data.security)})`;
        }
        const ispStr = `${data.connection?.isp || ''} ${data.connection?.org || ''} ${data.connection?.domain || ''} ${data.connection?.asn || ''}`;
        if (vpnRegex.test(ispStr)) {
          isVpn = true;
          detectedReason = `ipwho.is ISP match (${ispStr})`;
        }
      }
    } catch (e: any) {
      console.warn('[DEBUG VPN CHECK] ipwho.is lookup failed:', e?.message || e);
    }

    if (isVpn) {
      throw new BadRequestException(`Security Violation: VPN or Proxy connection detected (${detectedReason}). Please disable your VPN to approve or sign documents.`);
    }

    // Check Provider 2: ipinfo.io
    try {
      const url = targetIp ? `https://ipinfo.io/${encodeURIComponent(targetIp)}/json` : 'https://ipinfo.io/json';
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data: any = await res.json();
      if (data && (data.org || data.hostname)) {
        if (data.privacy && (data.privacy.vpn || data.privacy.proxy || data.privacy.tor || data.privacy.hosting)) {
          isVpn = true;
          detectedReason = `ipinfo.io privacy flag (${JSON.stringify(data.privacy)})`;
        }
        const ispStr = `${data.org || ''} ${data.company?.name || ''} ${data.hostname || ''}`;
        if (vpnRegex.test(ispStr)) {
          isVpn = true;
          detectedReason = `ipinfo.io ISP match (${ispStr})`;
        }
      }
    } catch (e: any) {
      console.warn('[DEBUG VPN CHECK] ipinfo.io lookup failed:', e?.message || e);
    }

    if (isVpn) {
      throw new BadRequestException(`Security Violation: VPN or Proxy connection detected (${detectedReason}). Please disable your VPN to approve or sign documents.`);
    }

    // Check Provider 3: ip-api.com
    try {
      const url = targetIp ? `http://ip-api.com/json/${encodeURIComponent(targetIp)}?fields=status,country,isp,org,as,mobile,proxy,hosting,query` : 'http://ip-api.com/json/?fields=status,country,isp,org,as,mobile,proxy,hosting,query';
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
      const data: any = await res.json();
      if (data && (data.status === 'success' || data.query)) {
        if (data.proxy === true || data.hosting === true) {
          isVpn = true;
          detectedReason = `ip-api.com proxy/hosting flag (proxy=${data.proxy}, hosting=${data.hosting})`;
        }
        const ispStr = `${data.isp || ''} ${data.org || ''} ${data.as || ''}`;
        if (vpnRegex.test(ispStr)) {
          isVpn = true;
          detectedReason = `ip-api.com ISP match (${ispStr})`;
        }
      }
    } catch (e: any) {
      console.warn('[DEBUG VPN CHECK] ip-api.com lookup failed:', e?.message || e);
    }

    if (isVpn) {
      throw new BadRequestException(`Security Violation: VPN or Proxy connection detected (${detectedReason}). Please disable your VPN to approve or sign documents.`);
    }

    // Check Provider 4: ipapi.co
    try {
      const url = targetIp ? `https://ipapi.co/${encodeURIComponent(targetIp)}/json/` : 'https://ipapi.co/json/';
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data: any = await res.json();
      if (data && !data.error && data.org) {
        const ispStr = `${data.org || ''} ${data.asn || ''}`;
        if (vpnRegex.test(ispStr)) {
          isVpn = true;
          detectedReason = `ipapi.co ISP match (${ispStr})`;
        }
      }
    } catch (e: any) {
      console.warn('[DEBUG VPN CHECK] ipapi.co lookup failed:', e?.message || e);
    }

    if (isVpn) {
      throw new BadRequestException(`Security Violation: VPN or Proxy connection detected (${detectedReason}). Please disable your VPN to approve or sign documents.`);
    }
  }

  async approveDocumentInternally(workspaceId: string, documentId: string, userId: string, ip?: string) {
    const doc = await this.prisma.projectDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    const hasAccess = await this.hasProjectAccess(workspaceId, doc.projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const project = await this.prisma.project.findUnique({ where: { id: doc.projectId } });
    if (!project?.projectManagerId) {
      throw new Error('No Project Manager is assigned to this project. Internal approval requires an assigned Project Manager.');
    }
    if (project.projectManagerId !== userId) {
      throw new Error('Only the assigned Project Manager of this project can approve documents internally.');
    }

    if (ip) {
      await this.assertNotVpn(ip);
    }

    let pmName: string | null = project?.projectManagerName || null;
    if (!pmName && project?.projectManagerId) {
      const pmUser = await this.prisma.user.findUnique({ where: { id: project.projectManagerId } });
      pmName = pmUser?.name || pmUser?.email || null;
    }
    if (!pmName) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      pmName = user?.name || user?.email || 'Ansan Mathew';
    }

    const updatedDoc = await this.prisma.projectDocument.update({
      where: { id: documentId },
      data: {
        status: 'ApprovedInternally',
        approvedInternallyBy: `${pmName} | PM`,
      },
    });

    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    const actorUser = await this.prisma.user.findUnique({ where: { id: userId } });

    this.dispatchActionEmails({
      workspaceId,
      projectId: doc.projectId,
      projectManagerId: project?.projectManagerId,
      actorUserId: userId,
      templateName: 'InternalDocumentApproved',
      templateProps: {
        user: { name: actorUser?.name || actorUser?.email || 'User', email: actorUser?.email || '' },
        workspace: { id: workspaceId, name: workspace?.name || 'Workspace' },
        projectName: project?.name || 'Project',
        documentTitle: doc.title,
        approvedBy: `${pmName} | PM`,
        timestamp: new Date().toLocaleString(),
      },
    });

    return updatedDoc;
  }

  async getClientEmailForWorkspace(workspaceId: string, userId: string): Promise<string> {
    const authorizedMails = await this.getWorkspaceAuthorizedEmails(workspaceId);
    if (authorizedMails.length > 0) {
      return authorizedMails[0];
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.companyMail || user?.email || 'business@intoai.ai';
  }

  async sendDocumentsForApproval(
    workspaceId: string,
    projectId: string,
    releaseId: string,
    documentTypes: string[],
    days: number,
    userId: string
  ) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) throw new Error('Project not found');

    const docsSharedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.projectDocsConfig.upsert({
      where: { projectId },
      create: {
        projectId,
        docsSharedVersionId: releaseId,
        docsSharedDocumentTypes: documentTypes.join(','),
        docsSharedUntil,
        docsSharedActive: true,
        docsPublicUntil: docsSharedUntil,
        docsPublicActive: true,
      },
      update: {
        docsSharedVersionId: releaseId,
        docsSharedDocumentTypes: documentTypes.join(','),
        docsSharedUntil,
        docsSharedActive: true,
        docsPublicUntil: docsSharedUntil,
        docsPublicActive: true,
      },
    });

    // Update statuses of the documents to 'Draft' / 'SentForApproval'
    await this.prisma.projectDocument.updateMany({
      where: {
        projectId,
        releaseId,
        type: { in: documentTypes },
        status: { in: ['Draft', 'ApprovedInternally'] },
      },
      data: {
        status: 'Draft',
      },
    });

    const clientEmail = await this.getClientEmailForWorkspace(workspaceId, userId);
    const guestUrl = `https://one.intoai.ai/workspace/${workspaceId}?shareKey=${encodeURIComponent(project.shareKey || '')}`;
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });

    const emailContent = await Renderers.DocumentsSentForApproval({
      workspace: { name: workspace?.name || 'Workspace' },
      projectName: project.name,
      clientEmail,
      portalUrl: guestUrl,
      accessDays: days,
    });

    await this.mailSender.send('DocumentsSentForApproval', {
      to: clientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return true;
  }

  async makeDocsDirectoryPublic(workspaceId: string, projectId: string, days: number, userId: string) {
    const hasAccess = await this.hasProjectAccess(workspaceId, projectId, userId);
    if (!hasAccess) throw new Error('Access denied');

    if (days <= 0) {
      await this.prisma.projectDocsConfig.upsert({
        where: { projectId },
        create: {
          projectId,
          docsPublicUntil: null,
          docsPublicActive: false,
          docsSharedUntil: null,
          docsSharedActive: false,
        },
        update: {
          docsPublicUntil: null,
          docsPublicActive: false,
          docsSharedUntil: null,
          docsSharedActive: false,
        },
      });
      return true;
    }

    const docsPublicUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.projectDocsConfig.upsert({
      where: { projectId },
      create: {
        projectId,
        docsPublicUntil,
        docsPublicActive: true,
      },
      update: {
        docsPublicUntil,
        docsPublicActive: true,
      },
    });

    const project = await this.prisma.project.findFirst({ where: { id: projectId, workspaceId } });
    if (project) {
      const clientEmail = await this.getClientEmailForWorkspace(workspaceId, userId);
      const guestUrl = `https://one.intoai.ai/workspace/${workspaceId}?shareKey=${encodeURIComponent(project.shareKey || '')}`;
      const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });

      const emailContent = await Renderers.ClientKeyAccessGranted({
        workspace: { name: workspace?.name || 'Workspace' },
        projectName: project.name,
        clientEmail,
        portalUrl: guestUrl,
        accessDays: days,
      });

      await this.mailSender.send('ClientKeyAccessGranted', {
        to: clientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    }

    return true;
  }

  // ================= CLIENT ACTIONS (NO AUTH GUEST ENDPOINTS) =================

  async clientApproveDocument(
    documentId: string,
    ip: string,
    browser: string,
    device: string,
    email: string
  ) {
    const doc = await this.prisma.projectDocument.findUnique({
      where: { id: documentId },
      include: { project: true },
    });
    if (!doc) throw new Error('Document not found');

    const config = await this.prisma.projectDocsConfig.findUnique({
      where: { projectId: doc.projectId },
    });

    // Assert access is still active
    const isPublicAccess = config?.docsPublicActive && config?.docsPublicUntil && new Date() < config.docsPublicUntil;
    const isSharedAccess = config?.docsSharedActive && config?.docsSharedUntil && new Date() < config.docsSharedUntil;

    if (!isPublicAccess && !isSharedAccess) {
      throw new Error('Document access window has expired.');
    }

    if (ip) {
      await this.assertNotVpn(ip);
    }

    let rawEmail = (email && email.trim() && email.includes('@') && !email.includes('client@verified.share')) ? email.trim().toLowerCase() : 'business@intoai.ai';
    if (rawEmail.includes(',')) {
      rawEmail = rawEmail.split(',')[0].trim().toLowerCase();
    }
    const targetEmail = rawEmail;

    const updated = await this.prisma.projectDocument.update({
      where: { id: documentId },
      data: {
        status: 'ApprovedByClient',
        approvalIp: ip,
        approvalBrowser: browser,
        approvalDevice: device,
        approvalEmail: targetEmail,
        approvalTimestamp: new Date(),
      },
    });

    const workspace = await this.prisma.workspace.findUnique({ where: { id: doc.project.workspaceId } });

    this.dispatchActionEmails({
      workspaceId: doc.project.workspaceId,
      projectId: doc.projectId,
      projectManagerId: doc.project.projectManagerId,
      clientEmail: email,
      templateName: 'ClientDocumentApproved',
      templateProps: {
        workspace: { name: workspace?.name || 'Workspace' },
        projectName: doc.project.name,
        documentTitle: doc.title,
        clientEmail: email,
        timestamp: new Date().toLocaleString(),
      },
    });

    return updated;
  }

  async sendClientSignatureOtp(documentId: string, email: string) {
    const doc = await this.prisma.projectDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.projectDocOtp.create({
      data: {
        email,
        code,
        expiresAt,
        purpose: 'ClientSignature',
      },
    });

    const emailData = await Renderers.DocumentActionOtp({
      title: 'Digital Signature Verification',
      actionDescription: `Please enter the following one-time verification code to digitally sign and approve the document "${doc.title}":`,
      otp: code,
      expiresInMinutes: 15,
    });
    await this.mailSender.send('ClientSignatureOtp', {
      to: email,
      subject: `[IntoAI Workspace] Digital Signature Verification Code - ${doc.title}`,
      html: emailData.html,
    });

    return true;
  }

  async clientSignDocument(
    documentId: string,
    otp: string,
    ip: string,
    browser: string,
    device: string,
    email: string
  ) {
    // 1. Verify OTP
    const validOtp = await this.prisma.projectDocOtp.findFirst({
      where: {
        email,
        code: otp,
        purpose: 'ClientSignature',
        expiresAt: { gt: new Date() },
      },
    });

    if (!validOtp) {
      throw new Error('Invalid or expired signature OTP code.');
    }

    const doc = await this.prisma.projectDocument.findUnique({
      where: { id: documentId },
      include: { project: true },
    });
    if (!doc) throw new Error('Document not found');

    if (ip) {
      await this.assertNotVpn(ip);
    }

    const updated = await this.prisma.projectDocument.update({
      where: { id: documentId },
      data: {
        status: 'SignedByClient',
        approvalIp: ip,
        approvalBrowser: browser,
        approvalDevice: device,
        approvalEmail: email,
        approvalTimestamp: new Date(),
      },
    });

    await this.prisma.projectDocOtp.delete({ where: { id: validOtp.id } });

    const workspace = await this.prisma.workspace.findUnique({ where: { id: doc.project.workspaceId } });

    this.dispatchActionEmails({
      workspaceId: doc.project.workspaceId,
      projectId: doc.projectId,
      projectManagerId: doc.project.projectManagerId,
      clientEmail: email,
      templateName: 'ClientDocumentSigned',
      templateProps: {
        workspace: { name: workspace?.name || 'Workspace' },
        projectName: doc.project.name,
        documentTitle: doc.title,
        clientEmail: email,
        timestamp: new Date().toLocaleString(),
      },
    });

    return updated;
  }

  async sendDocumentsToMail(documentIds: string[], email: string) {
    const docs = await this.prisma.projectDocument.findMany({
      where: { id: { in: documentIds } },
    });

    for (const doc of docs) {
      await this.mailSender.send('SendDocumentCopy', {
        to: email,
        subject: `Document Copy: ${doc.title}`,
        html: `
          <div style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 32px; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; color: #161616;">
            <div style="border-bottom: 2px solid #0f62fe; padding-bottom: 14px; margin-bottom: 20px;">
              <div style="font-size: 10.5px; font-weight: 700; color: #0f62fe; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Brightloop Enterprise Solutions</div>
              <h2 style="color: #161616; margin: 0 0 4px 0; font-size: 20px; font-weight: 700;">${doc.title}</h2>
              <div style="font-size: 11.5px; color: #6f6f6f;">Document Type: ${doc.type} | Version: _v${doc.version} | Last Edited: ${doc.lastEditTime.toLocaleString()}</div>
            </div>
            
            <div style="margin: 20px 0; line-height: 1.65; white-space: pre-wrap; font-size: 13px; color: #262626; background: #fafafa; padding: 16px; border: 1px solid #e0e0e0; border-radius: 4px;">
${doc.content}
            </div>

            ${doc.approvedInternallyBy ? `
              <div style="margin: 16px 0; padding: 10px 14px; background: #edf5ff; border-left: 3px solid #0f62fe; font-size: 12px; color: #0043ce; font-weight: 600;">
                Approved internally by ${doc.approvedInternallyBy}
              </div>
            ` : ''}

            ${doc.approvalEmail ? `
              <div style="margin-top: 20px; padding: 14px; background: #edf5ff; border: 1px solid #0f62fe; border-radius: 4px; font-size: 11.5px;">
                <div style="font-weight: 700; color: #0043ce; text-transform: uppercase; margin-bottom: 6px; font-size: 11px;">Digital Authorization Record</div>
                <div style="color: #262626;"><strong>Signee Email:</strong> ${doc.approvalEmail}</div>
                <div style="color: #262626;"><strong>Timestamp:</strong> ${doc.approvalTimestamp ? doc.approvalTimestamp.toLocaleString() : 'N/A'}</div>
                <div style="color: #262626;"><strong>IP / Network:</strong> ${doc.approvalIp || 'Verified'}</div>
              </div>
            ` : ''}

            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 24px 0 16px 0;" />
            <p style="font-size: 10.5px; color: #6f6f6f; margin: 0; text-align: center;">Confidential & Proprietary. Prepared by Brightloop for authorized stakeholders.</p>
          </div>
        `,
      });
    }

    return true;
  }

  async getWorkspaceAuthorizedEmails(workspaceId: string): Promise<string[]> {
    const emailSet = new Set<string>();

    // 1. Try to parse YJS workspace meta (authorizedMails and companyMail)
    try {
      const snapshot = await this.prisma.snapshot.findUnique({
        where: {
          workspaceId_id: {
            workspaceId,
            id: workspaceId,
          },
        },
      });

      const updates = await this.prisma.update.findMany({
        where: {
          workspaceId,
          id: workspaceId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const ydoc = new YDoc();
      if (snapshot?.blob) {
        applyUpdate(ydoc, snapshot.blob);
      }
      for (const u of updates) {
        applyUpdate(ydoc, u.blob);
      }

      if (ydoc.share.has('meta')) {
        const meta = ydoc.getMap('meta');
        const authorizedMailsStr = (meta.get('authorizedMails') as string) || '';
        const companyMailStr = (meta.get('companyMail') as string) || '';

        if (authorizedMailsStr) {
          authorizedMailsStr
            .split(/[,;\s\n]+/)
            .map(e => e.trim().toLowerCase())
            .filter(Boolean)
            .forEach(e => emailSet.add(e));
        }

        if (companyMailStr) {
          emailSet.add(companyMailStr.trim().toLowerCase());
        }
      }
    } catch (e) {
      console.error('[getWorkspaceAuthorizedEmails] Error parsing YJS:', e);
    }

    // 2. Query workspace members & users from Prisma DB
    try {
      const members = await (this.prisma as any).workspaceUserPermission?.findMany({
        where: { workspaceId },
        include: { user: true },
      });
      if (Array.isArray(members)) {
        for (const m of members) {
          if (m.user?.email) emailSet.add(m.user.email.trim().toLowerCase());
          if (m.user?.companyMail) emailSet.add(m.user.companyMail.trim().toLowerCase());
        }
      }
    } catch (e) {
      console.error('[getWorkspaceAuthorizedEmails] Error fetching workspace members:', e);
    }

    // 3. Query project documents client/approval emails from Prisma DB
    try {
      const docs = await (this.prisma as any).projectDocument?.findMany({
        where: { project: { workspaceId } },
        select: { approvalEmail: true },
      });
      if (Array.isArray(docs)) {
        for (const d of docs) {
          if (d.approvalEmail) emailSet.add(d.approvalEmail.trim().toLowerCase());
        }
      }
    } catch (e) {
      console.error('[getWorkspaceAuthorizedEmails] Error fetching doc client emails:', e);
    }

    return Array.from(emailSet);
  }

  async sendProjectShareGuestOtp(workspaceId: string, email: string): Promise<boolean> {
    const authorized = await this.getWorkspaceAuthorizedEmails(workspaceId);
    const targetEmail = email.trim().toLowerCase();

    if (authorized.length > 0 && !authorized.includes(targetEmail)) {
      console.warn(`[sendProjectShareGuestOtp] Email ${targetEmail} not found in workspace authorized list:`, authorized);
      // Security: return true silently to prevent email enumeration/discovery attacks
      return true;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Clear old unexpired OTPs for this email & purpose
    await this.prisma.projectDocOtp.deleteMany({
      where: {
        email: targetEmail,
        purpose: 'ProjectShareGuest',
      },
    }).catch(() => {});

    await this.prisma.projectDocOtp.create({
      data: {
        email: targetEmail,
        code,
        expiresAt,
        purpose: 'ProjectShareGuest',
      },
    });

    try {
      const emailData = await Renderers.SignIn({
        url: '',
        otp: code,
      });
      await this.mailSender.send('ProjectShareGuestOtp', {
        to: targetEmail,
        subject: 'Verification Code - Brightloop Workspace Guest Access',
        html: emailData.html,
      });
    } catch (e) {
      console.error('[sendProjectShareGuestOtp] Mail error:', e);
    }

    return true;
  }

  async verifyProjectShareGuestOtp(
    workspaceId: string,
    email: string,
    otp: string,
    projectId?: string | null
  ): Promise<string> {
    const targetEmail = email.trim().toLowerCase();
    const inputOtp = otp.trim();

    const record = await this.prisma.projectDocOtp.findFirst({
      where: {
        email: targetEmail,
        code: inputOtp,
        purpose: 'ProjectShareGuest',
        expiresAt: { gte: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    await this.prisma.projectDocOtp.delete({ where: { id: record.id } }).catch(() => {});

    const password = 'permanentGuestPass123';
    const hasher = createHash('sha256');
    hasher.update(password + workspaceId + (projectId || ''));
    const passwordHash = hasher.digest('hex');

    const createdAt = Date.now();
    const payload = `${workspaceId}:${projectId || ''}:${passwordHash}:${createdAt}:${targetEmail}`;
    const guestSessionShareKey = this.cryptoHelper.sign(payload);

    try {
      if (projectId) {
        await this.prisma.project.update({
          where: { id: projectId },
          data: {
            shareKey: guestSessionShareKey,
            sharePasswordHash: passwordHash,
            shareCreatedAt: new Date(createdAt),
          },
        }).catch(() => {});
      } else {
        await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            shareKey: guestSessionShareKey,
            sharePasswordHash: passwordHash,
            shareCreatedAt: new Date(createdAt),
          },
        }).catch(() => {});
      }
    } catch (e) {
      console.error('[verifyProjectShareGuestOtp] Error updating share key:', e);
    }

    return guestSessionShareKey;
  }

  private async getCompanyMail(): Promise<string> {
    const adminUser = await this.prisma.user.findFirst({
      where: { companyMail: { not: null } },
    });
    if (adminUser?.companyMail) return adminUser.companyMail;
    const firstUser = await this.prisma.user.findFirst();
    return firstUser?.companyMail || firstUser?.email || 'business@brightloop.local';
  }

  private isGuestEmail(email?: string | null): boolean {
    if (!email) return true;
    const lower = email.trim().toLowerCase();
    return lower.startsWith('guest_') || lower.includes('@guest.') || lower.includes('guest');
  }

  private async dispatchActionEmails(params: {
    workspaceId: string;
    projectId?: string;
    projectManagerId?: string | null;
    actorUserId?: string | null;
    clientEmail?: string | null;
    templateName: 'InternalDocumentApproved' | 'ProjectEdited' | 'ProjectDeleted' | 'DocumentCreated' | 'DocumentEdited' | 'DocumentDeleted' | 'ClientDocumentApproved' | 'ClientDocumentSigned';
    templateProps: any;
  }) {
    try {
      // 1. Company Mail (from /admin/company details)
      const companyMail = await this.getCompanyMail();

      // 2. Project Manager Mail (from project.projectManagerId)
      let pmEmail: string | null = null;
      let pmId = params.projectManagerId;
      if (!pmId && params.projectId) {
        const proj = await this.prisma.project.findUnique({ where: { id: params.projectId } });
        pmId = proj?.projectManagerId;
      }
      if (pmId) {
        const pmUser = await this.prisma.user.findUnique({ where: { id: pmId } });
        pmEmail = pmUser?.companyMail || pmUser?.email || null;
      }

      // 3. Doer Email (from actorUserId)
      let doerEmail: string | null = null;
      if (params.actorUserId) {
        const actorUser = await this.prisma.user.findUnique({ where: { id: params.actorUserId } });
        doerEmail = actorUser?.companyMail || actorUser?.email || null;
      }

      // 4. Client Email (from workspace profile / client & billing details)
      let clientEmail = params.clientEmail;
      if (!clientEmail && params.workspaceId) {
        clientEmail = await this.getClientEmailForWorkspace(params.workspaceId, params.actorUserId || '');
      }

      const renderer = (Renderers as any)[params.templateName];
      if (!renderer) return;

      const emailContent = await renderer(params.templateProps);

      if (params.templateName === 'InternalDocumentApproved') {
        // Internal approval: Send To PM, CC to Company
        const toEmail = pmEmail || companyMail;
        const ccEmails = Array.from(new Set([companyMail].filter(Boolean) as string[]));

        await this.mailSender.send(params.templateName, {
          to: toEmail,
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } else if (params.templateName === 'ClientDocumentApproved' || params.templateName === 'ClientDocumentSigned') {
        // Client approval: Send To Client, CC to Company & PM
        const toEmail = clientEmail || companyMail;
        const ccEmails = Array.from(new Set([companyMail, pmEmail].filter(Boolean) as string[]));

        await this.mailSender.send(params.templateName, {
          to: toEmail,
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } else {
        // Created / Edited / Deleted: Send To Doer (if not guest), CC to Company & PM
        const isDoerGuest = this.isGuestEmail(doerEmail);
        const ccList = Array.from(new Set([companyMail, pmEmail].filter(Boolean) as string[]));

        if (!isDoerGuest && doerEmail) {
          await this.mailSender.send(params.templateName, {
            to: doerEmail,
            cc: ccList.length > 0 ? ccList : undefined,
            subject: emailContent.subject,
            html: emailContent.html,
          });
        } else {
          // If doer is guest or missing, send To PM / Company with CC to remaining
          const toEmail = pmEmail || companyMail;
          await this.mailSender.send(params.templateName, {
            to: toEmail,
            cc: ccList.length > 0 ? ccList : undefined,
            subject: emailContent.subject,
            html: emailContent.html,
          });
        }
      }
    } catch (e) {
      console.error(`Failed to dispatch action emails for ${params.templateName}:`, e);
    }
  }
}


