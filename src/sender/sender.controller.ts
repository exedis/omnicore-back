import {
  Controller,
  UseGuards,
  Post,
  Get,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { SenderService } from './sender.service';
import { User } from '../decorators/user.decorator';

@Controller('sender')
@UseGuards(AuthGuard)
export class SenderController {
  constructor(private readonly senderService: SenderService) {}

  /**
   * Обрабатывает webhook сообщение и отправляет его в Telegram
   */
  @Post('process-webhook/:webhookId')
  async processWebhookMessage(
    @Param('webhookId') webhookId: string,
    @User('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.senderService.processWebhookMessage(webhookId, userId);
      return {
        success: true,
        message: 'Сообщение успешно обработано и отправлено в Telegram',
      };
    } catch (error) {
      return {
        success: false,
        message: `Ошибка при обработке сообщения: ${error.message}`,
      };
    }
  }

  /**
   * Получает статистику отправленных сообщений
   */
  @Get('stats')
  async getMessageStats(@User('id') userId: string) {
    return this.senderService.getMessageStats(userId);
  }

  /**
   * Получает историю отправленных сообщений
   */
  @Get('history')
  async getMessageHistory(
    @User('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.senderService.getMessageHistory(userId, limitNum);
  }
}
