import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BrightloopService } from './brightloop.service';

@Injectable()
export class BrightloopBillingJob {
  private readonly logger = new Logger(BrightloopBillingJob.name);

  constructor(private readonly service: BrightloopService) {}

  /**
   * Run recurring billing engine every hour (and every minute in dev if due).
   * Generates invoices for due subscriptions without duplicates or missed cycles.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleRecurringBilling() {
    try {
      const generated = await this.service.generateDueInvoices();
      if (generated.length > 0) {
        this.logger.log(`[Recurring Billing Engine] Generated ${generated.length} automated recurring invoices.`);
      }
    } catch (err) {
      this.logger.error('[Recurring Billing Engine] Error processing recurring billing:', err);
    }
  }

  /**
   * Scan for and flag overdue invoices every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleOverdueInvoices() {
    try {
      const updated = await this.service.checkOverdueInvoices();
      if (updated.count > 0) {
        this.logger.log(`[Overdue Invoices Job] Flagged ${updated.count} invoices as OVERDUE.`);
      }
    } catch (err) {
      this.logger.error('[Overdue Invoices Job] Error scanning overdue invoices:', err);
    }
  }
}

