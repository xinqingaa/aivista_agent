import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlibabaTongyiEmbeddings } from '@langchain/community/embeddings/alibaba_tongyi';
import { IEmbeddingService } from '../interfaces/embedding-service.interface';

/**
 * 阿里云通义千问向量嵌入服务
 * 
 * @Injectable() - 标记为可注入的服务类
 * implements IEmbeddingService - 实现嵌入服务接口
 * 
 * 职责：
 * - 使用阿里云 DashScope text-embedding-v1 模型
 * - 提供向量嵌入生成功能
 */
@Injectable()
export class AliyunEmbeddingService implements IEmbeddingService {
  private readonly logger = new Logger(AliyunEmbeddingService.name);
  private embeddings: AlibabaTongyiEmbeddings;
  private readonly dimension = 1536; // text-embedding-v1 的维度

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    const modelName = (this.configService.get<string>('ALIYUN_EMBEDDING_MODEL') || 'text-embedding-v1') as
      | 'text-embedding-v1'
      | 'text-embedding-v2'
      | 'text-embedding-v3'
      | 'text-embedding-v4'
      | 'multimodal-embedding-v1';

    if (!apiKey) {
      throw new Error('DASHSCOPE_API_KEY is required for AliyunEmbeddingService');
    }

    this.embeddings = new AlibabaTongyiEmbeddings({
      apiKey,
      modelName,
    });

    this.logger.log(`AliyunEmbeddingService initialized with model: ${modelName}`);
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
