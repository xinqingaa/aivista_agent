import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmbeddingService } from '../interfaces/embedding-service.interface';
import { AliyunEmbeddingService } from './aliyun-embedding.service';
import { OpenAIEmbeddingService } from './openai-embedding.service';

/**
 * Embedding 服务提供商工厂
 * 
 * @Injectable() - 标记为可注入的服务类
 * 
 * 职责：
 * - 根据环境变量 EMBEDDING_PROVIDER 动态创建对应的 Embedding 服务
 * - 支持多 provider 切换（阿里云、OpenAI、DeepSeek）
 * - 延迟初始化：只在需要时创建服务实例，避免未使用的服务要求 API key
 */
@Injectable()
export class EmbeddingProviderFactory {
  private cachedService: IEmbeddingService | null = null;

  constructor(private configService: ConfigService) {}

  /**
   * 创建 Embedding 服务实例
   * 
   * 根据 EMBEDDING_PROVIDER 环境变量选择对应的服务：
   * - 'aliyun' -> AliyunEmbeddingService
   * - 'openai' -> OpenAIEmbeddingService（也支持 DeepSeek，使用兼容的 OpenAI API）
   * 
   * 默认使用 LLM_PROVIDER 的值（如果 EMBEDDING_PROVIDER 未设置）
   * 
   * 使用缓存机制，确保同一 provider 只创建一次实例
   */
  create(): IEmbeddingService {
    if (this.cachedService) {
      return this.cachedService;
    }

    // 优先使用 EMBEDDING_PROVIDER，如果没有则使用 LLM_PROVIDER
    const embeddingProvider = this.configService.get<string>('EMBEDDING_PROVIDER');
    const llmProvider = this.configService.get<string>('LLM_PROVIDER') || 'aliyun';
    const provider = embeddingProvider || llmProvider;

    switch (provider.toLowerCase()) {
      case 'aliyun':
        this.cachedService = new AliyunEmbeddingService(this.configService);
        break;
      case 'openai':
      case 'deepseek':
        // DeepSeek 使用 OpenAI 兼容的 API
        this.cachedService = new OpenAIEmbeddingService(this.configService);
        break;
      default:
        throw new Error(`Unsupported Embedding provider: ${provider}`);
    }

    return this.cachedService;
  }
}
