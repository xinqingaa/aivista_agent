/**
 * 图片生成服务接口
 * 
 * 定义图片生成服务的标准接口，支持文生图和局部重绘功能
 * 类似 ILlmService 的设计，提供统一的接口抽象
 */

/**
 * 文生图选项
 */
export interface ImageGenerationOptions {
  model?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';
  size?: string; // 图片尺寸，如 "1024x1024", "1024x768" 等
  n?: number; // 生成图片数量（默认 1）
  prompt_extend?: boolean; // 提示词扩展（z-image-turbo 默认 false）
  watermark?: boolean; // 是否添加水印（默认 false）
  negative_prompt?: string; // 反向提示词
}

/**
 * 图片编辑选项（局部重绘）
 */
export interface ImageEditOptions {
  model?: 'qwen-image-edit-plus';
  imageUrl: string; // 原图 URL
  maskBase64: string; // 蒙版 Base64 编码
  size?: string; // 图片尺寸
}

/**
 * 图片生成服务接口
 * 
 * 提供文生图和局部重绘两个核心功能
 * 支持四个独立的模型方法，方便切换不同模型
 */
export interface IImageService {
  /**
   * 文生图（统一入口，根据配置或 options.model 选择模型）
   * 
   * @param prompt - 图片生成提示词
   * @param options - 生成选项（模型、尺寸、数量等）
   * @returns 生成的图片 URL
   */
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string>;

  /**
   * 使用 qwen-image 模型生成图片
   * 
   * @param prompt - 图片生成提示词
   * @param options - 生成选项（不包含 model）
   * @returns 生成的图片 URL
   */
  generateImageQwenImage(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string>;

  /**
   * 使用 qwen-image-max 模型生成图片
   * 
   * @param prompt - 图片生成提示词
   * @param options - 生成选项（不包含 model）
   * @returns 生成的图片 URL
   */
  generateImageQwenImageMax(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string>;

  /**
   * 使用 qwen-image-plus 模型生成图片
   * 
   * @param prompt - 图片生成提示词
   * @param options - 生成选项（不包含 model）
   * @returns 生成的图片 URL
   */
  generateImageQwenImagePlus(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string>;

  /**
   * 使用 z-image-turbo 模型生成图片
   * 
   * @param prompt - 图片生成提示词
   * @param options - 生成选项（不包含 model，prompt_extend 默认为 false）
   * @returns 生成的图片 URL
   */
  generateImageZImageTurbo(
    prompt: string,
    options?: Omit<ImageGenerationOptions, 'model'>,
  ): Promise<string>;

  /**
   * 局部重绘（图片编辑）
   * 
   * @param prompt - 编辑提示词
   * @param options - 编辑选项（原图 URL、蒙版数据等）
   * @returns 编辑后的图片 URL
   */
  editImage(prompt: string, options: ImageEditOptions): Promise<string>;
}
