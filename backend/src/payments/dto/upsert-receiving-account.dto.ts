import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertReceivingAccountDto {
  @IsString()
  @MinLength(2)
  bankName!: string;

  @IsString()
  @MinLength(2)
  accountName!: string;

  @IsString()
  @MinLength(6)
  accountNumber!: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
