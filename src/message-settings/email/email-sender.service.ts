import { Injectable, Logger } from '@nestjs/common';
import { EmailSettings } from './email-settings.entity';
import { EmailService } from './email.service';
import { MessageTemplate } from 'src/message-template/message-template.entity';
import { Webhook } from 'src/webhook/webhook.entity';

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  constructor(private emailService: EmailService) {}

  /**
   * Отправляет уведомление о webhook по email
   * Оптимизированная версия - получает все данные как параметры
   */
  async sendWebhookNotification(
    webhook: Webhook,
    settings: EmailSettings | null,
    template: MessageTemplate | null,
  ): Promise<void> {
    try {
      // Проверяем, включен ли Email для пользователя
      if (!settings?.isEnabled || !settings?.emailAddresses?.length) {
        this.logger.log(`Email отключен для пользователя ${webhook.user_id}`);
        return;
      }

      // Форматируем сообщение по шаблону или используем стандартное
      const messageText = template
        ? this.formatMessage(template.messageTemplate, webhook)
        : this.getDefaultMessage(webhook);

      // Формируем тему письма
      const subject = `Новая заявка с ${webhook.siteName || 'сайта'}`;

      // Отправляем email
      await this.emailService.sendEmail(
        settings.emailAddresses.join(','),
        subject,
        messageText,
        settings.smtpSettings,
      );

      this.logger.log(
        `Сообщение успешно отправлено по email для пользователя ${webhook.user_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Ошибка при отправке по email для пользователя ${webhook.user_id}: ${error.message}`,
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
