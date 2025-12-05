import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Task } from './task.entity';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { BoardModule } from '../board/board.module';
import { BoardColumn } from '../board/board-column.entity';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { ApiKey } from '../api-key/api-key.entity';
import { BoardMember } from '../board/board-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, BoardColumn, ApiKey, BoardMember]),
    BoardModule,
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
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
