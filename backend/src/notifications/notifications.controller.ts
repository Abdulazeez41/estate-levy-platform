import { Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.notificationsService.listForUser(user.sub);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }

  @Patch(':id/archive')
  archive(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string) {
    return this.notificationsService.archive(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedRequestUser, @Param('id') id: string) {
    return this.notificationsService.remove(user.sub, id);
  }
}
