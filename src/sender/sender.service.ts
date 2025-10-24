import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../webhook/webhook.entity';
import { User } from '../user/user.entity';
import { SocialMessage, MessageStatus } from '../social/social-message.entity';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { SocialService } from '../social/social.service';
import { MessageTemplateService } from '../message-template/message-template.service';
import { TemplateType } from '../message-template/message-template.entity';

@Injectable()
export class SenderService {
  private readonly logger = new Logger(SenderService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private telegramBotService: TelegramBotService,
    private socialService: SocialService,
    private messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * Обрабатывает сообщение из webhook и отправляет его в Telegram
   * @param webhookId - ID webhook сообщения
   * @param userId - ID пользователя
   */
  async processWebhookMessage(
    webhookId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(
      `Обработка webhook сообщения ${webhookId} для пользователя ${userId}`,
    );

    try {
      // 1. Получаем webhook сообщение
      const webhook = await this.webhookRepository.findOne({
        where: { id: webhookId, user_id: userId },
      });

      if (!webhook) {
        throw new NotFoundException('Webhook сообщение не найдено');
      }

      // 2. Проверяем настройки пользователя для Telegram
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['isTelegramEnabled', 'telegramChatId'],
      });

      if (!user?.isTelegramEnabled || !user?.telegramChatId) {
        this.logger.warn(
          `Пользователь ${userId} не настроил Telegram или отключил уведомления`,
        );
        return;
      }

      // 3. Проверяем, авторизован ли пользователь в Telegram боте
      const isAuthorized =
        await this.telegramBotService.isUserAuthorizedInTelegram(userId);
      if (!isAuthorized) {
        this.logger.warn(
          `Пользователь ${userId} не авторизован в Telegram боте`,
        );
        return;
      }

      // 4. Формируем сообщение для отправки используя шаблон
      const messageText = await this.messageTemplateService.formatMessage(
        userId,
        TemplateType.TELEGRAM,
        webhook,
      );

      // 5. Создаем запись о социальном сообщении через SocialService
      const socialMessage = await this.socialService.createSocialMessage(
        userId,
        webhookId,
        messageText,
        {
          siteName: webhook.siteName,
          formName: webhook.formName,
          webhookData: webhook.data,
          advertisingParams: webhook.advertisingParams,
        },
      );

      // 6. Отправляем сообщение в Telegram
      try {
        await this.telegramBotService.sendPersonalizedMessage(
          userId,
          messageText,
        );

        // 7. Обновляем статус сообщения на доставленное в Telegram
        await this.socialService.updateMessageStatus(
          socialMessage.id,
          MessageStatus.TELEGRAM_DELIVERED,
          undefined, // externalMessageId будет добавлен позже если нужно
        );

        this.logger.log(
          `Сообщение успешно доставлено в Telegram для пользователя ${userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Ошибка при отправке сообщения в Telegram: ${error.message}`,
        );

        // Обновляем статус сообщения на неудачное
        await this.socialService.updateMessageStatus(
          socialMessage.id,
          MessageStatus.FAILED,
          undefined,
          error.message,
        );
      }
    } catch (error) {
      this.logger.error(
        `Ошибка при обработке webhook сообщения: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Получает статистику отправленных сообщений для пользователя
   */
  async getMessageStats(userId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    telegramDelivered: number;
  }> {
    return this.socialService.getMessageStats(userId);
  }

  /**
   * Получает историю отправленных сообщений для пользователя
   */
  async getMessageHistory(
    userId: string,
    limit = 50,
  ): Promise<SocialMessage[]> {
    return this.socialService.getMessageHistory(userId, limit);
  }

  /**
   * Получает настройки Telegram пользователя
   */
  async getTelegramSettings(userId: string) {
    return this.socialService.getTelegramSettings(userId);
  }

  /**
   * Обновляет настройки Telegram пользователя
   */
  async updateTelegramSettings(
    userId: string,
    settings: {
      enabled?: boolean;
      chatId?: string;
      username?: string;
      additionalSettings?: Record<string, any>;
    },
  ) {
    return this.socialService.updateTelegramSettings(userId, settings);
  }
}
