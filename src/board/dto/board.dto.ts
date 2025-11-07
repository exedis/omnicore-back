import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
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
