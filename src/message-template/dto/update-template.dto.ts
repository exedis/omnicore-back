import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTemplateDto {
  @IsString()
  messageTemplate?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
