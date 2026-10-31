import { Service } from '@toeverything/infra';
import { FetchService } from '../../cloud';
import type { CreateRoomInput, PresentationRoom } from '../types';

export class PresentationService extends Service {
  constructor(private readonly fetchService: FetchService) {
    super();
  }

  async createRoom(input: CreateRoomInput): Promise<PresentationRoom> {
    const res = await this.fetchService.fetch('/api/presentation/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  }

  async listRooms(workspaceId: string): Promise<PresentationRoom[]> {
    const res = await this.fetchService.fetch(
      `/api/presentation/rooms?workspaceId=${encodeURIComponent(workspaceId)}`
    );
    return res.json();
  }

  async getRoom(roomId: string): Promise<PresentationRoom> {
    const res = await this.fetchService.fetch(
      `/api/presentation/rooms/${roomId}`
    );
    return res.json();
  }

  async getRoomByToken(inviteToken: string): Promise<PresentationRoom> {
    const res = await this.fetchService.fetch(
      `/api/presentation/rooms/token/${inviteToken}`
    );
    return res.json();
  }

  async endRoom(roomId: string): Promise<PresentationRoom> {
    const res = await this.fetchService.fetch(
      `/api/presentation/rooms/${roomId}/end`,
      {
        method: 'POST',
      }
    );
    return res.json();
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.fetchService.fetch(`/api/presentation/rooms/${roomId}`, {
      method: 'DELETE',
    });
  }

  async sendRoomInvitations(input: {
    workspaceId: string;
    inviteToken: string;
    docId?: string;
    emails: string[];
    note?: string;
  }): Promise<{ success: boolean; sentCount: number }> {
    const res = await this.fetchService.fetch('/api/presentation/rooms/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  }

  async updateRoom(roomId: string, input: any): Promise<PresentationRoom> {
    const res = await this.fetchService.fetch(`/api/presentation/rooms/${roomId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  }

  async cancelRoom(roomId: string, input: { workspaceId?: string; inviteToken?: string; docId?: string; emails?: string[]; note?: string }): Promise<PresentationRoom> {
    const res = await this.fetchService.fetch(`/api/presentation/rooms/${roomId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json();
  }
}
