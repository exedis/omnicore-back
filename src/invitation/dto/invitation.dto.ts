import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID()
  apiKeyId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number; // Срок действия в днях (по умолчанию 7)
}

export class AcceptInvitationDto {
  // Token передается в URL, не в body
}
