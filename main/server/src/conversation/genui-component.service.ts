import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenUIComponent } from './entities/genui-component.entity';
import { CreateGenUIComponentDto } from './dto/create-genui-component.dto';

/**
 * GenUI 组件服务
 * 处理前端渲染组件的存储
 */
@Injectable()
export class GenUIComponentService {
  private readonly logger = new Logger(GenUIComponentService.name);

  constructor(
    @InjectRepository(GenUIComponent)
    private readonly componentRepo: Repository<GenUIComponent>,
  ) {}

  /**
   * 创建 GenUI 组件
   */
  async create(dto: CreateGenUIComponentDto): Promise<GenUIComponent> {
    const componentId = dto.id ? undefined : `${dto.widgetType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const component = this.componentRepo.create({
      id: componentId || dto.id,
      conversationId: dto.conversationId,
      messageId: dto.messageId,
      widgetType: dto.widgetType,
      props: dto.props,
      updateMode: dto.updateMode || 'append',
      targetId: dto.targetId,
      metadata: dto.metadata || {},
      timestamp: Date.now(),
    });

    return await this.componentRepo.save(component);
  }

  /**
   * 根据会话 ID 查找所有组件
   */
  async findByConversationId(conversationId: string): Promise<GenUIComponent[]> {
    return await this.componentRepo.find({
      where: { conversationId },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * 根据消息 ID 查找所有组件
   */
  async findByMessageId(messageId: string): Promise<GenUIComponent[]> {
    return await this.componentRepo.find({
      where: { messageId },
      order: { timestamp: 'ASC' },
    });
  }
}
