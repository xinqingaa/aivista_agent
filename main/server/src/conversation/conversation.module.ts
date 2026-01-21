import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { GenUIComponentService } from './genui-component.service';
import { RAGContextService } from './rag-context.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { GenUIComponent } from './entities/genui-component.entity';
import { RAGContext } from './entities/rag-context.entity';

/**
 * 会话管理模块
 * 负责会话、消息、GenUI组件和RAG上下文的管理
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      GenUIComponent,
      RAGContext,
    ]),
  ],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    MessageService,
    GenUIComponentService,
    RAGContextService,
  ],
  exports: [
    ConversationService,
    MessageService,
    GenUIComponentService,
    RAGContextService,
  ],
})
export class ConversationModule {}
