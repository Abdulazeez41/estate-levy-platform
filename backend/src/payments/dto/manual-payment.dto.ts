import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class ManualPaymentDto {
  @IsString()
  residentId!: string;

  @IsString()
  levyId!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsDateString()
  transferDate!: string;

  @IsString()
  reference!: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
