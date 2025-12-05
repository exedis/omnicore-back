import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './guards/jwt-auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { TelegramSettings } from '../message-settings/telegram/telegram-settings.entity';
import { EmailSettings } from '../message-settings/email/email-settings.entity';
import { MessageTemplate } from '../message-template/message-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      TelegramSettings,
      EmailSettings,
      MessageTemplate,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
