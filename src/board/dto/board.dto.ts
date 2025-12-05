import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BoardRole } from '../board-member.entity';

export class CreateBoardDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateBoardDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class InviteMemberDto {
  @IsString()
  email: string;

  @IsEnum(BoardRole)
  @IsOptional()
  role?: BoardRole;
}

export class RemoveMemberDto {
  @IsUUID()
  userId: string;
}

export class BoardColumnUpdateDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  position?: number;

  @IsOptional()
  @IsUUID()
  boardId?: string;

  @IsOptional()
  createdAt?: string;

  @IsOptional()
  updatedAt?: string;
}

export class UpdateBoardWithColumnsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardColumnUpdateDto)
  columns: BoardColumnUpdateDto[];
}
