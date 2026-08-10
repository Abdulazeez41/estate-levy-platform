import { IsString } from 'class-validator';

export class PaystackVerifyDto {
  @IsString()
  reference!: string;
}
