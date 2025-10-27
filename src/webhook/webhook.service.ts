import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Webhook } from './webhook.entity';
import { CreateWebhookDto, WebhookQueryDto } from './dto/webhook.dto';
import { MessageFieldsService } from 'src/message-fields/message-fields.service';
import { MessageSettingsService } from 'src/message-settings/message-settings.service';
import { TelegramSenderService } from 'src/message-settings/telegram/telegram-sender.service';
import { EmailSenderService } from 'src/message-settings/email/email-sender.service';

@Injectable()
export class WebhookService {
  private webhookEvents = new Map<string, Subject<any>>();

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    private messageFields: MessageFieldsService,
    private messageSettingsService: MessageSettingsService,
    private telegramSenderService: TelegramSenderService,
    private emailSenderService: EmailSenderService,
  ) {}

  async create(
    createWebhookDto: CreateWebhookDto,
    userId: string,
  ): Promise<Webhook> {
    // Создаем и сохраняем webhook
    const webhook = this.webhookRepository.create({
      ...createWebhookDto,
      user_id: userId,
    });

    const savedWebhook = await this.webhookRepository.save(webhook);
    this.messageFields.updateFields(userId, webhook);

    // Загружаем все настройки параллельно одним запросом
    const notificationSettings =
      await this.messageSettingsService.getAllSettingsForNotification(userId);

    // Отправляем уведомления параллельно (не ждем завершения)
    Promise.allSettled([
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
    ]).catch((error) => {
      console.error('Ошибка при отправке уведомлений:', error.message);
      // Не прерываем выполнение, если обработка не удалась
    });

    return savedWebhook;
  }

  async findAll(userId: string, query: WebhookQueryDto) {
    const {
      siteName,
      formName,
      startDate,
      endDate,
      page = '1',
      limit = '10',
    } = query;

    const queryBuilder = this.webhookRepository
      .createQueryBuilder('webhook')
      .where('webhook.user_id = :userId', { userId });

    if (siteName) {
      queryBuilder.andWhere('webhook.siteName ILIKE :siteName', {
        siteName: `%${siteName}%`,
      });
    }

    if (formName) {
      queryBuilder.andWhere('webhook.formName ILIKE :formName', {
        formName: `%${formName}%`,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'webhook.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    queryBuilder
      .orderBy('webhook.createdAt', 'DESC')
      .skip(offset)
      .take(limitNum);

    const [webhooks, total] = await queryBuilder.getManyAndCount();

    return {
      webhooks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!webhook) {
      throw new NotFoundException('Вебхук не найден');
    }

    return webhook;
  }

  async getAnalytics(userId: string, query: WebhookQueryDto) {
    const { startDate, endDate } = query;

    const queryBuilder = this.webhookRepository
      .createQueryBuilder('webhook')
      .where('webhook.user_id = :userId', { userId });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'webhook.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    }

    const webhooks = await queryBuilder.getMany();

    // Аналитика по сайтам
    const siteAnalytics = webhooks.reduce((acc, webhook) => {
      if (!acc[webhook.siteName]) {
        acc[webhook.siteName] = 0;
      }
      acc[webhook.siteName]++;
      return acc;
    }, {} as Record<string, number>);

    // Аналитика по формам
    const formAnalytics = webhooks.reduce((acc, webhook) => {
      if (!acc[webhook.formName]) {
        acc[webhook.formName] = 0;
      }
      acc[webhook.formName]++;
      return acc;
    }, {} as Record<string, number>);

    // Аналитика по рекламным параметрам
    const advertisingAnalytics = webhooks.reduce((acc, webhook) => {
      if (webhook.advertisingParams) {
        Object.entries(webhook.advertisingParams).forEach(([key, value]) => {
          if (!acc[key]) {
            acc[key] = {};
          }
          if (!acc[key][value as string]) {
            acc[key][value as string] = 0;
          }
          acc[key][value as string]++;
        });
      }
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return {
      total: webhooks.length,
      siteAnalytics,
      formAnalytics,
      advertisingAnalytics,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.webhookRepository.delete({
      id,
      user_id: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Вебхук не найден');
    }
  }

  // SSE методы
  getWebhookEvents(userId: string): Observable<any> {
    if (!this.webhookEvents.has(userId)) {
      this.webhookEvents.set(userId, new Subject());
    }

    return this.webhookEvents
      .get(userId)
      .asObservable()
      .pipe(
        map((data) => ({
          data: JSON.stringify(data),
        })),
      );
  }

  notifyNewWebhook(userId: string, webhook: Webhook): void {
    const userEvents = this.webhookEvents.get(userId);
    if (userEvents) {
      userEvents.next({
        type: 'new_webhook',
        webhook,
        timestamp: new Date().toISOString(),
      });
    }
  }

  cleanupUserEvents(userId: string): void {
    const userEvents = this.webhookEvents.get(userId);
    if (userEvents) {
      userEvents.complete();
      this.webhookEvents.delete(userId);
    }
  }

  async getExampleMessage(userId: string): Promise<Webhook> {
    return this.webhookRepository.findOne({
      where: { user_id: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получает переменные из сообщения
   */
  async getAllMessageVariables(userId: string): Promise<string[]> {
    const getExampleMessages = await this.webhookRepository.find({
      where: { user_id: userId },
      order: { createdAt: 'DESC' },
      take: 20, //TODO: подумать как лучше сделать в целом
    });
    return this.extractAvailableFields(getExampleMessages);
  }

  extractAvailableFields = (
    exampleMessages: Webhook[],
    prefix = '',
  ): string[] => {
    const fields: Set<string> = new Set();

    exampleMessages.forEach((exampleMessage) => {
      for (const key in exampleMessage.data) {
        if (exampleMessage.data.hasOwnProperty(key)) {
          const fieldPath = prefix ? `${prefix}.${key}` : key;

          if (
            typeof exampleMessage.data[key] === 'object' &&
            exampleMessage.data[key] !== null &&
            !Array.isArray(exampleMessage.data[key])
          ) {
            // Рекурсивно извлекаем поля из вложенных объектов
            const nestedFields = this.extractAvailableFields(
              [{ data: exampleMessage.data[key] }] as Webhook[],
              fieldPath,
            );
            nestedFields.forEach((field) => fields.add(field));
          } else {
            // Добавляем поле
            fields.add(fieldPath);
          }
        }
      }
    });

    return Array.from(fields);
  };
}
