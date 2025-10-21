import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WebhookModule } from './webhook/webhook.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { SocialModule } from './social/social.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { MessageTemplateModule } from './message-template/message-template.module';
import { User } from './user/user.entity';
import { Webhook } from './webhook/webhook.entity';
import { ApiKey } from './api-key/api-key.entity';
import { SocialMessage } from './social/social-message.entity';
import { TelegramAuthToken } from './telegram-bot/telegram-auth-token.entity';
import { MessageTemplate } from './message-template/message-template.entity';

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
        SocialMessage,
        TelegramAuthToken,
        MessageTemplate,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UserModule,
    WebhookModule,
    ApiKeyModule,
    SocialModule,
    TelegramBotModule,
    MessageTemplateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
