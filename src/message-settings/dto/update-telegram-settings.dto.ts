import { IsOptional, IsObject, IsString } from 'class-validator';

export class UpdateTelegramSettingsDto {
  @IsOptional()
  @IsString()
  chatId?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
