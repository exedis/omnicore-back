import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WebhookModule } from './webhook/webhook.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { MessageTemplateModule } from './message-template/message-template.module';
import { BoardModule } from './board/board.module';
import { TaskModule } from './task/task.module';
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
import { Board } from './board/board.entity';
import { BoardMember } from './board/board-member.entity';
import { BoardColumn } from './board/board-column.entity';
import { Task } from './task/task.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
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
        Board,
        BoardMember,
        BoardColumn,
        Task,
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
    BoardModule,
    TaskModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
