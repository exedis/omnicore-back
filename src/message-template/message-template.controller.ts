import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { MessageTemplateService } from './message-template.service';

@Controller('message-templates')
@UseGuards(AuthGuard)
export class MessageTemplateController {
  constructor(
    private readonly messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * Получает шаблон по id
   */
  @Get('')
  async getTemplateByType(@UserId() userId: string) {
    return await this.messageTemplateService.getTemplates(userId);
  }
}
