import { IsArray, IsString } from 'class-validator';

/**
 * 批量删除风格 DTO
 * 用于批量删除多个风格
 */
export class DeleteStylesDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}