import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';

/**
 * 会话服务
 * 处理会话的 CRUD 操作
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
  ) {}

  /**
   * 创建新会话
   */
  async create(dto: CreateConversationDto): Promise<Conversation> {
    const conversation = this.conversationRepo.create({
      id: dto.id || this.generateId(),
      title: dto.title || '新对话',
      status: dto.status || 'active',
      metadata: dto.metadata || {},
    });

    return await this.conversationRepo.save(conversation);
  }

  /**
   * 根据 ID 查找会话（包含关联数据）
   */
  async findById(id: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: ['messages', 'messages.components', 'deletedAt'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return conversation;
  }

  /**
   * 查找所有会话
   */
  async findAll(options: { limit?: number; offset?: number } = {}): Promise<Conversation[]> {
    const { limit = 20, offset = 0 } = options;

    return await this.conversationRepo.find({
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
      select: ['id', 'title', 'status', 'createdAt', 'updatedAt'], // 只返回基础信息，不包含消息
    });
  }

  /**
   * 更新会话
   */
  async update(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    await this.conversationRepo.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return this.findById(id);
  }

  /**
   * 删除会话（软删除）
   */
  async delete(id: string): Promise<void> {
    await this.conversationRepo.softDelete(id);
    this.logger.log(`Conversation ${id} deleted`);
  }

  /**
   * 批量删除会话
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await this.conversationRepo.softDelete(ids);
    this.logger.log(`Bulk deleted ${ids.length} conversations`);
  }

  /**
   * 生成 conversationId
   */
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
