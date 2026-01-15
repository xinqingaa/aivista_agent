import { IsOptional, IsString, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 更新风格 DTO
 * 支持部分更新，所有字段都是可选的
 */
export class UpdateStyleDto {
  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional() 
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}