import { Module, forwardRef } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ChannelAdaptersService } from './channel-adapters.service';

@Module({
  imports: [forwardRef(() => JobsModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService, ChannelAdaptersService],
  exports: [NotificationsService, ChannelAdaptersService],
})
export class NotificationsModule {}
