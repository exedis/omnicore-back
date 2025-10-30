import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateEmailSettingsDto {
  /**
   * Включить/отключить отправку email уведомлений
   */
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  /**
   * Адреса email для получения уведомлений (через запятую)
   */
  @IsOptional()
  @IsString()
  emailAddresses?: string;

  /**
   * Использовать SMTP для отправки (true) или sendmail/локальный MTA (false)
   * Если false - используется sendmail (аналог PHP mail())
   */
  @IsOptional()
  @IsBoolean()
  isSmtpEnabled?: boolean;

  /**
   * SMTP хост (например, smtp.gmail.com)
   * Используется только если isSmtpEnabled = true
   */
  @IsOptional()
  @IsString()
  smtpHost?: string;

  /**
   * SMTP порт (обычно 587 для TLS или 465 для SSL)
   * Используется только если isSmtpEnabled = true
   */
  @IsOptional()
  @IsString()
  smtpPort?: string;

  /**
   * SMTP username (обычно email адрес)
   * Используется только если isSmtpEnabled = true
   */
  @IsOptional()
  @IsString()
  smtpUsername?: string;

  /**
   * SMTP пароль (для Gmail используйте App Password)
   * Используется только если isSmtpEnabled = true
   */
  @IsOptional()
  @IsString()
  smtpPassword?: string;

  /**
   * Шаблон сообщения
   */
  @IsOptional()
  @IsString()
  messageTemplate?: string;
}
