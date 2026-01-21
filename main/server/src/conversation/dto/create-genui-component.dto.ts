import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateGenUIComponentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsString()
  widgetType: string;

  @IsObject()
  props: Record<string, any>;

  @IsOptional()
  @IsEnum(['append', 'replace', 'update'])
  updateMode?: 'append' | 'replace' | 'update';

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
