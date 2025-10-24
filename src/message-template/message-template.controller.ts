import { Controller, Get, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { MessageTemplateService } from './message-template.service';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateType } from './message-template.entity';

@Controller('message-templates')
@UseGuards(AuthGuard)
export class MessageTemplateController {
  constructor(
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * Обновляем шаблон по типу
   */
  @Patch(':type')
  async getTemplateById(
    @UserId() userId: string,
    @Param('type') type: TemplateType,
    @Body() data: UpdateTemplateDto,
  ) {
    return await this.messageTemplateService.updateTemplate(
      userId,
      type,
      data.messageTemplate,
    );
  }

  /**
   * Получает шаблон по id
   */
  @Get('')
  async getTemplateByType(@UserId() userId: string) {
    return await this.messageTemplateService.getTemplates(userId);
  }
}
