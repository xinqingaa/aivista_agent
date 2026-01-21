import { IsOptional, IsString, IsEnum, IsObject } from 'class-validator';
import { CreateConversationDto } from './create-conversation.dto';

export class UpdateConversationDto {
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
