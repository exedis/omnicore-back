import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { SocialModule } from '../social/social.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SenderService } from './sender.service';
import { SenderController } from './sender.controller';
import { Webhook } from '../webhook/webhook.entity';
import { User } from '../user/user.entity';
import { SocialMessage } from '../social/social-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, User, SocialMessage]),
    TelegramBotModule,
    SocialModule,
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
  controllers: [SenderController],
  providers: [SenderService],
  exports: [SenderService],
})
export class SenderModule {}
