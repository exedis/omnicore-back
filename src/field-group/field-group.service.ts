import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldGroupEntity } from './field-group.entity';
import { AssociatedField, FieldGroupResponse } from '@type/fieldGroup';

@Injectable()
export class FieldGroupService {
  private readonly logger = new Logger(FieldGroupService.name);

  constructor(
    @InjectRepository(FieldGroupEntity)
    private fieldGroupRepository: Repository<FieldGroupEntity>,
  ) {}

  /**
   * Создает новую группу
   */
  async createFieldGroup(
    userId: string,
    fieldGroupData: AssociatedField,
  ): Promise<unknown> {
    return await this.fieldGroupRepository.save({
      user_id: userId,
      name: fieldGroupData.fieldName,
      fieldGroup: fieldGroupData,
    });
  }

  /**
   * Получает все группы
   */
  async getAllTemplates(userId: string): Promise<unknown> {
    return await this.fieldGroupRepository.find({ where: { user_id: userId } });
  }
}
