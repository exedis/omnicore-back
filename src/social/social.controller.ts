import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { UserId } from '../common/decorators/user-id.decorator';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('social')
@UseGuards(AuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // Управление настройками Telegram
  @Get('telegram/settings')
  async getTelegramSettings(@UserId() userId: string) {
    return this.socialService.getTelegramSettings(userId);
  }

  @Put('telegram/settings')
  async updateTelegramSettings(
    @Body()
    settings: {
      enabled?: boolean;
      chatId?: string;
      username?: string;
      additionalSettings?: Record<string, any>;
    },
    @UserId() userId: string,
  ) {
    return this.socialService.updateTelegramSettings(userId, settings);
  }

  // История сообщений
  @Get('messages')
  async getMessageHistory(
    @UserId() userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.socialService.getMessageHistory(userId, limitNum);
  }

  // Статистика сообщений
  @Get('stats')
  async getMessageStats(@UserId() userId: string) {
    return this.socialService.getMessageStats(userId);
  }

  // Получение сообщения по ID
  @Get('messages/:id')
  async getMessageById(@Param('id') id: string) {
    return this.socialService.getMessageById(id);
  }

  // Получение сообщений по webhook ID
  @Get('webhook/:webhookId/messages')
  async getMessagesByWebhook(@Param('webhookId') webhookId: string) {
    return this.socialService.getMessagesByWebhook(webhookId);
  }

  // Удаление сообщения
  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string, @UserId() userId: string) {
    await this.socialService.deleteMessage(id, userId);
    return { message: 'Сообщение удалено' };
  }
}
