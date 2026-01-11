import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IImageService,
  ImageGenerationOptions,
  ImageEditOptions,
} from '../interfaces/image-service.interface';

/**
 * 阿里云图片生成服务实现
 * 
 * 使用 HTTP 请求调用阿里云 DashScope 图片生成 API
 * 支持四个模型：qwen-image、qwen-image-max、qwen-image-plus、z-image-turbo
 * 支持文生图和局部重绘功能
 * 
 * @Injectable() - 标记为可注入的服务
 */
@Injectable()
export class AliyunImageService implements IImageService {
  private readonly logger = new Logger(AliyunImageService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly endpoint: string;
  private readonly fullEndpoint: string;
  private readonly defaultModel: string;
  private readonly defaultSize: string;
  private readonly defaultPromptExtend: boolean;
  private readonly defaultWatermark: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DASHSCOPE_API_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('DASHSCOPE_BASE_URL') ||
      'https://dashscope.aliyuncs.com/api/v1';
    this.endpoint =
      this.configService.get<string>('DASHSCOPE_IMAGE_ENDPOINT') ||
      '/services/aigc/multimodal-generation/generation';
    this.fullEndpoint = `${this.baseUrl}${this.endpoint}`;
    this.defaultModel =
      this.configService.get<string>('ALIYUN_IMAGE_MODEL') || 'qwen-image-plus';
    this.defaultSize =
      this.configService.get<string>('ALIYUN_IMAGE_SIZE') || '1024x1024';
    this.defaultPromptExtend =
      this.configService.get<boolean>('ALIYUN_IMAGE_PROMPT_EXTEND') ?? true;
    this.defaultWatermark =
      this.configService.get<boolean>('ALIYUN_IMAGE_WATERMARK') ?? false;

    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY is required for AliyunImageService');
    }

