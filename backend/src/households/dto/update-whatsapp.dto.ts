import { IsString, Matches } from 'class-validator';

export class UpdateWhatsAppDto {
  @IsString()
  @Matches(/^(?:\+234|0)[789][01]\d{8}$/, {
    message: 'Enter a valid Nigerian WhatsApp number, for example +2348031234567 or 08031234567.',
  })
  whatsappNumber!: string;
}
