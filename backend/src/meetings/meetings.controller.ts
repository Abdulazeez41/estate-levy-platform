import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@ApiTags('Meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  list() {
    return this.meetingsService.listAll();
  }

  @Get('upcoming')
  getUpcoming() {
    return this.meetingsService.getUpcoming();
  }

  @Post()
  @Roles(Role.CHAIRMAN)
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.meetingsService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Role.CHAIRMAN)
  update(@Param('id') id: string, @Body() dto: UpdateMeetingDto, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.meetingsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(Role.CHAIRMAN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.meetingsService.remove(id, user.sub);
  }
}
