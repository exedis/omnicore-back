import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WebhookModule } from './webhook/webhook.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { MessageTemplateModule } from './message-template/message-template.module';
import { User } from './auth/user.entity';
import { Webhook } from './webhook/webhook.entity';
import { ApiKey } from './api-key/api-key.entity';
import { TelegramAuthToken } from './telegram-bot/telegram-auth-token.entity';
import { MessageTemplate } from './message-template/message-template.entity';
import { MessageFields } from './message-fields/message-fields.entity';
import { MessageFieldsModule } from './message-fields/message-fields.module';
import { MessageSettingsModule } from './message-settings/message-settings.module';
import { TelegramSettings } from './message-settings/telegram/telegram-settings.entity';
import { EmailSettings } from './message-settings/email/email-settings.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [
        User,
        Webhook,
        ApiKey,
        TelegramAuthToken,
        MessageTemplate,
        MessageFields,
        TelegramSettings,
        EmailSettings,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    WebhookModule,
    ApiKeyModule,
    MessageSettingsModule,
    TelegramBotModule,
    MessageTemplateModule,
    MessageFieldsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
