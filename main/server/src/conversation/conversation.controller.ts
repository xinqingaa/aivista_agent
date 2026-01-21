import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { GenUIComponentService } from './genui-component.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

/**
 * 会话管理控制器
 * 提供会话、消息和组件的 REST API
 */
@ApiTags('conversations')
@Controller('api/conversations')
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly genuiComponentService: GenUIComponentService,
  ) {}

  /**
   * 获取会话列表
   */
  @Get()
  @ApiOperation({ summary: '获取会话列表' })
  @ApiResponse({ status: 200, description: '成功返回会话列表' })
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const conversations = await this.conversationService.findAll({ limit, offset });

    return {
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        status: conv.status,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      total: conversations.length,
    };
  }

  /**
   * 获取会话详情（包含完整消息和组件）
   */
  @Get(':id')
  @ApiParam({ name: 'id', description: '会话 ID' })
  @ApiOperation({ summary: '获取会话详情' })
  @ApiResponse({ status: 200, description: '成功返回会话详情' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async findOne(@Param('id') id: string) {
    try {
      const conversation = await this.conversationService.findById(id);

      // 获取消息和组件
      const messages = await this.messageService.findByConversationId(id);

      return {
        ...conversation,
        messages,
        genUIComponents: await this.genuiComponentService.findByConversationId(id),
      };
    } catch (error) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
  }

  /**
   * 创建会话
   */
  @Post()
  @ApiOperation({ summary: '创建会话' })
  @ApiResponse({ status: 201, description: '成功创建会话' })
  async create(@Body() dto: CreateConversationDto) {
    const conversation = await this.conversationService.create(dto);
    this.logger.log(`Conversation created: ${conversation.id}`);
    return conversation;
  }

  /**
   * 更新会话
   */
  @Patch(':id')
  @ApiParam({ name: 'id', description: '会话 ID' })
  @ApiOperation({ summary: '更新会话' })
  @ApiResponse({ status: 200, description: '成功更新会话' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  async update(@Param('id') id: string, @Body() updates: UpdateConversationDto) {
    try {
      const conversation = await this.conversationService.update(id, updates);
      this.logger.log(`Conversation updated: ${id}`);
      return conversation;
    } catch (error) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
  }

  /**
   * 删除会话
   */
  @Delete(':id')
  @ApiParam({ name: 'id', description: '会话 ID' })
  @ApiOperation({ summary: '删除会话' })
  @ApiResponse({ status: 200, description: '成功删除会话' })
  async delete(@Param('id') id: string) {
    await this.conversationService.delete(id);
    this.logger.log(`Conversation deleted: ${id}`);
    return { success: true, deletedId: id };
  }

  /**
   * 批量删除会话
   */
  @Post('bulk-delete')
  @ApiOperation({ summary: '批量删除会话' })
  @ApiResponse({ status: 200, description: '成功批量删除会话' })
  async bulkDelete(@Body('ids') ids: string[]) {
    await this.conversationService.bulkDelete(ids);
    this.logger.log(`Bulk deleted ${ids.length} conversations`);
    return {
      success: true,
      deletedCount: ids.length,
      deletedIds: ids,
    };
  }

  /**
   * 获取会话的消息列表
   */
  @Get(':id/messages')
  @ApiParam({ name: 'id', description: '会话 ID' })
  @ApiOperation({ summary: '获取会话的消息列表' })
  @ApiResponse({ status: 200, description: '成功返回消息列表' })
  async getMessages(@Param('id') id: string) {
    const messages = await this.messageService.findByConversationId(id);
    return messages;
  }

  /**
   * 获取会话的 GenUI 组件
   */
  @Get(':id/components')
  @ApiParam({ name: 'id', description: '会话 ID' })
  @ApiOperation({ summary: '获取会话的 GenUI 组件' })
  @ApiResponse({ status: 200, description: '成功返回组件列表' })
  async getComponents(@Param('id') id: string) {
    const components = await this.genuiComponentService.findByConversationId(id);
    return components;
  }
}
