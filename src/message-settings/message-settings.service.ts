import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramSettings } from './telegram/telegram-settings.entity';
import { EmailSettings } from './email/email-settings.entity';
import {
  MessageTemplate,
  TemplateType,
} from '../message-template/message-template.entity';

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
    };
  }> {
    const telegramSettings = await this.telegramSettings.findOne({
      where: { user_id: userId },
      select: ['chatId', 'isEnabled'],
    });
    const emailSettings = await this.emailSettings.findOne({
      where: { user_id: userId },
      select: ['isEnabled', 'emailAddresses'],
    });

    console.log('settings', userId, telegramSettings);
    console.log('emailSettings', userId, emailSettings);

    return {
      telegramSettings: {
        isEnabled: telegramSettings?.isEnabled,
        chatId: telegramSettings?.chatId,
      },
      emailSettings: {
        isEnabled: emailSettings?.isEnabled,
        emailAddresses: emailSettings?.emailAddresses,
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
