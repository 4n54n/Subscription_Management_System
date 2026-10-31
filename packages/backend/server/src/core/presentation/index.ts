import { Module } from '@nestjs/common';

import './config';
import { AuthModule } from '../auth';
import { ServerConfigModule } from '../config';
import { MailModule } from '../mail';
import { GeminiProxyService } from './gemini.service';
import { PresentationController } from './presentation.controller';
import { PresentationGateway } from './presentation.gateway';
import { PresentationService } from './presentation.service';
import { GuestPresentationGuard } from './guest-presentation.guard';
import { CalendarInvitationService } from './calendar-invitation.service';

@Module({
  imports: [AuthModule, ServerConfigModule, MailModule],
  providers: [
    PresentationService,
    PresentationGateway,
    GeminiProxyService,
    GuestPresentationGuard,
    CalendarInvitationService,
  ],
  controllers: [PresentationController],
  exports: [PresentationService, PresentationGateway, GuestPresentationGuard, CalendarInvitationService],
})
export class PresentationModule {}

export { PresentationService, PresentationGateway, GuestPresentationGuard, CalendarInvitationService };

