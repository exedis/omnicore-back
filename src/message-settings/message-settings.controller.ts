import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UserId } from '../common/decorators/user-id.decorator';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageSettingsService } from './message-settings.service';
import { UpdateTelegramSettingsDto } from './dto/update-telegram-settings.dto';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { EmailSettingsService } from './email/email-settings.service';
import { TelegramSettingsService } from './telegram/telegram-settings.service';

@Controller('message-settings')
@UseGuards(AuthGuard)
export class MessageSettingsController {
  constructor(
    private readonly messageSettingsService: MessageSettingsService,
    private readonly emailSettingsService: EmailSettingsService,
    private readonly telegramSettingsService: TelegramSettingsService,
  ) {}

  // ==================== Общие настройки ====================

  @Get('/notification-status')
  async getNotificationStatus(@UserId() userId: string) {
    return this.messageSettingsService.getNotificationStatus(userId);
  }

  // ==================== Telegram настройки ====================

  @Get('/telegram')
  async getTelegramSettings(@UserId() userId: string) {
    return this.telegramSettingsService.getTelegramSettings(userId);
  }

  @Post('/telegram/enable')
  async enableTelegram(@UserId() userId: string) {
    return this.telegramSettingsService.enableTelegram(userId);
  }

  @Post('/telegram/disable')
  async disableTelegram(@UserId() userId: string) {
    return this.telegramSettingsService.disableTelegram(userId);
  }

  @Post('/telegram/update')
  async updateTelegramSettings(
    @UserId() userId: string,
    @Body() settings: UpdateTelegramSettingsDto,
  ) {
    return this.telegramSettingsService.updateTelegramSettings(
      userId,
      settings,
    );
  }

  // ==================== Email настройки ====================

  @Get('/email')
  async getEmailSettings(@UserId() userId: string) {
    return this.emailSettingsService.getEmailSettings(userId);
  }

  @Post('/email/enable')
  async enableEmail(@UserId() userId: string) {
    return this.emailSettingsService.enableEmail(userId);
  }

  @Post('/email/disable')
  async disableEmail(@UserId() userId: string) {
    return this.emailSettingsService.disableEmail(userId);
  }

  @Post('/email/update')
  async updateEmailSettings(
    @UserId() userId: string,
    @Body() settings: UpdateEmailSettingsDto,
  ) {
    return this.emailSettingsService.updateEmailSettings(userId, settings);
  }
}
