import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramSettings } from './telegram-settings.entity';
import { TemplateType } from '@type/settings';
import { MessageTemplateService } from 'src/message-template/message-template.service';
import { UpdateTelegramSettingsDto } from '../dto/update-telegram-settings.dto';

@Injectable()
export class TelegramSettingsService {
  private readonly logger = new Logger(TelegramSettingsService.name);

  constructor(
    @InjectRepository(TelegramSettings)
    private telegramSettingsRepository: Repository<TelegramSettings>,
    private messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * Получает настройки Telegram
   */
  async getTelegramSettings(userId: string): Promise<TelegramSettings | null> {
    return this.telegramSettingsRepository.findOne({
      where: { user_id: userId },
    });
  }

  /**
   * Включает Telegram
   */
  // async enableTelegram(userId: string): Promise<void> {
  //   await this.upsertTelegramSettings(userId, { isEnabled: true });
  // }

  /**
   * Отключает Telegram
   */
  // async disableTelegram(userId: string): Promise<void> {
  //   await this.upsertTelegramSettings(userId, { isEnabled: false });
  // }

  /**
   * Обновляет настройки Telegram
   */
  async updateTelegramSettings(
    userId: string,
    settings: UpdateTelegramSettingsDto,
  ): Promise<void> {
    await this.upsertTelegramSettings(userId, {
      isEnabled: settings.isEnabled,
    });
    await this.messageTemplateService.updateTemplate(
      userId,
      settings.messageTemplate,
      settings.isEnabled,
      TemplateType.TELEGRAM,
    );
  }

  /**
   * Удаляет настройки Telegram
   */
  async deleteTelegramSettings(userId: string): Promise<void> {
    await this.telegramSettingsRepository.delete({ user_id: userId });
  }

  /**
   * Создает или обновляет настройки Telegram
   */
  private async upsertTelegramSettings(
    userId: string,
    updateData: Partial<TelegramSettings>,
  ): Promise<void> {
    const existing = await this.telegramSettingsRepository.findOne({
      where: { user_id: userId },
    });

    if (existing) {
      await this.telegramSettingsRepository.update(
        { user_id: userId },
        updateData,
      );
    } else {
      const newRecord = this.telegramSettingsRepository.create({
        user_id: userId,
        isEnabled: false,
        ...updateData,
      });
      await this.telegramSettingsRepository.save(newRecord);
    }
  }
}
