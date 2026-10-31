import {
  Args,
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { Admin } from '../common';
import { PhishService } from './phish.service';

@ObjectType()
export class PhishCredentialsType {
  @Field()
  enabled!: boolean;

  @Field()
  tenantId!: string;

  @Field()
  clientId!: string;

  @Field()
  clientSecret!: string;

  @Field({ nullable: true })
  lastErrorMsg?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastErrorAt?: Date;
}

@ObjectType()
export class PhishUserType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field({ nullable: true })
  avatarUrl?: string;
}

@ObjectType()
export class PhishMonitoredUserType {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field()
  email!: string;

  @Field()
  status!: string;

  @Field({ nullable: true })
  msUserId?: string;

  @Field({ nullable: true })
  msMailboxStatus?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastCheckedAt?: Date;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => PhishUserType)
  user!: PhishUserType;

  @Field(() => Int)
  totalReceivedMails!: number;

  @Field(() => Int)
  emailsCount!: number;

  @Field(() => Int)
  incidentsCount!: number;
}

@ObjectType()
export class PhishIncidentType {
  @Field(() => ID)
  id!: string;

  @Field()
  emailQueueId!: string;

  @Field()
  monitoredUserId!: string;

  @Field()
  riskLevel!: string;

  @Field(() => Int)
  riskScore!: number;

  @Field()
  summary!: string;

  @Field(() => [String])
  indicators!: string[];

  @Field()
  alertSent!: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}

@ObjectType()
export class PhishEmailQueueType {
  @Field(() => ID)
  id!: string;

  @Field()
  monitoredUserId!: string;

  @Field({ nullable: true })
  messageId?: string;

  @Field()
  sender!: string;

  @Field()
  recipient!: string;

  @Field()
  subject!: string;

  @Field({ nullable: true })
  bodySnippet?: string;

  @Field(() => [String])
  attachmentNames!: string[];

  @Field()
  status!: string;

  @Field(() => Int)
  retryCount!: number;

  @Field({ nullable: true })
  errorMessage?: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => PhishIncidentType, { nullable: true })
  incident?: PhishIncidentType;
}

@Admin()
@Resolver()
export class PhishResolver {
  constructor(private readonly phishService: PhishService) {}

  @Query(() => PhishCredentialsType)
  async phishCredentials() {
    return this.phishService.getCredentials();
  }

  @Query(() => [PhishMonitoredUserType])
  async phishMonitoredUsers() {
    const list = await this.phishService.getMonitoredUsers();
    return list.map(item => ({
      id: item.id,
      userId: item.userId,
      email: item.email,
      status: item.status,
      msUserId: item.msUserId || undefined,
      msMailboxStatus: item.msMailboxStatus || undefined,
      lastCheckedAt: item.lastCheckedAt || undefined,
      createdAt: item.createdAt,
      user: {
        id: item.user.id,
        name: item.user.name,
        email: item.user.email,
        avatarUrl: item.user.avatarUrl || undefined,
      },
      totalReceivedMails: (item as any).totalReceivedMails || 0,
      emailsCount: item._count?.emails || 0,
      incidentsCount: item._count?.incidents || 0,
    }));
  }

  @Query(() => [PhishEmailQueueType])
  async phishUserInspectionQueue(@Args('userId') userId: string) {
    const list = await this.phishService.getUserInspectionQueue(userId);
    return list.map(item => ({
      id: item.id,
      monitoredUserId: item.monitoredUserId,
      messageId: item.messageId || undefined,
      sender: item.sender,
      recipient: item.recipient,
      subject: item.subject,
      bodySnippet: item.bodySnippet || undefined,
      attachmentNames: item.attachmentNames || [],
      status: item.status,
      retryCount: item.retryCount,
      errorMessage: item.errorMessage || undefined,
      createdAt: item.createdAt,
      incident: item.incident ? {
        id: item.incident.id,
        emailQueueId: item.incident.emailQueueId,
        monitoredUserId: item.incident.monitoredUserId,
        riskLevel: item.incident.riskLevel,
        riskScore: item.incident.riskScore,
        summary: item.incident.summary,
        indicators: item.incident.indicators || [],
        alertSent: item.incident.alertSent,
        createdAt: item.incident.createdAt,
      } : undefined,
    }));
  }

