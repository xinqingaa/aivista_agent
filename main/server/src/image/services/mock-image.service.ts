import { Injectable, Logger } from '@nestjs/common';
import {
  IImageService,
  ImageGenerationOptions,
  ImageEditOptions,
} from '../interfaces/image-service.interface';

/**
 * Mock 图片生成服务
 * 
 * 保持现有的 Mock 逻辑，用于测试和开发环境
 * 返回 picsum.photos 的随机图片 URL
 * 
 * @Injectable() - 标记为可注入的服务
 */
@Injectable()
export class MockImageService implements IImageService {
  private readonly logger = new Logger(MockImageService.name);

  /**
   * 文生图（Mock 实现）
   * 
   * 基于 Prompt 的哈希值生成固定的图片 URL
   * 模拟 2-3 秒延迟
   */
  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<string> {
    this.logger.log(
      `[Mock] Generating image with prompt: ${prompt.substring(0, 50)}...`,
    );

    // 模拟延迟（2-3 秒）
    const delay = 2000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 生成随机种子（基于 Prompt 的哈希值，确保相同 Prompt 返回相同图片）
    const seed = this.hashString(prompt);
    const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;

    this.logger.log(`[Mock] Generated image URL: ${imageUrl}`);

    return imageUrl;
  }

  /**
   * 使用 qwen-image 模型生成图片（Mock 实现）
   */
  async generateImageQwenImage(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    return this.generateImage(prompt, { ...options, model: 'qwen-image' });
  }

  /**
   * 使用 qwen-image-max 模型生成图片（Mock 实现）
   */
  async generateImageQwenImageMax(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    return this.generateImage(prompt, { ...options, model: 'qwen-image-max' });
  }

  /**
   * 使用 qwen-image-plus 模型生成图片（Mock 实现）
   */
  async generateImageQwenImagePlus(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    return this.generateImage(prompt, { ...options, model: 'qwen-image-plus' });
  }

  /**
   * 使用 z-image-turbo 模型生成图片（Mock 实现）
   */
  async generateImageZImageTurbo(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    return this.generateImage(prompt, { ...options, model: 'z-image-turbo' });
  }

  /**
   * 局部重绘（Mock 实现）
   * 
   * 基于 Prompt 和原图 URL 的哈希值生成新的图片 URL
   * 模拟 2-3 秒延迟
   */
  async editImage(prompt: string, options: ImageEditOptions): Promise<string> {
    this.logger.log(
      `[Mock] Editing image with prompt: ${prompt.substring(0, 50)}...`,
    );

    // 模拟延迟（2-3 秒）
    const delay = 2000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 基于 Prompt、原图 URL 和蒙版数据生成新的种子
    const combinedString = `${prompt}_${options.imageUrl}_${options.maskBase64.substring(0, 20)}`;
    const seed = this.hashString(combinedString);
    const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;

    this.logger.log(`[Mock] Edited image URL: ${imageUrl}`);

    return imageUrl;
  }

  /**
   * 字符串哈希函数
   * 
   * 将字符串转换为数字种子，用于生成固定的图片 URL
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }
}
