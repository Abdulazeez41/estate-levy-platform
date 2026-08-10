import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('chairman')
  @Roles(Role.CHAIRMAN)
  getChairmanDashboard() {
    return this.dashboardService.getChairmanDashboard();
  }

  @Get('resident/:userId')
  @Roles(Role.RESIDENT)
  getResidentDashboard(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedRequestUser) {
    if (user.sub !== userId) throw new ForbiddenException('You can only access your own resident dashboard');
    return this.dashboardService.getResidentDashboard(userId);
  }
}
