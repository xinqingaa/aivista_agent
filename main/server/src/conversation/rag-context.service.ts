import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RAGContext } from './entities/rag-context.entity';
import { CreateRAGContextDto } from './dto/create-rag-context.dto';

/**
 * RAG 上下文服务
 * 存储 RAG 检索的详细信息
 */
@Injectable()
export class RAGContextService {
  private readonly logger = new Logger(RAGContextService.name);

  constructor(
    @InjectRepository(RAGContext)
    private readonly ragContextRepo: Repository<RAGContext>,
  ) {}

  /**
   * 创建 RAG 上下文
   */
  async create(dto: CreateRAGContextDto): Promise<RAGContext> {
    const context = this.ragContextRepo.create({
      id: `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: dto.conversationId,
      messageId: dto.messageId,
      originalPrompt: dto.originalPrompt,
      retrievedContext: dto.retrievedContext,
      finalPrompt: dto.finalPrompt,
      metadata: dto.metadata || {},
      timestamp: Date.now(),
    });

    return await this.ragContextRepo.save(context);
  }

  /**
   * 根据会话 ID 查找所有 RAG 上下文
   */
  async findByConversationId(conversationId: string): Promise<RAGContext[]> {
    return await this.ragContextRepo.find({
      where: { conversationId },
      order: { timestamp: 'ASC' },
    });
  }
}
