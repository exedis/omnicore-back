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

    // Добавляем вебхук в очередь для асинхронной обработки
    const result = await this.webhookService.addToQueue(webhookData, userId);

    return result;
  }

  @Get('events')
  @Sse('webhook-events')
  getWebhookEvents(@UserId() userId: string): Observable<any> {
    console.log('getWebhookEvents', userId);
    return this.webhookService.getWebhookEvents(userId);
  }
}