  @Query(() => [PhishEmailQueueType])
  async phishAllInspectionQueue() {
    const list = await this.phishService.getAllInspectionQueue();
    return list.map(item => ({
      id: item.id,
      monitoredUserId: item.monitoredUserId,
      messageId: item.messageId || undefined,
      sender: item.sender,
      recipient: item.recipient,
      subject: item.subject,
      bodySnippet: item.bodySnippet || undefined,
      attachmentNames: item.attachmentNames || [],
      status: item.status,
      retryCount: item.retryCount,
      errorMessage: item.errorMessage || undefined,
      createdAt: item.createdAt,
      incident: item.incident ? {
        id: item.incident.id,
        emailQueueId: item.incident.emailQueueId,
        monitoredUserId: item.incident.monitoredUserId,
        riskLevel: item.incident.riskLevel,
        riskScore: item.incident.riskScore,
        summary: item.incident.summary,
        indicators: item.incident.indicators || [],
        alertSent: item.incident.alertSent,
        createdAt: item.incident.createdAt,
      } : undefined,
    }));
  }

  @Query(() => [PhishIncidentType])
  async phishIncidents() {
    const list = await this.phishService.getIncidents();
    return list.map(item => ({
      id: item.id,
      emailQueueId: item.emailQueueId,
      monitoredUserId: item.monitoredUserId,
      riskLevel: item.riskLevel,
      riskScore: item.riskScore,
      summary: item.summary,
      indicators: item.indicators || [],
      alertSent: item.alertSent,
      createdAt: item.createdAt,
    }));
  }

  @Mutation(() => PhishMonitoredUserType)
  async fetchUserMicrosoftMailbox(@Args('userId') userId: string) {
    const user = await this.phishService.getUserById(userId);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const record = await this.phishService.checkAndAddUserToMonitoring(user.id, user.email);

    return {
      id: record.id,
      userId: record.userId,
      email: record.email,
      status: record.status,
      msUserId: record.msUserId || undefined,
      msMailboxStatus: record.msMailboxStatus || undefined,
      lastCheckedAt: record.lastCheckedAt || undefined,
      createdAt: record.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || undefined,
      },
      totalReceivedMails: (record as any).totalReceivedMails || 0,
      emailsCount: 0,
      incidentsCount: 0,
    };
  }

  @Mutation(() => Boolean)
  async removeUserFromPhishMonitoring(@Args('userId') userId: string) {
    return this.phishService.removeUserFromMonitoring(userId);
  }

  @Mutation(() => PhishEmailQueueType)
  async ingestEmailForPhishCheck(
    @Args('userEmail') userEmail: string,
    @Args('sender') sender: string,
    @Args('subject') subject: string,
    @Args('bodySnippet', { nullable: true }) bodySnippet?: string,
    @Args('attachmentNames', { type: () => [String], nullable: true }) attachmentNames?: string[]
  ) {
    const res = await this.phishService.ingestEmail({
      userEmail,
      sender,
      recipient: userEmail,
      subject,
      bodySnippet,
      attachmentNames: attachmentNames || [],
    });

    return {
      id: res.queueItem.id,
      monitoredUserId: res.queueItem.monitoredUserId,
      messageId: res.queueItem.messageId || undefined,
      sender: res.queueItem.sender,
      recipient: res.queueItem.recipient,
      subject: res.queueItem.subject,
      bodySnippet: res.queueItem.bodySnippet || undefined,
      attachmentNames: res.queueItem.attachmentNames || [],
      status: res.queueItem.status,
      retryCount: res.queueItem.retryCount,
      errorMessage: res.queueItem.errorMessage || undefined,
      createdAt: res.queueItem.createdAt,
      incident: res.incident ? {
        id: res.incident.id,
        emailQueueId: res.incident.emailQueueId,
        monitoredUserId: res.incident.monitoredUserId,
        riskLevel: res.incident.riskLevel,
        riskScore: res.incident.riskScore,
        summary: res.incident.summary,
        indicators: res.incident.indicators || [],
        alertSent: res.incident.alertSent,
        createdAt: res.incident.createdAt,
      } : undefined,
    };
  }
}
