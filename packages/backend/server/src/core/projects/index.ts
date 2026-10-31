import { Module } from '@nestjs/common';
import { PermissionModule } from '../permission';
import { UserModule } from '../user';
import { MailModule } from '../mail';
import { ServerConfigModule } from '../config';
import { ProjectsResolver } from './resolver';
import { ProjectsService } from './service';
import { ProposalController } from './proposal.controller';
import { ProposalCopilotService } from './proposal-copilot.service';
import { CopilotGraphService } from './copilot-graph.service';
import { RecurringInvoiceCronJob } from './recurring-invoice.job';
import { OverdueInvoiceJob } from './overdue-invoice.job';

@Module({
  imports: [PermissionModule, UserModule, MailModule, ServerConfigModule],
  providers: [
    ProjectsResolver,
    ProjectsService,
    ProposalCopilotService,
    CopilotGraphService,
    RecurringInvoiceCronJob,
    OverdueInvoiceJob,
  ],
  controllers: [ProposalController],
  exports: [ProjectsService, CopilotGraphService],
})
export class ProjectsModule {}

