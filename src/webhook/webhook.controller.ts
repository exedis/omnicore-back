import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, WebhookQueryDto } from './dto/webhook.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('webhooks')
@UseGuards(AuthGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get('/event-list')
  @Sse('webhook-events')
  getWebhookEvents(@UserId() userId: string): Observable<any> {
    return this.webhookService.getWebhookEvents(userId);
  }

  @Get('/example-message')
  async getExampleMessage(@UserId() userId: string) {
    return this.webhookService.getExampleMessage(userId);
  }

  @Post()
  async create(@Body() createWebhookDto: CreateWebhookDto) {
    // Для публичного endpoint'а вебхуков - создаем без привязки к пользователю
    // В реальном проекте здесь должна быть аутентификация по API ключу
    return this.webhookService.create(createWebhookDto, 'system');
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@UserId() userId: string, @Query() query: WebhookQueryDto) {
    return this.webhookService.findAll(userId, query);
  }

  @Get('/analytics')
  async getAnalytics(
    @UserId() userId: string,
    @Query() query: WebhookQueryDto,
  ) {
    return this.webhookService.getAnalytics(userId, query);
  }

  @Get('/:id')
  async findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.webhookService.findOne(id, userId);
  }

  @Delete('/:id')
  async remove(@Param('id') id: string, @UserId() userId: string) {
    await this.webhookService.delete(id, userId);
    return { message: 'Вебхук успешно удален' };
  }
}
