import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramBotApiController } from './telegram-bot-api.controller';
import { User } from '../auth/user.entity';
import { TelegramAuthToken } from './telegram-auth-token.entity';
import { JwtModule } from '@nestjs/jwt';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramSettings } from 'src/message-settings/telegram/telegram-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TelegramAuthToken, TelegramSettings]),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TelegramBotApiController],
  providers: [TelegramBotService, TelegramBotController],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
