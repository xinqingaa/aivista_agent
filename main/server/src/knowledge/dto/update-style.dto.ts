import { IsOptional, IsString, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新风格 DTO
 * 支持部分更新，所有字段都是可选的
 */
export class UpdateStyleDto {
  @ApiProperty({
    description: '风格名称',
    example: 'Cyberpunk',
    required: false
  })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiProperty({
    description: '风格提示词',
    example: 'neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic, vibrant colors, urban decay',
    required: false
  })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiProperty({
    description: '风格描述',
    example: '赛博朋克风格：霓虹灯、高科技、低生活、未来主义城市背景',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '标签列表',
    example: ['cyberpunk', 'futuristic', 'neon'],
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: '元数据',
    example: { category: 'digital', popularity: 85 },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}