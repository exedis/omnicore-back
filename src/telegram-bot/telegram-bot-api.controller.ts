import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotController as BotController } from './telegram-bot.controller';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { Observable } from 'rxjs';

@Controller('telegram-bot')
export class TelegramBotApiController {
  constructor(
    private readonly telegramBotService: TelegramBotService,
    private readonly botController: BotController,
  ) {}

  // Создание токена авторизации (только для авторизованных пользователей)
  @Post('auth-token')
  @UseGuards(AuthGuard)
  async createAuthToken(@UserId() userId: string) {
    const { token, authLink } = await this.telegramBotService.createAuthToken(
      userId,
    );

    return {
      token,
      authLink,
      message:
        'Токен авторизации создан. Отправьте ссылку пользователю для авторизации в Telegram.',
    };
  }

  // Отправка персонализированного сообщения
  @Post('send-message')
  @UseGuards(AuthGuard)
  async sendPersonalizedMessage(
    @Body() body: { message: string },
    @UserId() userId: string,
  ) {
    await this.telegramBotService.sendPersonalizedMessage(userId, body.message);
    return { message: 'Персонализированное сообщение отправлено' };
  }

  // Отправка тестового сообщения
  @Post('test-message')
  @UseGuards(AuthGuard)
  async sendTestMessage(@Body() body: { chatId: string; message: string }) {
    await this.botController.sendMessageToUser(body.chatId, body.message);
    return { message: 'Тестовое сообщение отправлено' };
  }

  // Получение информации о боте
  @Get('bot-info')
  async getBotInfo() {
    return this.botController.getBotInfo();
  }

  // Получение активных токенов пользователя
  @Get('auth-tokens')
  @UseGuards(AuthGuard)
  async getActiveTokens(@UserId() userId: string) {
    const tokens = await this.telegramBotService.getActiveTokens(userId);

    return tokens.map((token) => ({
      id: token.id,
      token: token.token,
      authLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${token.token}`,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    }));
  }

  // Отзыв токена
  @Post('revoke-token')
  @UseGuards(AuthGuard)
  async revokeToken(
    @Body() body: { tokenId: string },
    @UserId() userId: string,
  ) {
    await this.telegramBotService.revokeToken(body.tokenId, userId);
    return { message: 'Токен отозван' };
  }

  // Проверка авторизации пользователя в Telegram
  @Get('auth-status')
  @UseGuards(AuthGuard)
  async getAuthStatus(@UserId() userId: string) {
    const isAuthorized =
      await this.telegramBotService.isUserAuthorizedInTelegram(userId);
    const chatId = await this.telegramBotService.getUserChatId(userId);

    return {
      isAuthorized,
      chatId,
      message: isAuthorized
        ? 'Пользователь авторизован в Telegram'
        : 'Пользователь не авторизован в Telegram',
    };
  }

  // SSE endpoint для получения уведомлений о статусе Telegram
  @Sse('status-stream')
  @UseGuards(AuthGuard)
  getStatusStream(@UserId() userId: string): Observable<MessageEvent> {
    return this.telegramBotService.getStatusStream(userId);
  }
}
