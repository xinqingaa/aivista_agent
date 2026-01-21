import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';

/**
 * 消息服务
 * 处理消息的 CRUD 操作
 */
@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  /**
   * 创建消息
   */
  async create(dto: CreateMessageDto): Promise<Message> {
    const message = this.messageRepo.create({
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: dto.conversationId,
      role: dto.role,
      content: dto.content,
      metadata: dto.metadata || {},
      timestamp: Date.now(),
    });

    return await this.messageRepo.save(message);
  }

  /**
   * 根据会话 ID 查找所有消息
   */
  async findByConversationId(conversationId: string): Promise<Message[]> {
    return await this.messageRepo.find({
      where: { conversationId },
      order: { timestamp: 'ASC' },
      relations: ['components'],
    });
  }

  /**
   * 根据 ID 查找消息
   */
  async findById(id: string): Promise<Message> {
    return await this.messageRepo.findOne({
      where: { id },
      relations: ['components'],
    });
  }

  /**
   * 更新消息
   */
  async update(id: string, updates: Partial<Message>): Promise<void> {
    await this.messageRepo.update(id, updates);
  }
}
