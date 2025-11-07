import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Webhook } from './webhook.entity';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PublicWebhookController } from './public-webhook.controller';
import { WebhookProcessor } from './webhook.processor';
import { WebhookDeduplicationService } from './webhook-deduplication.service';
import { ApiKeyModule } from '../api-key/api-key.module';
import { ApiKey } from '../api-key/api-key.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MessageFieldsModule } from 'src/message-fields/message-fields.module';
import { MessageSettingsModule } from 'src/message-settings/message-settings.module';
import { TaskModule } from 'src/task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, ApiKey]),
    BullModule.registerQueue({
      name: 'webhooks',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Хранить последние 100 завершенных задач
        removeOnFail: false, // Не удалять неудачные задачи для анализа
      },
    }),
    ApiKeyModule,
    MessageFieldsModule,
    MessageSettingsModule,
    TaskModule,
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
  providers: [WebhookService, WebhookProcessor, WebhookDeduplicationService],
  exports: [WebhookService],
})
export class WebhookModule {}
