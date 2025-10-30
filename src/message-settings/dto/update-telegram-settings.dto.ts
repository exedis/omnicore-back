import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTelegramSettingsDto {
  /**
   * Включить/отключить отправку email уведомлений
   */
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  /**
   * Шаблон сообщения
   */
  @IsOptional()
  @IsString()
  messageTemplate?: string;
}
