import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { IEmbeddingService } from '../interfaces/embedding-service.interface';

/**
 * OpenAI 向量嵌入服务
 * 
 * @Injectable() - 标记为可注入的服务类
 * implements IEmbeddingService - 实现嵌入服务接口
 * 
 * 职责：
 * - 使用 OpenAI text-embedding-ada-002 模型
 * - 支持 OpenAI 兼容的 API（如 DeepSeek）
 */
@Injectable()
export class OpenAIEmbeddingService implements IEmbeddingService {
  private readonly logger = new Logger(OpenAIEmbeddingService.name);
  private embeddings: OpenAIEmbeddings;
  private readonly dimension = 1536; // text-embedding-ada-002 的维度

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const baseURL = this.configService.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
    const modelName = this.configService.get<string>('EMBEDDING_MODEL') || 'text-embedding-ada-002';

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAIEmbeddingService');
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      configuration: {
        baseURL,
      },
      modelName,
    });

    this.logger.log(`OpenAIEmbeddingService initialized with model: ${modelName}`);
  }

  /**
   * 生成单个文本的向量嵌入
   */
  async embed(text: string): Promise<number[]> {
    try {
      this.logger.debug(`Generating embedding for text: ${text.substring(0, 50)}...`);
      const result = await this.embeddings.embedQuery(text);
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`, error.stack);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * 批量生成文本的向量嵌入
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      this.logger.debug(`Generating embeddings for ${texts.length} texts`);
      const results = await this.embeddings.embedDocuments(texts);
      return results;
    } catch (error) {
      this.logger.error(`Failed to generate batch embeddings: ${error.message}`, error.stack);
      throw new Error(`Batch embedding generation failed: ${error.message}`);
    }
  }

  /**
   * 获取向量维度
   */
  getDimension(): number {
    return this.dimension;
  }
}
