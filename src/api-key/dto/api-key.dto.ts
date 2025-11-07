import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // board_id создается автоматически вместе с доской
}

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // board_id нельзя изменить после создания
}

export class ApiKeyResponseDto {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
