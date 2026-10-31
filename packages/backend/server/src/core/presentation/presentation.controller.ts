import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { CurrentUser, Public, AuthService } from '../auth';
import { AiModelFallbackService } from '../config';
import { PresentationGateway } from './presentation.gateway';
import { PresentationService } from './presentation.service';
import type { CreateRoomInput } from './types';

@Controller('/api/presentation')
export class PresentationController {
  constructor(
    private readonly presentationService: PresentationService,
    private readonly presentationGateway: PresentationGateway,
    private readonly auth: AuthService,
    @Optional() private readonly fallbackService?: AiModelFallbackService
  ) {}

  @Post('/rooms')
  async createRoom(
    @CurrentUser() user: CurrentUser,
    @Body() input: CreateRoomInput
  ) {
    return this.presentationService.createRoom(user.id, input);
  }

  @Get('/rooms')
  async listRooms(
    @CurrentUser() user: CurrentUser,
    @Query('workspaceId') workspaceId: string
  ) {
    return this.presentationService.listRooms(workspaceId, user.id);
  }

  @Public()
  @Get('/rooms/:id')
  async getRoom(@Param('id') id: string) {
    const room = await this.presentationService.getRoom(id);
    const activeMembersCount = this.presentationGateway.getMemberCount(id);
    return {
      ...room,
      activeMembersCount,
    };
  }

  @Public()
  @Get('/rooms/token/:token')
  async getRoomByToken(@Param('token') token: string) {
    const room = await this.presentationService.getRoomByToken(token);
    const activeMembersCount = this.presentationGateway.getMemberCount(room.id);
    return {
      ...room,
      activeMembersCount,
    };
  }

  @Post('/rooms/:id/end')
  async endRoom(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    const room = await this.presentationService.endRoom(id, user.id);
    await this.presentationGateway.broadcastRoomEnded(id);
    return room;
  }

  @Public()
  @Post('/rooms/join-guest')
  async joinGuest(
    @Req() req: Request,
    @Res() res: Response,
    @Body() input: { inviteToken: string; name: string }
  ) {
    const session = await this.auth.getUserSessionFromRequest(req, res);
    const existingUserId = session?.user?.id;
    const user = await this.presentationService.joinGuest(
      input.inviteToken,
      input.name,
      existingUserId
    );
    await this.auth.setCookies(req, res, user.id);
    res.status(200).send({ id: user.id, name: user.name });
  }

  @Public()
  @Get('/agora-rtc-token')
  async getAgoraRtcToken(
    @Query('channelName') channelName: string,
    @Query('uid') uid: string
  ) {
    const parsedUid = Number(uid) || 0;
    return this.presentationService.getAgoraRtcToken(
      channelName || '',
      parsedUid
    );
  }

  @Public()
  @Get('/gemini/models')
  async listGeminiModels(
    @Query('workspaceId') workspaceId?: string,
    @Query('apiKey') apiKey?: string
  ) {
    return this.presentationService.listGeminiModels(workspaceId, apiKey);
  }

  @Public()
  @Get('/gemini/fallback-info')
  async getFallbackInfo(@Query('feature') feature?: string) {
    if (!this.fallbackService) {
      return {
        intelligentFallbackEnabled: true,
        priorityModels: [],
        workedLogs: [],
        stats: {},
      };
    }
    return this.fallbackService.getFallbackInfo(feature);
  }

  @Public()
  @Post('/gemini/sync-models')
  async syncGeminiModels(
    @CurrentUser() user?: CurrentUser,
    @Body() body?: { apiKey?: string }
  ) {
    const userId = user?.id || 'admin';
    if (this.fallbackService) {
      return await this.fallbackService.syncAvailableTextModels(userId, body?.apiKey);
    }
    return [];
  }

  @Post('/gemini/chat')
  async geminiChat(
    @CurrentUser() _user: any,
    @Body() input: { workspaceId: string; prompt: string }
  ) {
    return this.presentationService.geminiChat(input.workspaceId, input.prompt);
  }

  @Public()
  @Post('/translate')
  async translateSpeech(
    @Body()
    input: {
      text: string;
      targetLang: string;
      sourceLang?: string;
      workspaceId?: string;
    }
  ) {
    return this.presentationService.translateSpeech(
      input.text,
      input.targetLang,
      input.sourceLang,
      input.workspaceId
    );
  }

  @Delete('/rooms/:id')
  async deleteRoom(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    await this.presentationService.deleteRoom(id, user.id);
    return { success: true };
  }

  @Get('/workspace-members')
  async getWorkspaceMembers(@Query('workspaceId') workspaceId: string) {
    return this.presentationService.getWorkspaceMembers(workspaceId);
  }

  @Post('/rooms/invite')
  async sendRoomInvitations(
    @CurrentUser() user: CurrentUser,
    @Body()
    input: {
      workspaceId: string;
      inviteToken: string;
      docId?: string;
      emails: string[];
      note?: string;
    }
  ) {
    return this.presentationService.sendRoomInvitations(user.id, input);
  }

  @Post('/rooms/:id/update')
  async updateRoom(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() input: any
  ) {
    return this.presentationService.updateRoom(user.id, id, input);
  }

  @Post('/rooms/:id/cancel')
  async cancelRoom(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() input: any
  ) {
    const room = await this.presentationService.cancelRoom(user.id, id, input);
    await this.presentationGateway.broadcastRoomEnded(id);
    return room;
  }

  @Get('/admin/cleanup-stats')
  async getCleanupStats() {
    return this.presentationService.getMeetingCleanupStats();
  }

  @Post('/admin/delete-cloned-pages')
  async deleteClonedPages() {
    return this.presentationService.deleteEndedMeetingClonedPages();
  }

  @Post('/admin/delete-containers')
  async deleteContainers() {
    return this.presentationService.deleteEndedMeetingContainers();
  }

  @Post('/admin/clear-temp-accounts')
  async clearTempAccounts() {
    return this.presentationService.clearTempGuestAccounts();
  }

  @Delete('/admin/container/:id')
  async deleteSingleContainer(@Param('id') containerId: string) {
    return this.presentationService.deleteSingleContainer(containerId);
  }
}
