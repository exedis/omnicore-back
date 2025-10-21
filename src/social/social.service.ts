import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialMessage, MessageStatus } from './social-message.entity';
import { Webhook } from '../webhook/webhook.entity';
import { User } from '../user/user.entity';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    @InjectRepository(SocialMessage)
    private socialMessageRepository: Repository<SocialMessage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Создает запись о социальном сообщении для webhook
   */
  async createSocialMessage(
    userId: string,
    webhookId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<SocialMessage> {
    const socialMessage = this.socialMessageRepository.create({
      user_id: userId,
      webhook_id: webhookId,
      status: MessageStatus.PENDING,
      content,
      metadata,
    });

    return this.socialMessageRepository.save(socialMessage);
  }

  /**
   * Обновляет статус сообщения
   */
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    externalMessageId?: string,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: Partial<SocialMessage> = {
      status,
    };

    if (
      status === MessageStatus.SENT ||
      status === MessageStatus.TELEGRAM_DELIVERED
    ) {
      updateData.sentAt = new Date();
    }

    if (status === MessageStatus.TELEGRAM_DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    if (externalMessageId) {
      updateData.externalMessageId = externalMessageId;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.socialMessageRepository.update(messageId, updateData);
  }

  /**
   * Получает сообщение по ID
   */
  async getMessageById(messageId: string): Promise<SocialMessage> {
    const message = await this.socialMessageRepository.findOne({
      where: { id: messageId },
      relations: ['user', 'webhook'],
    });

    if (!message) {
      throw new NotFoundException('Сообщение не найдено');
    }

    return message;
  }

  /**
   * Получает сообщения по webhook ID
   */
  async getMessagesByWebhook(webhookId: string): Promise<SocialMessage[]> {
    return this.socialMessageRepository.find({
      where: { webhook_id: webhookId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получает историю сообщений пользователя
   */
  async getMessageHistory(
    userId: string,
    limit: number = 50,
  ): Promise<SocialMessage[]> {
    return this.socialMessageRepository.find({
      where: { user_id: userId },
      relations: ['webhook'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Получает статистику сообщений пользователя
   */
  async getMessageStats(userId: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    telegramDelivered: number;
  }> {
    const stats = await this.socialMessageRepository
      .createQueryBuilder('message')
      .select('message.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('message.user_id = :userId', { userId })
      .groupBy('message.status')
      .getRawMany();

    const result = {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      telegramDelivered: 0,
    };

    stats.forEach((stat) => {
      const count = parseInt(stat.count);
      result.total += count;

      switch (stat.status) {
        case MessageStatus.PENDING:
          result.pending = count;
          break;
        case MessageStatus.SENT:
          result.sent = count;
          break;
        case MessageStatus.FAILED:
          result.failed = count;
          break;
        case MessageStatus.TELEGRAM_DELIVERED:
          result.telegramDelivered = count;
          break;
      }
    });

    return result;
  }

  /**
   * Проверяет, включена ли пересылка в Telegram для пользователя
   */
  async isTelegramEnabled(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['isTelegramEnabled', 'telegramChatId'],
    });

    return !!(user?.isTelegramEnabled && user?.telegramChatId);
  }

  /**
   * Получает настройки Telegram пользователя
   */
  async getTelegramSettings(userId: string): Promise<{
    enabled: boolean;
    chatId: string | null;
    username: string | null;
    settings: Record<string, any> | null;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'isTelegramEnabled',
        'telegramChatId',
        'telegramUsername',
        'telegramSettings',
      ],
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      enabled: user.isTelegramEnabled,
      chatId: user.telegramChatId,
      username: user.telegramUsername,
      settings: user.telegramSettings,
    };
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
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (settings.enabled !== undefined) {
      user.isTelegramEnabled = settings.enabled;
    }
    if (settings.chatId !== undefined) {
      user.telegramChatId = settings.chatId;
    }
    if (settings.username !== undefined) {
      user.telegramUsername = settings.username;
    }
    if (settings.additionalSettings !== undefined) {
      user.telegramSettings = {
        ...user.telegramSettings,
        ...settings.additionalSettings,
      };
    }

    return this.userRepository.save(user);
  }

  /**
   * Удаляет сообщение
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const result = await this.socialMessageRepository.delete({
      id: messageId,
      user_id: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Сообщение не найдено');
    }
  }
}
