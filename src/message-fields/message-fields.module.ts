import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageFields } from './message-fields.entity';
import { MessageFieldsService } from './message-fields.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageFields, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  // controllers: [MessageFieldsController],
  providers: [MessageFieldsService],
  exports: [MessageFieldsService],
})
export class MessageFieldsModule {}
