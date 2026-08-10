import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { HouseholdsService } from './households.service';

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
}
