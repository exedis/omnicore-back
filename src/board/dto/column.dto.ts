import { IsString, IsOptional, IsInt, IsHexColor } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  position?: number;
}

export class UpdateColumnDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  position?: number;
}

export class ReorderColumnsDto {
  @IsString({ each: true })
  columnIds: string[]; // Массив ID колонок в нужном порядке
}
