import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate, TemplateType } from './message-template.entity';
import { Webhook } from 'src/webhook/webhook.entity';
import { MessageFieldsService } from 'src/message-fields/message-fields.service';

@Injectable()
export class MessageTemplateService {
  private readonly logger = new Logger(MessageTemplateService.name);

  constructor(
    private readonly messageFieldsService: MessageFieldsService,
    @InjectRepository(MessageTemplate)
    private messageTemplateRepository: Repository<MessageTemplate>,
  ) {}

  /**
   * Создает новый шаблон сообщения
   */
  async createTemplate(
    userId: string,
    templateData: {
      name: string;
      type: TemplateType;
      template: string;
    },
  ): Promise<MessageTemplate> {
    // this.logger.log(
    //   'Creating template with data:',
    //   JSON.stringify(templateData, null, 2),
    // );
    // this.logger.log('User ID:', userId);

    // Создаем entity напрямую
    const template = new MessageTemplate();
    template.type = templateData.type;
    template.messageTemplate = templateData.template || '';
    template.user_id = userId;

    const savedTemplate = await this.messageTemplateRepository.save(template);

    return savedTemplate;
  }

  /**
   * Получает все шаблоны пользователя
   */
  async getUserTemplates(
    userId: string,
    type?: TemplateType,
  ): Promise<MessageTemplate[]> {
    const where: any = { user_id: userId, isActive: true };
    if (type) {
      where.type = type;
    }

    return this.messageTemplateRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получает все шаблоны пользователя
   */
  async getTemplates(userId: string): Promise<{
    userTemplates: MessageTemplate[];
    variablesFromMessages: string[];
  }> {
    const getUserFields = await this.messageFieldsService.getFieldsByUserId(
      userId,
    );

    // this.logger.log(
    //   'getExampleMessages=',
    //   JSON.stringify(getUserFields, null, 2),
    // );
    const userTemplates = await this.messageTemplateRepository.find({
      where: { user_id: userId },
    });

    return {
      userTemplates,
      variablesFromMessages: getUserFields.fields,
    };
  }

  /**
   * Обновляем шаблон пользователя
   */
  async updateTemplate(
    userId: string,
    type: TemplateType,
    messageTemplate: string,
  ): Promise<void> {
    const templateData = await this.messageTemplateRepository.findOne({
      where: { type: type, user_id: userId },
    });

    if (!templateData) {
      throw new NotFoundException('Шаблон не найден');
    }

    // Применяем изменения
    this.messageTemplateRepository.save({
      ...templateData,
      messageTemplate: messageTemplate,
    });
  }

  /**
   * Получает шаблон по умолчанию для типа платформы
   */
  async getDefaultTemplate(
    userId: string,
    type: TemplateType,
  ): Promise<MessageTemplate | null> {
    return this.messageTemplateRepository.findOne({
      where: {
        user_id: userId,
        type,
      },
    });
  }

  /**
   * Форматирует сообщение по шаблону
   */
  async formatMessage(
    userId: string,
    type: TemplateType,
    webhook: Webhook,
  ): Promise<string> {
    // Получаем шаблон по умолчанию или первый доступный
    let template = await this.getDefaultTemplate(userId, type);

    if (!template) {
      const templates = await this.getUserTemplates(userId, type);
      template = templates[0];
    }

    if (!template) {
      // Fallback к стандартному форматированию
      return this.getDefaultMessageFormat(webhook);
    }
    return this.replaceTemplateVariables(template.messageTemplate, webhook);
  }

  /* функция замены переменных в шаблоне */
  private replaceTemplateVariables(template, data) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      // Убираем пробелы вокруг ключа
      const cleanKey = key.trim();

      // Разбиваем ключ по точкам для вложенных объектов
      const keys = cleanKey.split('.');

      // Рекурсивно получаем значение из объекта
      let value = data;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Если ключ не найден, возвращаем оригинальный placeholder
          return match;
        }
      }

      // Если значение undefined, null или объект - возвращаем пустую строку
      if (
        value === null ||
        value === undefined ||
        (typeof value === 'object' && !Array.isArray(value))
      ) {
        return '';
      }

      return String(value);
    });
  }

  // Функция для получения вложенных значений из объекта
  // private getNestedValue(obj, path) {
  //   // Если путь без точек - ищем прямое свойство
  //   if (!path.includes('.')) {
  //     return obj[path];
  //   }

  //   // Разбиваем путь по точкам
  //   const keys = path.split('.');
  //   let current = obj;

  //   // Проходим по всем ключам пути
  //   for (const key of keys) {
  //     if (current && typeof current === 'object' && key in current) {
  //       current = current[key];
  //     } else {
  //       return undefined; // Если путь не найден
  //     }
  //   }

  //   return current;
  // }

  /**
   * Стандартный формат сообщения (fallback)
   */
  private getDefaultMessageFormat(webhookData: {
    siteName: string;
    formName: string;
    data: Record<string, any>;
    advertisingParams?: Record<string, any>;
    createdAt: Date;
  }): string {
    let message = `📨 Новое сообщение с сайта "${webhookData.siteName}"\n`;
    message += `📋 Форма: ${webhookData.formName}\n`;
    message += `🕐 Время: ${webhookData.createdAt.toLocaleString('ru-RU')}\n\n`;

    if (webhookData.data && Object.keys(webhookData.data).length > 0) {
      message += `📝 Данные формы:\n`;
      Object.entries(webhookData.data).forEach(([key, value]) => {
        message += `• ${key}: ${value}\n`;
      });
      message += `\n`;
    }

    if (
      webhookData.advertisingParams &&
      Object.keys(webhookData.advertisingParams).length > 0
    ) {
      message += `📊 Рекламные параметры:\n`;
      Object.entries(webhookData.advertisingParams).forEach(([key, value]) => {
        message += `• ${key}: ${value}\n`;
      });
    }

    return message;
  }
}
