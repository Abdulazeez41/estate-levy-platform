import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedRequestUser } from '../common/decorators/current-user.decorator';
import { ReceiptsService } from './receipts.service';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(':paymentId')
  getByPayment(@Param('paymentId') paymentId: string, @CurrentUser() user: AuthenticatedRequestUser) {
    return this.receiptsService.getReceiptByPaymentId(paymentId, user);
  }
}
