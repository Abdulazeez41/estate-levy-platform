import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { HouseholdsService } from './households.service';
import { FreshOtpGuard } from '../common/guards/fresh-otp.guard';
import { CurrentUser, type AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';
import { UpdateWhatsAppDto } from './dto/update-whatsapp.dto';

@ApiTags('Households')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHAIRMAN)
@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Get()
  list(@Query('query') query?: string, @Query('filter') filter?: string) {
    return this.householdsService.findAll(query, filter);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.householdsService.findOne(id);
  }

  @Patch(':id/whatsapp')
  @UseGuards(FreshOtpGuard)
  updateWhatsApp(@Param('id') id: string, @Body() dto: UpdateWhatsAppDto, @CurrentUser() chairman: AuthenticatedRequestUser) {
    return this.householdsService.updateWhatsApp(id, dto.whatsappNumber, chairman.sub);
  }

  @Delete(':id/whatsapp')
  @UseGuards(FreshOtpGuard)
  deleteWhatsApp(@Param('id') id: string, @CurrentUser() chairman: AuthenticatedRequestUser) {
    return this.householdsService.deleteWhatsApp(id, chairman.sub);
  }
}
