import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate, TemplateType } from './message-template.entity';
import { User } from '../user/user.entity';
import { FieldMapping } from '@type/user';

@Injectable()
export class MessageTemplateService {
  private readonly logger = new Logger(MessageTemplateService.name);

  constructor(
    @InjectRepository(MessageTemplate)
    private messageTemplateRepository: Repository<MessageTemplate>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Создает новый шаблон сообщения
   */
  async createTemplate(
    userId: string,
    templateData: {
      name: string;
      type: TemplateType;
      isDefault?: boolean;
      template: string;
    },
  ): Promise<MessageTemplate> {
    // this.logger.log(
    //   'Creating template with data:',
    //   JSON.stringify(templateData, null, 2),
    // );
    // this.logger.log('User ID:', userId);

    // Если это шаблон по умолчанию, снимаем флаг с других шаблонов этого типа
    if (templateData.isDefault) {
      await this.messageTemplateRepository.update(
        { user_id: userId, type: templateData.type },
        { isDefault: false },
      );
    }

    // Создаем entity напрямую
    const template = new MessageTemplate();
    template.name = templateData.name || 'Unnamed Template';
    template.type = templateData.type;
    template.template = templateData.template || '';
    template.isDefault = templateData.isDefault || false;
    template.isActive = true;
    template.user_id = userId;

    // this.logger.log(
    //   'Created template entity:',
    //   JSON.stringify(template, null, 2),
    // );

    const savedTemplate = await this.messageTemplateRepository.save(template);

    // this.logger.log('Template saved successfully:', savedTemplate.id);

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
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Получает все шаблоны пользователя
   */
  async getTemplateById(
    userId: string,
    templateId: string,
  ): Promise<MessageTemplate> {
    const where: any = { id: templateId, user_id: userId, isActive: true };

    return this.messageTemplateRepository.findOne({
      where,
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
        isDefault: true,
        isActive: true,
      },
    });
  }

  /**
   * Обновляет шаблон
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    updateData: {
      name?: string;
      template?: string;
      fieldMappings?: FieldMapping[];
      isDefault?: boolean;
      isActive?: boolean;
    },
  ): Promise<MessageTemplate> {
    const template = await this.messageTemplateRepository.findOne({
      where: { id: templateId, user_id: userId },
    });

    if (!template) {
      throw new NotFoundException('Шаблон не найден');
    }

    // Если устанавливаем как шаблон по умолчанию, снимаем флаг с других
    if (updateData.isDefault) {
      await this.messageTemplateRepository.update(
        { user_id: userId, type: template.type },
        { isDefault: false },
      );
    }

    Object.assign(template, updateData);
    return this.messageTemplateRepository.save(template);
  }

  /**
   * Удаляет шаблон (мягкое удаление)
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const result = await this.messageTemplateRepository.update(
      { id: templateId, user_id: userId },
      { isActive: false },
    );

    if (result.affected === 0) {
      throw new NotFoundException('Шаблон не найден');
    }
  }

  /**
   * Форматирует сообщение по шаблону
   */
  async formatMessage(
    userId: string,
    type: TemplateType,
    webhookData: {
      siteName: string;
      formName: string;
      data: Record<string, any>;
      advertisingParams?: Record<string, any>;
      createdAt: Date;
    },
  ): Promise<string> {
    // Получаем шаблон по умолчанию или первый доступный
    let template = await this.getDefaultTemplate(userId, type);

    if (!template) {
      const templates = await this.getUserTemplates(userId, type);
      template = templates[0];
    }

    if (!template) {
      // Fallback к стандартному форматированию
      return this.getDefaultMessageFormat(webhookData);
    }

    return this.processTemplate(template.template, webhookData);
  }

  /**
   * Обрабатывает шаблон с подстановкой переменных
   */
  private processTemplate(
    template: string,
    webhookData: {
      siteName: string;
      formName: string;
      data: Record<string, any>;
      advertisingParams?: Record<string, any>;
      createdAt: Date;
    },
    fieldMappings: FieldMapping[] = [],
  ): string {
    let result = template;

    // Базовые переменные
    const variables = {
      siteName: webhookData.siteName,
      formName: webhookData.formName,
      time: webhookData.createdAt.toLocaleString('ru-RU'),
      date: webhookData.createdAt.toLocaleDateString('ru-RU'),
    };

    // Добавляем поля формы из маппинга
    const selectedMappings = fieldMappings.filter((m) => m.isSelected);
    selectedMappings.forEach((mapping) => {
      const value = this.getFieldValue(webhookData.data, mapping.webhookField);
      variables[mapping.displayTitle] = value || '';
    });

    // Добавляем рекламные параметры
    if (webhookData.advertisingParams) {
      Object.entries(webhookData.advertisingParams).forEach(([key, value]) => {
        variables[`utm_${key}`] = value;
      });
    }

    // Заменяем переменные в шаблоне
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  /**
   * Получает значение поля по пути (например, "user.name")
   */
  private getFieldValue(data: Record<string, any>, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = data;

    for (const part of parts) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

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
