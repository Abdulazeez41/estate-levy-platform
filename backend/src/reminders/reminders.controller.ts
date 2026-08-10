import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RemindersService } from './reminders.service';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHAIRMAN)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post('household/:householdId')
  remindHousehold(@Param('householdId') householdId: string, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.remindersService.remindHousehold(householdId, user.sub);
  }

  @Post('bulk-overdue')
  remindBulk(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.remindersService.remindAllOverdue(user.sub);
  }
}
