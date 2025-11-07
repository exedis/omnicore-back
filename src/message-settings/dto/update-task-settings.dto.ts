import { IsString } from 'class-validator';

export class UpdateTaskSettingsDto {
  /**
   * Шаблон сообщения
   */
  @IsString()
  messageTemplate?: string;
}
