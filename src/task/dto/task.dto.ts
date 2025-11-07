import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsObject,
  IsInt,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '../task.entity';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsUUID()
  boardId: string;

  @IsUUID()
  @IsOptional()
  columnId?: string;

  @IsUUID()
  @IsOptional()
  apiKeyId?: string;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsUUID()
  @IsOptional()
  columnId?: string;

  @IsInt()
  @IsOptional()
  position?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class MoveTaskDto {
  @IsUUID()
  column_id: string;

  @IsInt()
  @IsOptional()
  position?: number;
}

export class TaskQueryDto {
  @IsUUID()
  @IsOptional()
  boardId?: string;

  @IsUUID()
  @IsOptional()
  apiKeyId?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
