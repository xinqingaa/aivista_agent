import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsEnum(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
