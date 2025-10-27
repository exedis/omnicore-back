import { Injectable, Logger } from '@nestjs/common';
import { TelegramSettings } from './telegram-settings.entity';
import { TelegramBotService } from '../../telegram-bot/telegram-bot.service';
import { Webhook } from 'src/webhook/webhook.entity';
import { MessageTemplate } from 'src/message-template/message-template.entity';

@Injectable()
export class TelegramSenderService {
  private readonly logger = new Logger(TelegramSenderService.name);

  constructor(private telegramBotService: TelegramBotService) {}

  /**
   * Отправляет уведомление о webhook в Telegram
   * Оптимизированная версия - получает все данные как параметры
   */
  async sendWebhookNotification(
    webhook: Webhook,
    settings: TelegramSettings | null,
    template: MessageTemplate | null,
  ): Promise<void> {
    try {
      // Проверяем, включен ли Telegram для пользователя
      if (!settings?.isEnabled || !settings?.chatId) {
        this.logger.log(
          `Telegram отключен для пользователя ${webhook.user_id}`,
        );
        return;
      }

      // Форматируем сообщение по шаблону или используем стандартное
      const messageText = template
        ? this.formatMessage(template.messageTemplate, webhook)
        : this.getDefaultMessage(webhook);

      // Отправляем сообщение
      await this.telegramBotService.sendPersonalizedMessage(
        webhook.user_id,
        messageText,
      );

      this.logger.log(
        `Сообщение успешно отправлено в Telegram для пользователя ${webhook.user_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Ошибка при отправке в Telegram для пользователя ${webhook.user_id}: ${error.message}`,
      );
      // Не пробрасываем ошибку дальше, чтобы не прерывать обработку webhook
    }
  }

  /**
   * Форматирует сообщение по шаблону
   */
  private formatMessage(template: string, webhook: Webhook): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const cleanKey = key.trim();
      const keys = cleanKey.split('.');

      let value: any = webhook;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return match; // Возвращаем оригинальный placeholder если ключ не найден
        }
      }

      // Если значение null, undefined или объект - возвращаем пустую строку
      if (
        value === null ||
        value === undefined ||
        (typeof value === 'object' && !Array.isArray(value))
      ) {
        return '';
      }

      return String(value);
    });
  }

  /**
   * Возвращает стандартное сообщение (fallback)
   */
  private getDefaultMessage(webhook: Webhook): string {
    let message = `📨 Новое сообщение с сайта "${webhook.siteName}"\n`;
    message += `📋 Форма: ${webhook.formName}\n`;
    message += `🕐 Время: ${webhook.createdAt.toLocaleString('ru-RU')}\n\n`;

    if (webhook.data && Object.keys(webhook.data).length > 0) {
      message += `📝 Данные формы:\n`;
      Object.entries(webhook.data).forEach(([key, value]) => {
        message += `• ${key}: ${value}\n`;
      });
      message += `\n`;
    }

    if (
      webhook.advertisingParams &&
      Object.keys(webhook.advertisingParams).length > 0
    ) {
      message += `📊 Рекламные параметры:\n`;
      Object.entries(webhook.advertisingParams).forEach(([key, value]) => {
        message += `• ${key}: ${value}\n`;
      });
    }

    return message;
  }
}
