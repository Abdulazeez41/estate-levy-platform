import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { ChannelAdaptersService } from '../notifications/channel-adapters.service';

@Injectable()
export class NotificationWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly channelAdapters: ChannelAdaptersService) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;
    new Worker(
      'notification-delivery',
      async (job) => {
        const result = await this.channelAdapters.deliver(job.data.channel, job.data);
        this.logger.log(`Notification ${job.id} delivered via ${job.data.channel}: ${result.delivered}`);
      },
      { connection: { url: redisUrl } },
    );
  }
}
