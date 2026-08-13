import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RemindersService } from './reminders.service';

@Injectable()
export class ReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private interval?: NodeJS.Timeout;
  private initialRun?: NodeJS.Timeout;

  constructor(private readonly remindersService: RemindersService) {}

  onModuleInit() {
    if (process.env.REMINDER_SCHEDULER_ENABLED === 'false') return;
    const intervalMs = Math.max(60000, Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS ?? 3600000));
    this.initialRun = setTimeout(() => void this.run(), 10000);
    this.initialRun.unref();
    this.interval = setInterval(() => void this.run(), intervalMs);
    this.interval.unref();
  }

  onModuleDestroy() {
    if (this.initialRun) clearTimeout(this.initialRun);
    if (this.interval) clearInterval(this.interval);
  }

  private async run() {
    try {
      const result = await this.remindersService.processScheduledReminders();
      this.logger.log(`Scheduled reminders processed: ${result.dueSent} due, ${result.overdueSent} overdue`);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Scheduled reminder processing failed');
    }
  }
}
