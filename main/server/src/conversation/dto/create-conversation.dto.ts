import { IsOptional, IsString, IsEnum, IsObject, ValidateNested } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(['active', 'completed', 'failed'])
  status?: 'active' | 'completed' | 'failed';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
