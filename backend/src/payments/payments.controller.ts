import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaystackInitDto } from './dto/paystack-init.dto';
import { PaystackVerifyDto } from './dto/paystack-verify.dto';
import { CurrentUser, type AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESIDENT)
  @Post('paystack/initialize')
  initializePaystack(@Body() dto: PaystackInitDto, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.paymentsService.initializePaystack(dto, user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESIDENT)
  @Post('paystack/verify')
  verifyPaystack(@Body() dto: PaystackVerifyDto, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.paymentsService.verifyPaystack(dto.reference, user.sub);
  }

  @Post('paystack/webhook')
  paystackWebhook(@Req() request: Request, @Headers('x-paystack-signature') signature?: string) {
    return this.paymentsService.processWebhook(request.body, signature, (request as Request & { rawBody?: Buffer }).rawBody);
  }

}
