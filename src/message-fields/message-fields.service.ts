import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageFields } from './message-fields.entity';
import { Webhook } from 'src/webhook/webhook.entity';

@Injectable()
export class MessageFieldsService {
  private readonly logger = new Logger(MessageFieldsService.name);

  constructor(
    @InjectRepository(MessageFields)
    private messageFieldsRepository: Repository<MessageFields>,
  ) {}

  async createFields(userId: string, fieldsArray: any): Promise<MessageFields> {
    const msgFields = new MessageFields();
    msgFields.fields = fieldsArray;
    msgFields.user_id = userId;

    return await this.messageFieldsRepository.save(msgFields);
  }

  async getFieldsByUserId(userId: string): Promise<MessageFields> {
    return this.messageFieldsRepository.findOne({
      where: { user_id: userId },
    });
  }

  async updateFields(userId: string, newFieldsArray: any): Promise<void> {
    const userFields = await this.messageFieldsRepository.findOne({
      where: { user_id: userId },
    });

    this.logger.log('userFields:', JSON.stringify(userFields, null, 2));

    this.logger.log('newFieldsArray:', JSON.stringify(newFieldsArray, null, 2));
    const newMessageFields = this.getFlattenedKeys(newFieldsArray);
    const existKeys = userFields?.fields.length ? userFields?.fields : [];
    const newFields = this.mergeUniqueKeys(existKeys, newMessageFields);

    this.logger.log('newFields=:', JSON.stringify(newFields, null, 2));

    try {
      if (userFields) {
        this.messageFieldsRepository.update(
          {
            id: userFields.id,
          },
          { fields: newFields },
        );
      } else {
        const msgFields = new MessageFields();
        msgFields.user_id = userId;
        msgFields.fields = newFields;
        this.messageFieldsRepository.save(msgFields);
      }
    } catch (e) {
      console.log('Ошибка обновления', e);
    }
  }

  private getFlattenedKeys(obj, prefix = '') {
    const keys = [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          // Рекурсивно обрабатываем вложенные объекты
          keys.push(...this.getFlattenedKeys(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
    }

    return keys;
  }

  private mergeUniqueKeys(existingKeys, newKeys) {
    // Объединяем массивы и создаем Set для удаления дубликатов
    const mergedSet = new Set([...existingKeys, ...newKeys]);
    // Преобразуем Set обратно в массив
    return Array.from(mergedSet);
  }
}
