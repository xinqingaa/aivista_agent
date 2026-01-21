# 后端多轮对话优化实施指南

> **版本**: v1.0
> **日期**: 2025-01-21
> **状态**: 实施阶段
> **预估工作量**: 5-7天

---

## 目录

- [1. 总体目标](#1-总体目标)
- [2. 技术方案](#2-技术方案)
- [3. 实施步骤](#3-实施步骤)
  - [Phase 1: 数据库设计](#phase-1-数据库设计-1天)
  - [Phase 2: 基础服务层](#phase-2-基础服务层-2天)
  - [Phase 3: API接口开发](#phase-3-api接口开发-1-2天)
  - [Phase 4: 集成现有SSE](#phase-4-集成现有sse-1天)
- [4. 数据库Schema](#4-数据库schema)
- [5. API接口设计](#5-api接口设计)
- [6. 代码示例](#6-代码示例)

---

## 1. 总体目标

### 1.1 核心需求

1. ✅ **不需要用户系统** - 验证AI Agent工作流，无需登录注册
2. ✅ **会话持久化** - 支持多轮对话，conversationId统一管理
3. ✅ **完整记录** - 记录用户提问、RAG检索、AI响应等所有数据
4. ✅ **回调机制** - 支持重新生成、预览、下载等功能

### 1.2 技术选型

| 组件 | 技术栈 | 说明 |
|------|--------|------|
| 数据库 | PostgreSQL | 已有基础设施，关系型适合会话管理 |
| ORM | TypeORM | NestJS官方推荐，装饰器语法友好 |
| 缓存 | (可选) Redis | 后期性能优化，初期不需要 |

---

## 2. 技术方案

### 2.1 数据模型关系

```
Conversation (会话)
    ├── id (conversationId, 主键)
    ├── title (标题)
    ├── status (状态)
    ├── metadata (元数据)
    └── 1:N ──→ Message (消息)
                    ├── role (user/assistant)
                    ├── content (文本内容)
                    └── 1:N ──→ GenUIComponent (组件树)
                                    ├── widgetType
                                    ├── props
                                    └── metadata
```

### 2.2 数据流设计

```
前端请求
    ↓
POST /api/agent/chat
    {
      "conversationId": "conv_xxx" (可选)
      "text": "用户消息"
    }
    ↓
AgentController
    ↓ [如果没有conversationId]
ConversationService.create()
    ↓
保存用户消息 → MessageService.create()
    ↓
执行 LangGraph 工作流
    ↓ (流式推送 SSE 事件)
    ├── thought_log → 保存为 ThoughtLog
    ├── enhanced_prompt → 保存为 RAGContext
    ├── gen_ui_component → 保存为 GenUIComponent
    └── stream_end → 更新 Conversation 状态
    ↓
返回 conversationId 给前端
```

---

## 3. 实施步骤

### Phase 1: 数据库设计 (1天)

**目标**: 设计并实现数据库表结构

#### 任务清单

- [ ] **Task 1.1**: 安装 TypeORM 依赖
  ```bash
  cd main/server
  pnpm add @nestjs/typeorm typeorm pg
  ```

- [ ] **Task 1.2**: 配置数据库连接
  ```typescript
  // src/config/database.config.ts
  import { TypeOrmModule } from '@nestjs/typeorm';

  export const databaseConfig = TypeOrmModule.forRoot({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'aivista',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production', // 开发环境自动同步
    logging: true,
  });
  ```

- [ ] **Task 1.3**: 创建实体文件
  - `src/conversation/entities/conversation.entity.ts`
  - `src/conversation/entities/message.entity.ts`
  - `src/conversation/entities/genui-component.entity.ts`
  - `src/conversation/entities/rag-context.entity.ts`

- [ ] **Task 1.4**: 定义实体关系
  - Conversation 1:N Message
  - Message 1:N GenUIComponent
  - Conversation 1:N RAGContext

- [ ] **Task 1.5**: 配置 TypeORM 模块
  ```typescript
  // src/conversation/conversation.module.ts
  import { TypeOrmModule } from '@nestjs/typeorm';
  import { Conversation } from './entities/conversation.entity';
  import { Message } from './entities/message.entity';
  import { GenUIComponent } from './entities/genui-component.entity';

  @Module({
    imports: [
      TypeOrmModule.forFeature([
        Conversation,
        Message,
        GenUIComponent,
      ]),
    ],
    // ...
  })
  export class ConversationModule {}
  ```

**验收标准**:
- ✅ 数据库连接成功
- ✅ 表结构自动创建
- ✅ 关系映射正确

---

### Phase 2: 基础服务层 (2天)

**目标**: 实现会话和消息的CRUD操作

#### 任务清单

- [ ] **Task 2.1**: 实现 ConversationService
  ```typescript
  // src/conversation/conversation.service.ts

  @Injectable()
  export class ConversationService {
    async create(dto: CreateConversationDto): Promise<Conversation> {
      const conversation = this.conversationRepo.create({
        id: dto.id || this.generateId(),
        title: dto.title || '新对话',
        status: 'active',
        metadata: {},
      });
      return await this.conversationRepo.save(conversation);
    }

    async findById(id: string): Promise<Conversation> {
      return await this.conversationRepo.findOne({
        where: { id },
        relations: ['messages', 'messages.components', 'ragContexts'],
      });
    }

    async findAll(options: FindConversationsDto): Promise<Conversation[]> {
      return await this.conversationRepo.find({
        order: { updatedAt: 'DESC' },
        take: options.limit || 20,
        skip: options.offset || 0,
      });
    }

    async update(id: string, updates: Partial<Conversation>): Promise<Conversation> {
      await this.conversationRepo.update(id, updates);
      return this.findById(id);
    }

    async delete(id: string): Promise<void> {
      await this.conversationRepo.softDelete(id); // 软删除
    }

    private generateId(): string {
      return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  ```

- [ ] **Task 2.2**: 实现 MessageService
  ```typescript
  // src/conversation/message.service.ts

  @Injectable()
  export class MessageService {
    async create(dto: CreateMessageDto): Promise<Message> {
      const message = this.messageRepo.create({
        conversationId: dto.conversationId,
        role: dto.role,
        content: dto.content,
        metadata: dto.metadata || {},
      });
      return await this.messageRepo.save(message);
    }

    async findByConversationId(conversationId: string): Promise<Message[]> {
      return await this.messageRepo.find({
        where: { conversationId },
        order: { timestamp: 'ASC' },
        relations: ['components'],
      });
    }
  }
  ```

- [ ] **Task 2.3**: 实现 GenUIComponentService
  ```typescript
  // src/conversation/genui-component.service.ts

  @Injectable()
  export class GenUIComponentService {
    async create(dto: CreateGenUIComponentDto): Promise<GenUIComponent> {
      const component = this.componentRepo.create({
        conversationId: dto.conversationId,
        messageId: dto.messageId,
        widgetType: dto.widgetType,
        props: dto.props,
        updateMode: dto.updateMode || 'append',
        targetId: dto.targetId,
        metadata: dto.metadata || {},
      });
      return await this.componentRepo.save(component);
    }

    async findByConversationId(conversationId: string): Promise<GenUIComponent[]> {
      return await this.componentRepo.find({
        where: { conversationId },
        order: { timestamp: 'ASC' },
      });
    }
  }
  ```

- [ ] **Task 2.4**: 实现 RAGContextService
  ```typescript
  // src/conversation/rag-context.service.ts

  @Injectable()
  export class RAGContextService {
    async create(dto: CreateRAGContextDto): Promise<RAGContext> {
      const context = this.ragContextRepo.create({
        conversationId: dto.conversationId,
        messageId: dto.messageId,
        originalPrompt: dto.originalPrompt,
        retrievedContext: dto.retrievedContext,
        finalPrompt: dto.finalPrompt,
        metadata: dto.metadata || {},
      });
      return await this.ragContextRepo.save(context);
    }
  }
  ```

- [ ] **Task 2.5**: 编写单元测试
  ```bash
  pnpm run test -- conversation.service.spec.ts
  pnpm run test -- message.service.spec.ts
  ```

**验收标准**:
- ✅ 所有CRUD操作正常
- ✅ 数据库关联查询正确
- ✅ 单元测试覆盖率 > 80%

---

### Phase 3: API接口开发 (1-2天)

**目标**: 实现会话管理的REST API

#### 任务清单

- [ ] **Task 3.1**: 创建 ConversationController
  ```typescript
  // src/conversation/conversation.controller.ts

  @Controller('api/conversations')
  export class ConversationController {
    constructor(
      private readonly conversationService: ConversationService,
      private readonly messageService: MessageService,
    ) {}

    // 获取会话列表
    @Get()
    async findAll(
      @Query('limit') limit?: number,
      @Query('offset') offset?: number,
    ) {
      const conversations = await this.conversationService.findAll({ limit, offset });
      return {
        conversations: conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          status: conv.status,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messageCount: conv.messages?.length || 0,
        })),
        total: conversations.length,
      };
    }

    // 获取会话详情（包含完整消息和组件）
    @Get(':id')
    async findOne(@Param('id') id: string) {
      const conversation = await this.conversationService.findById(id);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      return conversation;
    }

    // 创建会话
    @Post()
    async create(@Body() dto: CreateConversationDto) {
      const conversation = await this.conversationService.create(dto);
      return conversation;
    }

    // 更新会话
    @Patch(':id')
    async update(
      @Param('id') id: string,
      @Body() updates: UpdateConversationDto,
    ) {
      const conversation = await this.conversationService.update(id, updates);
      return conversation;
    }

    // 删除会话
    @Delete(':id')
    async delete(@Param('id') id: string) {
      await this.conversationService.delete(id);
      return { success: true, deletedId: id };
    }

    // 批量删除
    @Post('bulk-delete')
    async bulkDelete(@Body('ids') ids: string[]) {
      await Promise.all(ids.map(id => this.conversationService.delete(id)));
      return {
        success: true,
        deletedCount: ids.length,
        deletedIds: ids,
      };
    }

    // 获取会话的消息列表
    @Get(':id/messages')
    async getMessages(@Param('id') id: string) {
      const messages = await this.messageService.findByConversationId(id);
      return messages;
    }

    // 获取会话的GenUI组件
    @Get(':id/components')
    async getComponents(@Param('id') id: string) {
      const components = await this.genuiComponentService.findByConversationId(id);
      return components;
    }
  }
  ```

- [ ] **Task 3.2**: 添加DTO验证
  ```typescript
  // src/conversation/dto/create-conversation.dto.ts
  export class CreateConversationDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsEnum(['active', 'completed', 'failed'])
    status?: 'active' | 'completed' | 'failed';
  }

  // src/conversation/dto/update-conversation.dto.ts
  export class UpdateConversationDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsEnum(['active', 'completed', 'failed'])
    status?: 'active' | 'completed' | 'failed';
  }
  ```

- [ ] **Task 3.3**: 添加Swagger文档
  ```typescript
  // main.ts
  import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

  const config = new DocumentBuilder()
    .setTitle('AiVista API')
    .setVersion('1.0')
    .addTag('conversations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  ```

- [ ] **Task 3.4**: 测试API接口
  ```bash
  # 获取会话列表
  curl http://localhost:3000/api/conversations

  # 创建会话
  curl -X POST http://localhost:3000/api/conversations \
    -H "Content-Type: application/json" \
    -d '{"title": "测试对话"}'

  # 获取会话详情
  curl http://localhost:3000/api/conversations/conv_xxx
  ```

**验收标准**:
- ✅ 所有API接口正常工作
- ✅ Swagger文档可访问
- ✅ 数据验证正确

---

### Phase 4: 集成现有SSE (1天)

**目标**: 将持久化逻辑集成到现有的SSE聊天接口

#### 任务清单

- [ ] **Task 4.1**: 修改 AgentController 的 chat 方法
  ```typescript
  // src/agent/agent.controller.ts

  @Post('chat')
  async chat(@Body() request: ChatRequestDto, @Res() response: Response) {
    const { conversationId, text, maskData, preferredModel } = request;

    // 1. 获取或创建会话
    let conversation;
    if (conversationId) {
      conversation = await this.conversationService.findById(conversationId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      conversation = await this.conversationService.create({
        title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      });
    }

    // 2. 保存用户消息
    const userMessage = await this.messageService.create({
      conversationId: conversation.id,
      role: 'user',
      content: text,
      metadata: {
        maskData,
        preferredModel,
      },
    });

    // 3. 设置SSE响应头
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    // 4. 发送connection事件（返回conversationId）
    response.write(`event: connection\n`);
    response.write(`data: ${JSON.stringify({
      status: 'connected',
      sessionId: `session_${Date.now()}`,
      conversationId: conversation.id, // ← 新增
    })}\n\n`);

    // 5. 执行工作流
    const initialState: AgentState = {
      userInput: { text, maskData, preferredModel },
      sessionId: conversation.id, // 使用conversationId
    };

    const genUIComponents = [];

    try {
      for await (const event of this.agentService.executeWorkflow(initialState)) {
        // 6. 根据事件类型保存数据
        if (event.type === 'thought_log') {
          // 保存思考日志为GenUI组件
          const component = await this.genuiComponentService.create({
            conversationId: conversation.id,
            messageId: userMessage.id,
            widgetType: 'ThoughtLogItem',
            props: {
              node: event.data.node,
              message: event.data.message,
              progress: event.data.progress,
              metadata: event.data.metadata,
              timestamp: Date.now(),
            },
          });
          genUIComponents.push(component);
        }

        if (event.type === 'enhanced_prompt') {
          // 保存RAG检索上下文
          await this.ragContextService.create({
            conversationId: conversation.id,
            messageId: userMessage.id,
            originalPrompt: event.data.original,
            retrievedContext: event.data.retrieved,
            finalPrompt: event.data.final,
          });

          // 同时保存为GenUI组件（用于前端展示）
          const component = await this.genuiComponentService.create({
            conversationId: conversation.id,
            messageId: userMessage.id,
            widgetType: 'EnhancedPromptView',
            props: event.data,
          });
          genUIComponents.push(component);
        }

        if (event.type === 'gen_ui_component') {
          // 保存GenUI组件
          const component = await this.genuiComponentService.create({
            conversationId: conversation.id,
            messageId: userMessage.id,
            widgetType: event.data.widgetType,
            props: event.data.props,
            updateMode: event.data.updateMode,
            targetId: event.data.targetId,
          });
          genUIComponents.push(component);
        }

        // 7. 推送到前端
        response.write(`event: ${event.type}\n`);
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // 8. 保存助手响应（如果有生成的图片）
      const lastComponent = genUIComponents[genUIComponents.length - 1];
      if (lastComponent?.widgetType === 'ImageView') {
        await this.messageService.create({
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Image generated',
          metadata: {
            imageUrl: lastComponent.props.imageUrl,
            componentIds: genUIComponents.map(c => c.id),
          },
        });
      }

      // 9. 更新会话时间戳
      await this.conversationService.update(conversation.id, {
        updatedAt: new Date(),
      });

    } catch (error) {
      this.logger.error(`Stream error: ${error.message}`);
      response.write(`event: error\n`);
      response.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
    }
  }
  ```

- [ ] **Task 4.2**: 修改 ChatRequestDto
  ```typescript
  // src/agent/dto/chat-request.dto.ts
  export class ChatRequestDto {
    @IsOptional()
    @IsString()
    conversationId?: string; // ← 新增

    @IsString()
    text: string;

    @IsOptional()
    maskData?: any;

    @IsOptional()
    @IsString()
    preferredModel?: string;
  }
  ```

- [ ] **Task 4.3**: 测试完整流程
  ```bash
  # 测试创建新对话
  curl -X POST http://localhost:3000/api/agent/chat \
    -H "Content-Type: application/json" \
    -d '{"text": "生成一张猫的图片"}'

  # 测试继续对话
  curl -X POST http://localhost:3000/api/agent/chat \
    -H "Content-Type: application/json" \
    -d '{"conversationId": "conv_xxx", "text": "再生成一张狗的图片"}'
  ```

**验收标准**:
- ✅ SSE流式推送正常
- ✅ 数据正确保存到数据库
- ✅ conversationId正确返回
- ✅ 多轮对话正常工作

---

## 4. 数据库Schema

### 4.1 Conversation (会话表)

```typescript
// src/conversation/entities/conversation.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('conversations')
export class Conversation {
  @PrimaryColumn('varchar')
  id: string; // conversationId, 格式: conv_{timestamp}_{random}

  @Column('varchar')
  title: string;

  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'failed'],
    default: 'active',
  })
  status: 'active' | 'completed' | 'failed';

  @Column('jsonb', { nullable: true })
  metadata: {
    model?: string;
    totalMessages?: number;
    totalImages?: number;
    [key: string]: any;
  };

  @CreateDateColumn({ type: 'bigint' })
  createdAt: number;

  @UpdateDateColumn({ type: 'bigint' })
  updatedAt: number;

  @DeleteDateColumn({ type: 'bigint' })
  deletedAt?: number; // 软删除
}
```

### 4.2 Message (消息表)

```typescript
// src/conversation/entities/message.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { GenUIComponent } from './genui-component.entity';

@Entity('messages')
export class Message {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  conversationId: string;

  @Column({
    type: 'enum',
    enum: ['user', 'assistant', 'system'],
  })
  role: 'user' | 'assistant' | 'system';

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  metadata: {
    sessionId?: string;
    maskData?: any;
    preferredModel?: string;
    imageUrl?: string;
    componentIds?: string[];
    [key: string]: any;
  };

  @CreateDateColumn({ type: 'bigint' })
  timestamp: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @OneToMany(() => GenUIComponent, component => component.message)
  components: GenUIComponent[];
}
```

### 4.3 GenUIComponent (GenUI组件表)

```typescript
// src/conversation/entities/genui-component.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('genui_components')
export class GenUIComponent {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  conversationId: string;

  @Column('varchar', { nullable: true })
  messageId: string;

  @Column('varchar')
  widgetType: string;

  @Column('jsonb')
  props: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['append', 'replace', 'update'],
    default: 'append',
  })
  updateMode: 'append' | 'replace' | 'update';

  @Column('varchar', { nullable: true })
  targetId: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'bigint' })
  timestamp: number;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;
}
```

### 4.4 RAGContext (RAG检索上下文表)

```typescript
// src/conversation/entities/rag-context.entity.ts
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('rag_contexts')
export class RAGContext {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  conversationId: string;

  @Column('varchar', { nullable: true })
  messageId: string;

  @Column('text')
  originalPrompt: string;

  @Column('jsonb')
  retrievedContext: any;

  @Column('text')
  finalPrompt: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'bigint' })
  timestamp: number;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;
}
```

---

## 5. API接口设计

### 5.1 对话管理接口

```typescript
/**
 * 获取对话列表
 * GET /api/conversations
 *
 * Query Parameters:
 *   - limit: number (默认 20)
 *   - offset: number (默认 0)
 *   - status: 'active' | 'completed' | 'failed' (可选)
 *
 * Response:
 * {
 *   conversations: Array<{
 *     id: string;
 *     title: string;
 *     status: string;
 *     createdAt: number;
 *     updatedAt: number;
 *     messageCount: number;
 *   }>;
 *   total: number;
 * }
 */

/**
 * 获取对话详情
 * GET /api/conversations/:id
 *
 * Response:
 * {
 *   id: string;
 *   title: string;
 *   status: string;
 *   createdAt: number;
 *   updatedAt: number;
 *   messages: Array<{
 *     id: string;
 *     role: 'user' | 'assistant';
 *     content: string;
 *     timestamp: number;
 *     components: GenUIComponent[];
 *   }>;
 *   ragContexts: RAGContext[];
 * }
 */

/**
 * 创建对话
 * POST /api/conversations
 *
 * Request Body:
 * {
 *   id?: string; // 可选，不提供则自动生成
 *   title?: string; // 可选，不提供则默认"新对话"
 * }
 *
 * Response: Conversation
 */

/**
 * 更新对话
 * PATCH /api/conversations/:id
 *
 * Request Body:
 * {
 *   title?: string;
 *   status?: 'active' | 'completed' | 'failed';
 * }
 *
 * Response: Conversation
 */

/**
 * 删除对话
 * DELETE /api/conversations/:id
 *
 * Response:
 * {
 *   success: boolean;
 *   deletedId: string;
 * }
 */

/**
 * 批量删除对话
 * POST /api/conversations/bulk-delete
 *
 * Request Body:
 * {
 *   ids: string[];
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   deletedCount: number;
 *   deletedIds: string[];
 * }
 */
```

### 5.2 消息和组件接口

```typescript
/**
 * 获取对话的消息列表
 * GET /api/conversations/:id/messages
 *
 * Response: Message[]
 */

/**
 * 获取对话的GenUI组件
 * GET /api/conversations/:id/components
 *
 * Response: GenUIComponent[]
 */
```

### 5.3 SSE聊天接口

```typescript
/**
 * SSE聊天接口（支持会话ID）
 * POST /api/agent/chat
 *
 * Request Body:
 * {
 *   conversationId?: string; // 可选，不提供则创建新对话
 *   text: string;
 *   maskData?: any;
 *   preferredModel?: string;
 * }
 *
 * SSE Events:
 * - connection: 连接建立，返回conversationId
 * - thought_log: 思考日志
 * - enhanced_prompt: RAG增强提示词
 * - gen_ui_component: GenUI组件
 * - stream_end: 流结束
 * - error: 错误
 */
```

---

## 6. 代码示例

### 6.1 完整的 Module 配置

```typescript
// src/conversation/conversation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { GenUIComponentService } from './genui-component.service';
import { RAGContextService } from './rag-context.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { GenUIComponent } from './entities/genui-component.entity';
import { RAGContext } from './entities/rag-context.entity';

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
```

### 6.2 在 AppModule 中导入

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConversationModule } from './conversation/conversation.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [
    ConversationModule,
    AgentModule,
    // ...
  ],
})
export class AppModule {}
```

### 6.3 环境变量配置

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=aivista

# 或者使用SQLite（开发环境）
# DB_TYPE=sqlite
# DB_DATABASE=./data/aivista.db
```

---

## 7. 验收标准

### Phase 1 验收
- [ ] 数据库表自动创建
- [ ] TypeORM连接成功
- [ ] 实体关系正确

### Phase 2 验收
- [ ] CRUD操作正常
- [ ] 单元测试通过
- [ ] 数据关联查询正确

### Phase 3 验收
- [ ] API接口正常工作
- [ ] Swagger文档可访问
- [ ] 数据验证正确

### Phase 4 验收
- [ ] SSE流式推送正常
- [ ] 数据持久化成功
- [ ] 多轮对话正常

---

## 8. 后续优化方向

### 性能优化 (可选)
- [ ] 添加 Redis 缓存层
- [ ] 实现数据库查询优化
- [ ] 添加批量操作接口

### 功能增强 (可选)
- [ ] 实现对话导出功能
- [ ] 添加对话搜索功能
- [ ] 实现对话统计和分析

### 监控和日志
- [ ] 添加性能监控
- [ ] 实现错误追踪
- [ ] 添加审计日志

---

**文档版本**: v1.0
**最后更新**: 2025-01-21
**维护者**: AiVista 开发团队
