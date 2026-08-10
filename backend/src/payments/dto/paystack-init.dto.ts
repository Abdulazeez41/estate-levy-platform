import { IsString } from 'class-validator';

export class PaystackInitDto {
  @IsString()
  residentId!: string;

  @IsString()
  levyId!: string;
}
