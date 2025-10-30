import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageTemplate } from './message-template.entity';
import { User } from '../auth/user.entity';
import { MessageTemplateService } from './message-template.service';
import { MessageTemplateController } from './message-template.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageFieldsModule } from 'src/message-fields/message-fields.module';
import { TelegramSettings } from 'src/message-settings/telegram/telegram-settings.entity';
import { EmailSettings } from 'src/message-settings/email/email-settings.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageTemplate,
      User,
      TelegramSettings,
      EmailSettings,
    ]),
    MessageFieldsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MessageTemplateController],
  providers: [MessageTemplateService],
  exports: [MessageTemplateService],
})
export class MessageTemplateModule {}
