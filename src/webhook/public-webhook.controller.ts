import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Sse,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto } from './dto/webhook.dto';
import { ApiKeyGuard } from '../api-key/guards/api-key.guard';
import { UserId } from 'src/common/decorators/user-id.decorator';
import { Observable } from 'rxjs';

@Controller('public/webhooks')
@UseGuards(ApiKeyGuard)
export class PublicWebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async createWebhook(
    @Body() createWebhookDto: CreateWebhookDto,
    @Request() req,
    @UserId() userId: string,
  ) {
    // Добавляем метаданные о времени получения
    const webhookData = {
      ...createWebhookDto,
      metadata: {
        ...createWebhookDto.metadata,
        receivedAt: new Date().toISOString(),
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        apiKeyId: req.user.apiKey.id,
      },
    };

    // Создаем вебхук для пользователя, которому принадлежит API ключ
    const webhook = await this.webhookService.create(webhookData, userId);

    // Отправляем уведомление через SSE
    this.webhookService.notifyNewWebhook(userId, webhook);

    return webhook;
  }

  @Get('events')
  @Sse('webhook-events')
  getWebhookEvents(@UserId() userId: string): Observable<any> {
    console.log('getWebhookEvents', userId);
    return this.webhookService.getWebhookEvents(userId);
  }
}
