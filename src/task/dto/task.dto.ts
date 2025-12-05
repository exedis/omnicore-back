import { IsString, IsOptional, IsUUID, IsEnum, IsInt } from 'class-validator';
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

  @IsInt()
  @IsOptional()
  position?: number;

  @IsUUID()
  @IsOptional()
  responsibleId?: string;
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

  @IsString()
  @IsOptional()
  responsibleId?: string;
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
