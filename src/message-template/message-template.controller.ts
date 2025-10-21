import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { MessageTemplateService } from './message-template.service';
import { TemplateType } from './message-template.entity';
import { FieldMapping } from '@type/user';

@Controller('message-templates')
@UseGuards(AuthGuard)
export class MessageTemplateController {
  constructor(
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * Создает новый шаблон
   */
  @Post('create-template')
  async createTemplate(
    @UserId() userId: string,
    @Body()
    body: {
      data: {
        name: string;
        type: TemplateType;
        isDefault?: boolean;
        template: string;
      };
    },
  ) {
    // console.log('Controller received body:', JSON.stringify(body, null, 2));
    // console.log('Controller received userId:', userId);

    // Извлекаем данные из обертки
    const templateData = body.data;

    if (!templateData) {
      throw new Error('Template data is required');
    }

    // Валидация обязательных полей
    if (!templateData.name || templateData.name.trim() === '') {
      throw new Error('Name is required and cannot be empty');
    }

    if (!templateData.type) {
      throw new Error('Type is required');
    }

    if (!templateData.template || templateData.template.trim() === '') {
      throw new Error('Template is required and cannot be empty');
    }

    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required');
    }

    return this.messageTemplateService.createTemplate(userId, templateData);
  }

  /**
   * Получает все шаблоны пользователя
   */
  @Get('all-templates')
  async getUserTemplates(
    @UserId() userId: string,
    @Query('type') type?: TemplateType,
  ) {
    return this.messageTemplateService.getUserTemplates(userId, type);
  }

  /**
   * Получает шаблон по умолчанию для типа
   */
  @Get('default/:type')
  async getDefaultTemplate(
    @UserId() userId: string,
    @Param('type') type: TemplateType,
  ) {
    return this.messageTemplateService.getDefaultTemplate(userId, type);
  }

  /**
   * Обновляет шаблон
   */
  @Put(':id')
  async updateTemplate(
    @UserId() userId: string,
    @Param('id') templateId: string,
    @Body()
    body: {
      name?: string;
      template?: string;
      fieldMappings?: FieldMapping[];
      isDefault?: boolean;
      isActive?: boolean;
    },
  ) {
    return this.messageTemplateService.updateTemplate(templateId, userId, body);
  }

  /**
   * Удаляет шаблон
   */
  @Delete(':id')
  async deleteTemplate(
    @UserId() userId: string,
    @Param('id') templateId: string,
  ) {
    await this.messageTemplateService.deleteTemplate(templateId, userId);
    return { success: true };
  }

  /**
   * Получает шаблон по id
   */
  @Get(':id')
  async getTemplateById(
    @UserId() userId: string,
    @Param('id') templateId: string,
  ) {
    return await this.messageTemplateService.getTemplateById(
      userId,
      templateId,
    );
  }
}
