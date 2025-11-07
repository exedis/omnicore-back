import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EmailSettings } from './email-settings.entity';
import { TemplateType } from '@type/settings';
import { MessageTemplateService } from 'src/message-template/message-template.service';

@Injectable()
export class EmailSettingsService {
  private readonly logger = new Logger(EmailSettingsService.name);

  constructor(
    @InjectRepository(EmailSettings)
    private emailSettingsRepository: Repository<EmailSettings>,
    private messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * Получает настройки email
   */
  async getEmailSettings(userId: string): Promise<EmailSettings | null> {
    return this.emailSettingsRepository.findOne({
      where: { user_id: userId },
    });
  }

  /**
   * Включает email
   */
  // async enableEmail(userId: string): Promise<void> {
  //   await this.upsertEmailSettings(userId, { isEnabled: true });
  // }

  // /**
  //  * Отключает email
  //  */
  // async disableEmail(userId: string): Promise<void> {
  //   await this.upsertEmailSettings(userId, { isEnabled: false });
  // }

  /**
   * Обновляет настройки email
   */
  async updateEmailSettings(
    userId: string,
    settings: {
      isEnabled?: boolean;
      emailAddresses?: string;
      isSmtpEnabled?: boolean;
      smtpHost?: string;
      smtpPort?: string;
      smtpUsername?: string;
      smtpPassword?: string;
      messageTemplate?: string;
    },
  ): Promise<void> {
    // Проверяем, заполнены ли SMTP настройки
    const hasSmtpSettings =
      settings.smtpHost || settings.smtpUsername || settings.smtpPassword;

    // Преобразуем данные в формат EmailSettings
    const emailSettings: any = {
      isEnabled: settings.isEnabled,
      isSmtpEnabled: settings.isSmtpEnabled ?? false,
      emailAddresses: settings.emailAddresses
        ? settings.emailAddresses.split(',').map((address) => address.trim())
        : [],
    };

    // Добавляем SMTP настройки только если SMTP включен и они указаны
    // Иначе оставляем null, чтобы использовать sendmail
    if (settings.isSmtpEnabled && hasSmtpSettings) {
      emailSettings.smtpSettings = {
        host: settings.smtpHost || '',
        port: parseInt(settings.smtpPort || '587'),
        secure: false,
        auth: {
          user: settings.smtpUsername || '',
          pass: settings.smtpPassword || '',
        },
      };
    } else {
      emailSettings.smtpSettings = null;
    }

    await this.upsertEmailSettings(userId, emailSettings);
    await this.messageTemplateService.updateTemplate(
      userId,
      settings.messageTemplate,
      TemplateType.EMAIL,
    );
  }

  /**
   * Создает или обновляет настройки email
   */
  private async upsertEmailSettings(
    userId: string,
    updateData: Partial<EmailSettings>,
  ): Promise<void> {
    const existing = await this.emailSettingsRepository.findOne({
      where: { user_id: userId },
    });

    if (existing) {
      await this.emailSettingsRepository.update(
        { user_id: userId },
        updateData,
      );
    } else {
      const newRecord = this.emailSettingsRepository.create({
        user_id: userId,
        isEnabled: false,
        ...updateData,
      });
      await this.emailSettingsRepository.save(newRecord);
    }
  }
}
