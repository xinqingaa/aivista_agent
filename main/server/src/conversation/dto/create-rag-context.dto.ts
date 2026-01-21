import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class CreateRAGContextDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsNotEmpty()
  @IsString()
  originalPrompt: string;

  @IsObject()
  retrievedContext: any;

  @IsNotEmpty()
  @IsString()
  finalPrompt: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
