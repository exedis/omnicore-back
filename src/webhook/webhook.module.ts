import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from './webhook.entity';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PublicWebhookController } from './public-webhook.controller';
import { ApiKeyModule } from '../api-key/api-key.module';
import { SocialModule } from '../social/social.module';
import { SenderModule } from '../sender/sender.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MessageFieldsModule } from 'src/message-fields/message-fields.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook]),
    ApiKeyModule,
    SocialModule,
    MessageFieldsModule,
    SenderModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WebhookController, PublicWebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
