import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateLevyDto } from './dto/create-levy.dto';
import { LeviesService } from './levies.service';
import { FreshOtpGuard } from '../common/guards/fresh-otp.guard';

@ApiTags('Levies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHAIRMAN)
@Controller('levies')
export class LeviesController {
  constructor(private readonly leviesService: LeviesService) {}

  @Get()
  list() {
    return this.leviesService.list();
  }

  @Post()
  @UseGuards(FreshOtpGuard)
  create(@Body() dto: CreateLevyDto, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.leviesService.create(dto, user.sub);
  }

  @Post(':id/sync-invoices')
  @UseGuards(FreshOtpGuard)
  syncInvoices(@Param('id') id: string, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.leviesService.syncInvoices(id, user.sub);
  }
}