    this.logger.log(
      `AliyunImageService initialized - endpoint: ${this.fullEndpoint}, default model: ${this.defaultModel}`,
    );
  }

  /**
   * 文生图（统一入口，根据配置或 options.model 选择模型）
   */
  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<string> {
    const model =
      options?.model ||
      (this.configService.get<string>('ALIYUN_IMAGE_MODEL') as
        | 'qwen-image'
        | 'qwen-image-max'
        | 'qwen-image-plus'
        | 'z-image-turbo') ||
      'qwen-image-plus';

    return this.generateImageInternal(model, prompt, options);
  }

  /**
   * 使用 qwen-image 模型生成图片
   */
  async generateImageQwenImage(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    return this.generateImageInternal('qwen-image', prompt, options);
  }

  /**
   * 使用 qwen-image-max 模型生成图片
   */
  async generateImageQwenImageMax(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    return this.generateImageInternal('qwen-image-max', prompt, options);
  }

  /**
   * 使用 qwen-image-plus 模型生成图片
   */
  async generateImageQwenImagePlus(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    return this.generateImageInternal('qwen-image-plus', prompt, options);
  }

  /**
   * 使用 z-image-turbo 模型生成图片
   * 注意：z-image-turbo 默认 prompt_extend=false
   */
  async generateImageZImageTurbo(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    // z-image-turbo 默认 prompt_extend=false
    return this.generateImageInternal('z-image-turbo', prompt, {
      ...options,
      prompt_extend: options?.prompt_extend ?? false,
    });
  }

  /**
   * 内部实现方法（提取公共逻辑）
   * 
   * 处理不同模型的参数差异：
   * - qwen-image、qwen-image-max、qwen-image-plus: prompt_extend=true（默认）
   * - z-image-turbo: prompt_extend=false（默认）
   */
  private async generateImageInternal(
    model: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo',
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string> {
    this.logger.log(
      `Generating image with model: ${model}, prompt: ${prompt.substring(0, 50)}...`,
    );

    try {
      const size = (options?.size || this.defaultSize).replace('x', '*'); // DashScope 使用 * 分隔尺寸
      const n = options?.n || 1;

      // 根据模型确定 prompt_extend 默认值
      const defaultPromptExtend =
        model === 'z-image-turbo' ? false : this.defaultPromptExtend;
      const promptExtend = options?.prompt_extend ?? defaultPromptExtend;
      const watermark = options?.watermark ?? this.defaultWatermark;
      const negativePrompt = options?.negative_prompt || '';

      // 构建请求体
      const requestBody = {
        model: model,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        parameters: {
          size: size,
          n: n,
          result_format: 'message',
          stream: false,
          watermark: watermark,
          prompt_extend: promptExtend,
          negative_prompt: negativePrompt,
        },
      };

      // 发送 HTTP 请求
      const response = await fetch(this.fullEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // 检查 HTTP 状态码
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `HTTP error: ${response.status} ${response.statusText}, body: ${errorText}`,
        );
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. ${errorText}`,
        );
      }

      const data = await response.json();

      // 检查 API 错误码
      if (data.code && data.code !== 'Success') {
        this.logger.error(
          `API error: code=${data.code}, message=${data.message}`,
        );
        throw new Error(`API error: ${data.code} - ${data.message}`);
      }

      // 提取图片 URL
      // 根据实际响应格式处理（可能需要调整）
      let imageUrl: string | undefined;

      // 尝试多种可能的响应格式
      if (data.output?.results && data.output.results.length > 0) {
        // 格式 1: output.results[0].url
        imageUrl = data.output.results[0].url;
      } else if (data.output?.images && data.output.images.length > 0) {
        // 格式 2: output.images[0].url
        imageUrl = data.output.images[0].url;
      } else if (data.output?.choices && data.output.choices.length > 0) {
        // 格式 3: output.choices[0].message.content (可能包含图片)
        const content = data.output.choices[0].message?.content;
        if (Array.isArray(content)) {
          const imageContent = content.find((item: any) => item.image);
          if (imageContent?.image) {
            imageUrl = imageContent.image;
          }
        }
      }

      if (!imageUrl) {
        this.logger.error(`Unexpected response format: ${JSON.stringify(data)}`);
        throw new Error('No image URL found in response');
      }

      this.logger.log(`Image generated successfully: ${imageUrl}`);
      return imageUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate image: ${error.message}`,
        error.stack,
      );
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  /**
   * 局部重绘（图片编辑）
   * 
   * 使用 HTTP 请求调用 DashScope 图片编辑 API
   * 注意：qwen-image-edit-plus 可能使用相同的多模态生成接口，但需要传入 image 和 mask 参数
   */
  async editImage(prompt: string, options: ImageEditOptions): Promise<string> {
    this.logger.log(
      `Editing image with model: ${options.model || 'qwen-image-edit-plus'}, prompt: ${prompt.substring(0, 50)}...`,
    );

    try {
      const model = options.model || 'qwen-image-edit-plus';
      const size = (options.size || this.defaultSize).replace('x', '*'); // DashScope 使用 * 分隔尺寸

      // 构建请求体
      // 图片编辑需要传入原图和蒙版
      // 根据 API 文档，支持传入 1-3 张图片
      // 蒙版可以使用 data URL 格式（data:image/png;base64,xxx）或图片 URL
      const requestBody = {
        model: model,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  image: options.imageUrl, // 原图 URL
                },
                {
                  // 蒙版：如果 maskBase64 是完整的 data URL，直接使用；否则添加前缀
                  image: options.maskBase64.startsWith('data:')
                    ? options.maskBase64
                    : `data:image/png;base64,${options.maskBase64}`,
                },
                {
                  text: prompt, // 编辑提示词
                },
              ],
            },
          ],
        },
        parameters: {
          n: 1, // 生成图片数量
          size: size,
          result_format: 'message',
          stream: false,
          watermark: false,
          prompt_extend: true,
          negative_prompt: '',
        },
      };

      // 发送 HTTP 请求
      const response = await fetch(this.fullEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // 检查 HTTP 状态码
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `HTTP error: ${response.status} ${response.statusText}, body: ${errorText}`,
        );
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. ${errorText}`,
        );
      }

      const data = await response.json();

      // 检查 API 错误码
      if (data.code && data.code !== 'Success') {
        this.logger.error(
          `API error: code=${data.code}, message=${data.message}`,
        );
        throw new Error(`API error: ${data.code} - ${data.message}`);
      }

      // 提取图片 URL
      // 根据实际响应格式处理（可能需要调整）
      let imageUrl: string | undefined;

      // 尝试多种可能的响应格式
      if (data.output?.results && data.output.results.length > 0) {
        // 格式 1: output.results[0].url
        imageUrl = data.output.results[0].url;
      } else if (data.output?.images && data.output.images.length > 0) {
        // 格式 2: output.images[0].url
        imageUrl = data.output.images[0].url;
      } else if (data.output?.choices && data.output.choices.length > 0) {
        // 格式 3: output.choices[0].message.content (可能包含图片)
        const content = data.output.choices[0].message?.content;
        if (Array.isArray(content)) {
          const imageContent = content.find((item: any) => item.image);
          if (imageContent?.image) {
            imageUrl = imageContent.image;
          }
        }
      }

      if (!imageUrl) {
        this.logger.error(`Unexpected response format: ${JSON.stringify(data)}`);
        throw new Error('No image URL found in response');
      }

      this.logger.log(`Image edited successfully: ${imageUrl}`);
      return imageUrl;
    } catch (error) {
      this.logger.error(`Failed to edit image: ${error.message}`, error.stack);
      throw new Error(`Image editing failed: ${error.message}`);
    }
  }
}
