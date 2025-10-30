import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramSettings } from './telegram/telegram-settings.entity';
import { EmailSettings } from './email/email-settings.entity';
import { MessageTemplate } from '../message-template/message-template.entity';
import { TemplateType } from '@type/settings';

@Injectable()
export class MessageSettingsService {
  private readonly logger = new Logger(MessageSettingsService.name);

  constructor(
    @InjectRepository(TelegramSettings)
    private telegramSettings: Repository<TelegramSettings>,
    @InjectRepository(EmailSettings)
    private emailSettings: Repository<EmailSettings>,
    @InjectRepository(MessageTemplate)
    private messageTemplateRepository: Repository<MessageTemplate>,
  ) {}

  /**
   * Получает статус уведомлений пользователя
   */
  async getNotificationStatus(userId: string): Promise<{
    telegramSettings: {
      isEnabled: boolean;
      chatId: string | null;
    };
    emailSettings: {
      isEnabled: boolean;
      emailAddresses: string[];
      isSmtpEnabled: boolean;
      smtpSettings: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
    };
  }> {
    const telegramSettings = await this.telegramSettings.findOne({
      where: { user_id: userId },
      select: ['chatId', 'isEnabled'],
    });
    const emailSettings = await this.emailSettings.findOne({
      where: { user_id: userId },
      select: ['isEnabled', 'emailAddresses', 'isSmtpEnabled', 'smtpSettings'],
    });

    return {
      telegramSettings: {
        isEnabled: telegramSettings?.isEnabled,
        chatId: telegramSettings?.chatId,
      },
      emailSettings: {
        isEnabled: emailSettings?.isEnabled,
        emailAddresses: emailSettings?.emailAddresses,
        isSmtpEnabled: emailSettings?.isSmtpEnabled,
        smtpSettings: emailSettings?.smtpSettings,
      },
    };
  }

  /**
   * Загружает все настройки для отправки уведомлений параллельно
   * Оптимизировано для минимизации запросов к БД
   */
  async getAllSettingsForNotification(userId: string): Promise<{
    telegram: {
      settings: TelegramSettings | null;
      template: MessageTemplate | null;
    };
    email: {
      settings: EmailSettings | null;
      template: MessageTemplate | null;
    };
  }> {
    // Загружаем все данные параллельно одним Promise.all
    const [telegramSettings, emailSettings, telegramTemplate, emailTemplate] =
      await Promise.all([
        this.telegramSettings.findOne({
          where: { user_id: userId },
        }),
        this.emailSettings.findOne({
          where: { user_id: userId },
        }),
        this.messageTemplateRepository.findOne({
          where: { user_id: userId, type: TemplateType.TELEGRAM },
        }),
        this.messageTemplateRepository.findOne({
          where: { user_id: userId, type: TemplateType.EMAIL },
        }),
      ]);

    return {
      telegram: {
        settings: telegramSettings,
        template: telegramTemplate,
      },
      email: {
        settings: emailSettings,
        template: emailTemplate,
      },
    };
  }
}
