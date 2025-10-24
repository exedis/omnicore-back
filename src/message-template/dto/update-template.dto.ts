import { IsString } from 'class-validator';

export class UpdateTemplateDto {
  @IsString()
  messageTemplate?: string;
}
