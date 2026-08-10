import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

class MeetingAttachmentInputDto {
  @IsString()
  fileUrl!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @Type(() => Number)
  size!: number;
}

export class CreateMeetingDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(3)
  venue!: string;

  @IsDateString()
  meetingDate!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MeetingAttachmentInputDto)
  attachments?: MeetingAttachmentInputDto[];
}
