import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FieldGroupEntity } from './field-group.entity';
import { User } from '../user/user.entity';
import { FieldGroupService } from './field-group.service';
import { FieldGroupController } from './field-group.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([FieldGroupEntity, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [FieldGroupController],
  providers: [FieldGroupService],
  exports: [FieldGroupService],
})
export class FieldGroupModule {}
