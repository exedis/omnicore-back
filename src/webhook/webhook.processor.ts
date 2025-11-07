import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from './webhook.entity';
import { CreateWebhookDto } from './dto/webhook.dto';
import { MessageFieldsService } from 'src/message-fields/message-fields.service';
import { MessageSettingsService } from 'src/message-settings/message-settings.service';
import { TelegramSenderService } from 'src/message-settings/telegram/telegram-sender.service';
import { EmailSenderService } from 'src/message-settings/email/email-sender.service';
import { TaskService } from 'src/task/task.service';
import { ApiKey } from 'src/api-key/api-key.entity';

export interface WebhookJobData {
  webhookDto: CreateWebhookDto;
  userId: string;
}

@Processor('webhooks')
@Injectable()
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    private messageFields: MessageFieldsService,
    private messageSettingsService: MessageSettingsService,
    private telegramSenderService: TelegramSenderService,
    private emailSenderService: EmailSenderService,
    private taskService: TaskService,
  ) {}

  @Process('process-webhook')
  async handleWebhook(job: Job<WebhookJobData>) {
    const { webhookDto, userId } = job.data;

    this.logger.log(`Processing webhook for user ${userId}, job ${job.id}`);

    try {
      // Создаем и сохраняем webhook
      const webhook = this.webhookRepository.create({
        ...webhookDto,
        user_id: userId,
      });

      const savedWebhook = await this.webhookRepository.save(webhook);

      // Обновляем поля сообщений
      await this.messageFields.updateFields(userId, webhook);

      // Создаем задачу, если есть apiKeyId и связанная доска
      const apiKeyId = webhookDto.metadata?.apiKeyId;
      if (apiKeyId) {
        try {
          const apiKey = await this.apiKeyRepository.findOne({
            where: { id: apiKeyId },
            relations: ['board'],
          });

          if (apiKey?.board_id) {
            await this.taskService.createFromWebhook(
              savedWebhook,
              apiKey.board_id,
            );
            this.logger.log(
              `Created task for webhook ${savedWebhook.id} on board ${apiKey.board_id}`,
            );
          }
        } catch (taskError) {
          this.logger.error(
            `Failed to create task for webhook ${savedWebhook.id}: ${taskError.message}`,
            taskError.stack,
          );
          // Не прерываем выполнение, если создание задачи не удалось
        }
      }

      // Загружаем все настройки параллельно
      const notificationSettings =
        await this.messageSettingsService.getAllSettingsForNotification(userId);

      // Отправляем уведомления параллельно
      await Promise.allSettled([
        this.telegramSenderService.sendWebhookNotification(
          savedWebhook,
          notificationSettings.telegram.settings,
          notificationSettings.telegram.template,
        ),
        this.emailSenderService.sendWebhookNotification(
          savedWebhook,
          notificationSettings.email.settings,
          notificationSettings.email.template,
        ),
      ]);

      this.logger.log(
        `Successfully processed webhook ${savedWebhook.id} for user ${userId}`,
      );

      return savedWebhook;
    } catch (error) {
      this.logger.error(
        `Failed to process webhook for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
