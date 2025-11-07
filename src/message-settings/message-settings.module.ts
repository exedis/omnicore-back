import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramSettings } from './telegram/telegram-settings.entity';
import { User } from '../auth/user.entity';
import { Webhook } from '../webhook/webhook.entity';
import { MessageSettingsService } from './message-settings.service';
import { MessageSettingsController } from './message-settings.controller';
import { TelegramSenderService } from './telegram/telegram-sender.service';
import { EmailSenderService } from './email/email-sender.service';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { EmailService } from './email/email.service';
import { EmailSettings } from './email/email-settings.entity';
import { JwtModule } from '@nestjs/jwt';
import { EmailSettingsService } from './email/email-settings.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramSettingsService } from './telegram/telegram-settings.service';
import { MessageTemplate } from '../message-template/message-template.entity';
import { TaskSettingsService } from './task/task-settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelegramSettings,
      EmailSettings,
      User,
      Webhook,
      MessageTemplate,
    ]),
    TelegramBotModule,
    MessageTemplateModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessageSettingsController],
  providers: [
    MessageSettingsService,
    TelegramSenderService,
    EmailSenderService,
    EmailService,
    EmailSettingsService,
    TelegramSettingsService,
    TaskSettingsService,
  ],
  exports: [
    MessageSettingsService,
    TelegramSenderService,
    EmailSenderService,
    EmailSettingsService,
  ],
})
export class MessageSettingsModule {}
