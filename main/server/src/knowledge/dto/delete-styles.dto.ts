import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

/**
 * 批量删除风格 DTO
 * 用于批量删除多个风格
 */
export class DeleteStylesDto {
  @ApiProperty({
    description: '风格 ID 列表',
    example: ['style_001', 'style_002'],
    required: true,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}