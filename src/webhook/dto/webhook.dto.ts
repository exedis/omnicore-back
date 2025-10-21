import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  siteName: string;

  @IsString()
  @IsNotEmpty()
  formName: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsObject()
  @IsOptional()
  advertisingParams?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class WebhookQueryDto {
  @IsString()
  @IsOptional()
  siteName?: string;

  @IsString()
  @IsOptional()
  formName?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
