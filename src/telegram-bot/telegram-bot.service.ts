import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramAuthToken } from './telegram-auth-token.entity';
import { randomBytes } from 'crypto';
import { Observable, Subject, map, filter } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { TelegramSettings } from 'src/message-settings/telegram/telegram-settings.entity';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly statusSubject = new Subject<{
    userId: string;
    isAuthorized: boolean;
  }>();

  constructor(
    @InjectRepository(TelegramAuthToken)
    private telegramAuthTokenRepository: Repository<TelegramAuthToken>,
    @InjectRepository(TelegramSettings)
    private telegramSettingsRepository: Repository<TelegramSettings>,
  ) {}

  // Создание токена авторизации для пользователя
  async createAuthToken(
    userId: string,
  ): Promise<{ token: string; authLink: string }> {
    // Генерируем уникальный токен
    const token = randomBytes(32).toString('hex');
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const authLink = `https://t.me/${botUsername}?start=${token}`;

    // Сохраняем токен в базе данных
    const authToken = this.telegramAuthTokenRepository.create({
      user_id: userId,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 час
    });

    await this.telegramAuthTokenRepository.save(authToken);

    this.logger.log(
      `Создан токен авторизации для пользователя ${userId}: ${token}`,
    );

    return { token, authLink };
  }

  // Обработка команды /start с токеном
  async handleStartCommand(
    chatId: string,
    token: string,
    userInfo: any,
  ): Promise<string> {
    this.logger.log(
      `Обработка команды /start с токеном ${token} от пользователя ${chatId}`,
    );

    try {
      // Ищем токен в базе данных
      const authToken = await this.telegramAuthTokenRepository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (!authToken) {
        return '❌ Неверный токен авторизации. Проверьте ссылку и попробуйте снова.';
      }

      // Проверяем, не истек ли токен
      if (authToken.expiresAt < new Date()) {
        return '⏰ Токен авторизации истек. Запросите новую ссылку в системе.';
      }

      // Проверяем, не использован ли токен
      if (authToken.isUsed) {
        return '⚠️ Этот токен уже был использован. Если вы уже авторизованы, можете использовать систему.';
      }

      // Проверяем, есть ли уже настройки Telegram для этого пользователя
      const existingSettings = await this.telegramSettingsRepository.findOne({
        where: { user_id: authToken.user_id },
        select: ['isEnabled', 'chatId'],
      });

      if (existingSettings && existingSettings.chatId) {
        return '⚠️ Пользователь уже авторизован в системе. Если это ваш аккаунт, можете использовать систему.';
      }

      // Обновляем токен с информацией о пользователе Telegram
      authToken.isUsed = true;
      authToken.telegramChatId = chatId;
      authToken.telegramUsername = userInfo.username;
      authToken.usedAt = new Date();

      await this.telegramAuthTokenRepository.save(authToken);

      // Создаем или обновляем настройки пользователя
      let settings = await this.telegramSettingsRepository.findOne({
        where: { user_id: authToken.user_id },
      });

      if (!settings) {
        // Создаем новую запись если её нет
        settings = this.telegramSettingsRepository.create({
          user_id: authToken.user_id,
          isEnabled: false,
        });
      }

      // Обновляем настройки Telegram
      settings.isEnabled = true;
      settings.chatId = chatId;
      settings.settings = {
        ...settings.settings,
        username: userInfo.username,
        firstName: userInfo.first_name,
        lastAuthDate: new Date().toISOString(),
      };

      await this.telegramSettingsRepository.save(settings);

      // Отправляем SSE уведомление об успешной авторизации
      this.statusSubject.next({
        userId: authToken.user_id,
        isAuthorized: true,
      });

      // Отправляем сообщение об успешной авторизации
      return `✅ Авторизация успешна!\n\n👤 Пользователь: ${authToken.user.name}\n📧 Email: ${authToken.user.email}\n\nТеперь вы будете получать уведомления о новых сообщениях в системе.`;
    } catch (error) {
      this.logger.error('Ошибка при обработке токена авторизации:', error);
      return '❌ Произошла ошибка при авторизации. Попробуйте позже или обратитесь к администратору.';
    }
  }

  // Обработка обычной команды /start
  async handleStartCommandWithoutToken(
    chatId: string,
    userInfo: any,
  ): Promise<string> {
    this.logger.log(
      `Обработка команды /start без токена от пользователя ${chatId}`,
    );

    return `👋 Привет, ${
      userInfo.first_name || 'пользователь'
    }!\n\nЯ бот для авторизации в системе Omnicore.\n\nДля авторизации вставьте ключ, которую вы получили в личном кабинете Omnicore.`;
  }

  // Обработка обычных сообщений
  async handleTextMessage(
    chatId: string,
    text: string,
    userInfo: any,
  ): Promise<string> {
    this.logger.log(`Получено сообщение от пользователя ${chatId}: ${text}`);

    return `ℹ️ Для авторизации в системе используйте ссылку, которую вы получили.\n\nЕсли у вас нет ссылки, обратитесь к администратору системы.`;
  }

  // Отправка персонализированного сообщения пользователю
  async sendPersonalizedMessage(
    userId: string,
    message: string,
  ): Promise<void> {
    const settings = await this.telegramSettingsRepository.findOne({
      where: { user_id: userId },
      select: ['isEnabled', 'chatId'],
    });

    if (!settings?.isEnabled || !settings?.chatId) {
      this.logger.warn(
        `Пользователь ${userId} не настроил Telegram или отключил уведомления`,
      );
      throw new Error(
        'Пользователь не настроил Telegram или отключил уведомления',
      );
    }

    try {
      // Отправляем сообщение через Telegram Bot API
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        throw new Error(
          'TELEGRAM_BOT_TOKEN не настроен в переменных окружения',
        );
      }

      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: settings.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Telegram API error: ${errorData.description || response.statusText}`,
        );
      }

      const result = await response.json();
      this.logger.log(
        `Сообщение успешно отправлено пользователю ${userId} (chatId: ${settings.chatId}), messageId: ${result.result.message_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Ошибка при отправке сообщения пользователю ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Создание или обновление настроек Telegram для пользователя
  async createOrUpdateTelegramSettings(
    userId: string,
    chatId: string,
    userInfo: any,
  ): Promise<TelegramSettings> {
    let settings = await this.telegramSettingsRepository.findOne({
      where: { user_id: userId },
    });

    if (!settings) {
      // Создаем новую запись если её нет
      settings = this.telegramSettingsRepository.create({
        user_id: userId,
        isEnabled: false,
      });
    }

    // Обновляем настройки пользователя
    settings.isEnabled = true;
    settings.chatId = chatId;
    settings.settings = {
      ...settings.settings,
      username: userInfo.username,
      firstName: userInfo.first_name,
      lastName: userInfo.last_name,
      lastAuthDate: new Date().toISOString(),
    };

    return await this.telegramSettingsRepository.save(settings);
  }

  // Проверка, авторизован ли пользователь в Telegram
  async isUserAuthorizedInTelegram(userId: string): Promise<boolean> {
    const settings = await this.telegramSettingsRepository.findOne({
      where: { user_id: userId },
      select: ['isEnabled', 'chatId'],
    });

    return !!(settings?.isEnabled && settings?.chatId);
  }

  // Получение chat_id пользователя
  async getUserChatId(userId: string): Promise<string | null> {
    const settings = await this.telegramSettingsRepository.findOne({
      where: { user_id: userId },
      select: ['isEnabled', 'chatId'],
    });

    return settings?.isEnabled && settings?.chatId ? settings.chatId : null;
  }

  // Получение активных токенов пользователя
  async getActiveTokens(userId: string): Promise<TelegramAuthToken[]> {
    return this.telegramAuthTokenRepository.find({
      where: {
        user_id: userId,
        isUsed: false,
        expiresAt: new Date(), // Токены, которые еще не истекли
      },
      order: { createdAt: 'DESC' },
    });
  }

  // Отзыв токена
  async revokeToken(tokenId: string, userId: string): Promise<void> {
    const result = await this.telegramAuthTokenRepository.update(
      {
        id: tokenId,
        user_id: userId,
        isUsed: false,
      },
      {
        isUsed: true,
        usedAt: new Date(),
      },
    );

    if (result.affected === 0) {
      throw new NotFoundException('Токен не найден или уже использован');
    }
  }

  // SSE stream для получения уведомлений о статусе авторизации
  getStatusStream(userId: string): Observable<MessageEvent> {
    return this.statusSubject.asObservable().pipe(
      filter((status) => status.userId === userId),
      map((status) => ({
        data: JSON.stringify({
          type: 'telegram_auth_status',
          isAuthorized: status.isAuthorized,
          timestamp: new Date().toISOString(),
        }),
      })),
    );
  }
}
