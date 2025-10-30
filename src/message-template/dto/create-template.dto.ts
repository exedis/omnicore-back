import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { TemplateType } from '@type/settings';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsEnum(TemplateType)
  type: TemplateType;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsString()
  template: string;
}
