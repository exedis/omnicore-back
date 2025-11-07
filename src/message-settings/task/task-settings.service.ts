import { Injectable, Logger } from '@nestjs/common';

import { MessageTemplateService } from 'src/message-template/message-template.service';
import { TemplateType } from '@type/settings';

@Injectable()
export class TaskSettingsService {
  private readonly logger = new Logger(TaskSettingsService.name);

  constructor(private messageTemplateService: MessageTemplateService) {}

  /**
   * Обновляет настройки task
   */
  async updateTaskSettings(
    userId: string,
    settings: {
      messageTemplate?: string;
    },
  ): Promise<void> {
    await this.messageTemplateService.updateTemplate(
      userId,
      settings.messageTemplate,
      TemplateType.TASK,
    );
  }
}
