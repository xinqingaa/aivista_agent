# 后端实施补充文档 - 边界情况与迁移策略

> **版本**: v1.0
> **日期**: 2025-01-21
> **状态**: 补充说明

---

## 目录

- [1. 关键问题与迁移策略](#1-关键问题与迁移策略)
- [2. 环境变量配置补充](#2-环境变量配置补充)
- [3. 错误处理与边界情况](#3-错误处理与边界情况)
- [4. 重新生成功能实现](#4-重新生成功能实现)
- [5. 数据库迁移策略](#5-数据库迁移策略)
- [6. 安全性考虑](#6-安全性考虑)
- [7. 性能优化](#7-性能优化)

---

## 1. 关键问题与迁移策略

### 1.1 sessionId → conversationId 迁移

**现状**：
- 现有代码使用 `sessionId`（如 `agent.controller.ts:60`）
- 新文档建议使用 `conversationId`

**迁移策略**：

#### 选项 A：渐进式迁移（推荐）

```typescript
// Phase 1: 同时支持两者（过渡期）
class ChatRequestDto {
  @IsOptional()
  @IsString()
  sessionId?: string; // 保持兼容

  @IsOptional()
  @IsString()
  conversationId?: string; // 新增
}

// 在 Controller 中统一处理
async chat(@Body() request: ChatRequestDto, @Res() response: Response) {
  // 优先使用 conversationId，兼容 sessionId
  const conversationId = request.conversationId || request.sessionId;

  // 如果两者都没有，创建新对话
  const finalConversationId = conversationId || `conv_${Date.now()}`;

  // 记录迁移日志
  if (request.sessionId && !request.conversationId) {
    this.logger.warn(`Using deprecated sessionId, please migrate to conversationId`);
  }
}
```

#### 选项 B：一次性替换

```typescript
// 直接替换所有 sessionId 为 conversationId
// ⚠️ 风险：前端需要同步更新，否则会出错
```

**推荐方案**：选项 A，逐步迁移，保持向后兼容

---

### 1.2 数据库选型调整

**问题**：
- 主文档建议使用 PostgreSQL
- 但项目已有向量数据库配置（`VECTOR_DB_PATH=./data/lancedb`）

**建议方案**：

#### 方案 A：混合存储（推荐）

```
PostgreSQL: 会话、消息、GenUI组件（关系型数据）
LanceDB: 向量嵌入和知识库（向量检索）
```

**优势**：
- 保留现有 LanceDB 配置
- 各取所长：PostgreSQL 关系查询，LanceDB 向量检索

#### 方案 B：统一使用 PostgreSQL

```
PostgreSQL: 所有数据（使用 pgvector 扩展）
```

**优势**：
- 简化架构
- 统一管理

**劣势**：
- 需要迁移现有 LanceDB 数据
- 需要安装 pgvector 扩展

**推荐方案**：方案 A，混合存储

---

## 2. 环境变量配置补充

### 2.1 新增数据库配置

```bash
# .env 文件添加

# ============================================
# PostgreSQL 数据库配置（会话存储）
# ============================================
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=aivista
DB_SYNCHRONIZE=false  # 生产环境必须设为 false
DB_LOGGING=true
DB_SSL=false

# 或者使用 SQLite（开发环境）
# DB_TYPE=sqlite
# DB_DATABASE=./data/aivista.db

# ============================================
# TypeORM 配置
# ============================================
TYPEORM_CONNECTION=postgres
TYPEORM_HOST=localhost
TYPEORM_PORT=5432
TYPEORM_USERNAME=postgres
TYPEORM_PASSWORD=your_password
TYPEORM_DATABASE=aivista
TYPEORM_SYNCHRONIZE=false
TYPEORM_LOGGING=true
TYPEORM_ENTITIES=dist/**/*.entity{.ts,.js}
TYPEORM_MIGRATIONS=dist/migrations/*.js
TYPEORM_MIGRATIONS_DIR=src/migrations
```

### 2.2 更新 configuration.ts

```typescript
// src/config/configuration.ts

class EnvironmentVariables {
  // ... 现有配置 ...

  // 数据库配置
  @IsString()
  @IsOptional()
  DB_TYPE?: string;

  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsNumber()
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  @IsOptional()
  DB_USER?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  DB_NAME?: string;

  @IsBoolean()
  @IsOptional()
  DB_SYNCHRONIZE?: boolean;

  @IsString()
  @IsOptional()
  DB_SSL?: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  // ... 现有验证 ...

  // 数据库配置验证
  const dbType = validatedConfig.DB_TYPE || 'postgres';
  if (dbType === 'postgres') {
    if (!validatedConfig.DB_HOST) {
      throw new Error('DB_HOST is required when DB_TYPE=postgres');
    }
    if (!validatedConfig.DB_USER) {
      throw new Error('DB_USER is required when DB_TYPE=postgres');
    }
    if (!validatedConfig.DB_PASSWORD) {
      throw new Error('DB_PASSWORD is required when DB_TYPE=postgres');
    }
    if (!validatedConfig.DB_NAME) {
      throw new Error('DB_NAME is required when DB_TYPE=postgres');
    }
  }
}
```

---

## 3. 错误处理与边界情况

### 3.1 数据库连接失败处理

```typescript
// src/conversation/conversation.service.ts

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private isDatabaseAvailable = true;

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
  ) {
    // 监听数据库连接状态
    this.checkDatabaseHealth();
  }

  private async checkDatabaseHealth() {
    try {
      await this.conversationRepo.query('SELECT 1');
      this.isDatabaseAvailable = true;
      this.logger.log('Database connection healthy');
    } catch (error) {
      this.isDatabaseAvailable = false;
      this.logger.error('Database connection failed', error);
      // 发送告警（可选）
      this.sendAlert('Database connection failed');
    }
  }

  async create(dto: CreateConversationDto): Promise<Conversation> {
    if (!this.isDatabaseAvailable) {
      // 降级方案：使用内存存储
      this.logger.warn('Database unavailable, using in-memory storage');
      return this.createInMemory(dto);
    }

    try {
      const conversation = this.conversationRepo.create({
        id: dto.id || this.generateId(),
        title: dto.title || '新对话',
        status: 'active',
        metadata: {},
      });
      return await this.conversationRepo.save(conversation);
    } catch (error) {
      if (this.isConnectionError(error)) {
        this.isDatabaseAvailable = false;
        return this.createInMemory(dto);
      }
      throw error;
    }
  }

  private isConnectionError(error: any): boolean {
    return (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('connect') ||
      error.message?.includes('timeout')
    );
  }

  private createInMemory(dto: CreateConversationDto): Conversation {
    // 简单的内存存储实现
    const conversation: Conversation = {
      id: dto.id || this.generateId(),
      title: dto.title || '新对话',
      status: 'active',
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      genUIComponents: [],
    };

    // 存储到内存缓存
    this.inMemoryCache.set(conversation.id, conversation);
    return conversation;
  }

  private inMemoryCache = new Map<string, Conversation>();
  private sendAlert(message: string) {
    // TODO: 实现告警通知
  }
}
```

### 3.2 SSE 连接断开时的数据一致性

```typescript
// src/agent/agent.controller.ts

async chat(@Body() request: ChatRequestDto, @Res() response: Response) {
  const conversationId = request.conversationId || request.sessionId;

  // ... SSE 设置 ...

  try {
    // 保存用户消息
    const userMessage = await this.messageService.create({
      conversationId: conversation.id,
      role: 'user',
      content: request.text,
      metadata: {
        status: 'pending', // 标记为待处理
      },
    });

    // 执行工作流
    for await (const event of this.agentService.executeWorkflow(initialState)) {
      // 检查客户端是否断开
      if (response.destroyed) {
        this.logger.warn(`Client disconnected during workflow, conversationId: ${conversationId}`);

        // 标记消息状态为中断
        await this.messageService.update(userMessage.id, {
          metadata: {
            status: 'interrupted',
            disconnectedAt: Date.now(),
          },
        });

        // 保存已生成的组件（便于恢复）
        await this.savePartialResults(conversationId, genUIComponents);

        break;
      }

      // 推送事件
      response.write(`event: ${event.type}\n`);
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    // ... 错误处理 ...
  }
}
```

### 3.3 重复提交防护

```typescript
// src/common/guards/dedupe.guard.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DedupeMiddleware implements NestMiddleware {
  private readonly requestCache = new Map<string, number>();
  private readonly CACHE_TTL = 5000; // 5秒内相同请求视为重复

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/api/agent/chat') {
      const body = req.body;
      const cacheKey = `${body.text}_${body.conversationId || body.sessionId}_${body.maskData?.imageUrl || ''}`;
      const now = Date.now();

      const lastRequestTime = this.requestCache.get(cacheKey);
      if (lastRequestTime && now - lastRequestTime < this.CACHE_TTL) {
        return res.status(429).json({
          error: 'Duplicate request',
          message: 'Please wait before sending the same request again',
        });
      }

      this.requestCache.set(cacheKey, now);

      // 清理过期缓存
      this.cleanCache();
    }

    next();
  }

  private cleanCache() {
    const now = Date.now();
    for (const [key, time] of this.requestCache.entries()) {
      if (now - time > this.CACHE_TTL) {
        this.requestCache.delete(key);
      }
    }
  }
}
```

### 3.4 并发请求处理

```typescript
// src/agent/agent.service.ts

@Injectable()
export class AgentService {
  private readonly concurrentLimiter = new Map<string, number>();
  private readonly MAX_CONCURRENT_PER_CONVERSATION = 3;

  async *executeWorkflow(initialState: AgentState): AsyncGenerator<any> {
    const conversationId = initialState.sessionId;

    // 检查并发限制
    const currentConcurrent = this.concurrentLimiter.get(conversationId) || 0;
    if (currentConcurrent >= this.MAX_CONCURRENT_PER_CONVERSATION) {
      yield {
        type: 'error',
        timestamp: Date.now(),
        data: {
          code: 'TOO_MANY_REQUESTS',
          message: '请等待当前任务完成后再发送新消息',
        },
      };
      return;
    }

    // 增加并发计数
    this.concurrentLimiter.set(conversationId, currentConcurrent + 1);

    try {
      // ... 执行工作流 ...
    } finally {
      // 减少并发计数
      const newCount = (this.concurrentLimiter.get(conversationId) || 1) - 1;
      if (newCount <= 0) {
        this.concurrentLimiter.delete(conversationId);
      } else {
        this.concurrentLimiter.set(conversationId, newCount);
      }
    }
  }
}
```

---

## 4. 重新生成功能实现

### 4.1 新增重新生成接口

```typescript
// src/agent/agent.controller.ts

/**
 * POST /api/agent/regenerate - 重新生成最后一条消息
 */
@Post('regenerate')
@ApiOperation({
  summary: '重新生成最后一条消息',
  description: '基于对话历史重新执行工作流，生成新的响应',
})
@ApiBody({
  schema: {
    type: 'object',
    required: ['conversationId'],
    properties: {
      conversationId: {
        type: 'string',
        description: '对话ID',
      },
      messageId: {
        type: 'string',
        description: '要重新生成的消息ID（可选，默认最后一条用户消息）',
      },
    },
  },
})
async regenerate(@Body() request: RegenerateRequestDto, @Res() response: Response) {
  const { conversationId, messageId } = request;

  // 获取对话历史
  const conversation = await this.conversationService.findById(conversationId);
  if (!conversation) {
    return response.status(404).json({
      error: 'Conversation not found',
    });
  }

  // 确定要重新生成的消息
  const targetMessage = messageId
    ? conversation.messages.find(m => m.id === messageId)
    : conversation.messages.filter(m => m.role === 'user').pop();

  if (!targetMessage) {
    return response.status(404).json({
      error: 'Message not found',
    });
  }

  // 获取该消息之前的所有上下文
  const contextMessages = conversation.messages.filter(m => m.timestamp <= targetMessage.timestamp);

  // 设置 SSE 响应头
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');

  try {
    // 发送连接确认
    response.write(`event: connection\n`);
    response.write(`data: ${JSON.stringify({
      status: 'connected',
      sessionId: conversationId,
      isRegeneration: true,
    })}\n\n`);

    // 构建初始状态（包含历史上下文）
    const initialState: AgentState = {
      userInput: {
        text: targetMessage.content,
        maskData: targetMessage.metadata?.maskData,
        preferredModel: targetMessage.metadata?.preferredModel,
      },
      uiComponents: [],
      thoughtLogs: [],
      sessionId: conversationId,
      timestamp: Date.now(),
      metadata: {
        ...targetMessage.metadata,
        isRegeneration: true,
        originalMessageId: targetMessage.id,
        contextMessages,
      },
    };

    // 执行工作流
    for await (const event of this.agentService.executeWorkflow(initialState)) {
      response.write(`event: ${event.type}\n`);
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    this.logger.error(`Regenerate error: ${error.message}`);
    response.write(`event: error\n`);
    response.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
  } finally {
    response.end();
  }
}

class RegenerateRequestDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsOptional()
  messageId?: string;
}
```

### 4.2 更新前端调用

```typescript
// 前端重新生成逻辑（在 frontend_implementation.md 中补充）

const handleRegenerate = async () => {
  try {
    const response = await fetch('/api/agent/regenerate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        messageId: lastUserMessageId, // 可选
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to regenerate');
    }

    // 处理 SSE 流（与聊天接口相同）
    const reader = response.body?.getReader();
    // ... SSE 解析逻辑 ...

  } catch (error) {
    toast.error('重新生成失败');
  }
};
```

---

## 5. 数据库迁移策略

### 5.1 Migration 文件示例

```typescript
// src/migrations/1700000000000-CreateConversations.ts

import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateConversations1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 conversations 表
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'completed', 'failed'],
            default: "'active'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'bigint',
          },
          {
            name: 'updatedAt',
            type: 'bigint',
          },
          {
            name: 'deletedAt',
            type: 'bigint',
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_CONVERSATIONS_STATUS',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_CONVERSATIONS_UPDATED_AT',
            columnNames: ['updatedAt'],
          }),
        ],
      }),
      true,
    );

    // 创建 messages 表
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'conversationId',
            type: 'varchar',
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['user', 'assistant', 'system'],
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'bigint',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['conversationId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'conversations',
            onDelete: 'CASCADE',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_MESSAGES_CONVERSATION_ID',
            columnNames: ['conversationId'],
          }),
        ],
      }),
      true,
    );

    // 创建 genui_components 表
    await queryRunner.createTable(
      new Table({
        name: 'genui_components',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'conversationId',
            type: 'varchar',
          },
          {
            name: 'messageId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'widgetType',
            type: 'varchar',
          },
          {
            name: 'props',
            type: 'jsonb',
          },
          {
            name: 'updateMode',
            type: 'enum',
            enum: ['append', 'replace', 'update'],
            default: "'append'",
          },
          {
            name: 'targetId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'bigint',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['conversationId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'conversations',
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('genui_components');
    await queryRunner.dropTable('messages');
    await queryRunner.dropTable('conversations');
  }
}
```

### 5.2 Migration 配置

```typescript
// src/config/database.config.ts

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: configService.get('DB_TYPE') || 'postgres',
    host: configService.get('DB_HOST') || 'localhost',
    port: configService.get('DB_PORT') || 5432,
    username: configService.get('DB_USER') || 'postgres',
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME') || 'aivista',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*.js'],
    synchronize: configService.get('NODE_ENV') === 'development', // 生产环境必须用 false
    logging: configService.get('DB_LOGGING') === 'true',
    ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
  }),
});
```

### 5.3 运行 Migration

```bash
# 生成 migration
pnpm run migration:generate -- -n CreateConversations

# 运行 migration
pnpm run migration:run

# 回滚 migration
pnpm run migration:revert
```

---

## 6. 安全性考虑

### 6.1 输入验证

```typescript
// src/common/validators/conversation-id.validator.ts

import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isValidConversationId' })
export class IsValidConversationId implements ValidatorConstraintInterface {
  validate(text: string) {
    // conversationId 格式: conv_{timestamp}_{random}
    const regex = /^conv_\d+_[a-z0-9]+$/;
    return regex.test(text);
  }

  defaultMessage() {
    return 'Invalid conversationId format';
  }
}

// 使用
class ChatRequestDto {
  @IsOptional()
  @IsString()
  @IsValidConversationId()
  conversationId?: string;
}
```

### 6.2 SQL 注入防护

```typescript
// TypeORM 自动参数化查询，但需要注意：

// ❌ 错误：直接拼接
const query = `SELECT * FROM conversations WHERE id = '${conversationId}'`;

// ✅ 正确：使用参数化
const conversation = await this.conversationRepo.findOne({
  where: { id: conversationId },
});

// 或者使用 QueryBuilder
const conversation = await this.conversationRepo
  .createQueryBuilder('conv')
  .where('conv.id = :id', { id: conversationId })
  .getOne();
```

### 6.3 XSS 防护

```typescript
// GenUI 组件内容过滤

import * as xss from 'xss';

function sanitizeGenUIProps(props: Record<string, any>): Record<string, any> {
  const sanitized = { ...props };

  // 过滤所有字符串字段
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = xss(sanitized[key], {
        whiteList: {}, // 不允许任何 HTML 标签
        stripIgnoreTag: true,
      });
    }
  }

  return sanitized;
}

// 在保存 GenUI 组件时使用
const component = await this.genuiComponentService.create({
  ...dto,
  props: sanitizeGenUIProps(dto.props),
});
```

---

## 7. 性能优化

### 7.1 批量操作

```typescript
// src/conversation/conversation.service.ts

async findByIdsWithMessages(ids: string[]): Promise<Conversation[]> {
  return await this.conversationRepo.find({
    where: { id: In(ids) },
    relations: ['messages', 'messages.components'],
    order: { updatedAt: 'DESC' },
  });
}

async bulkDelete(ids: string[]): Promise<void> {
  await this.conversationRepo.softDelete(ids);
}
```

### 7.2 查询优化

```typescript
// 使用 select 只查询需要的字段
async getConversationListItems(limit: number, offset: number) {
  return await this.conversationRepo.find({
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    order: { updatedAt: 'DESC' },
    take: limit,
    skip: offset,
  });
}

// 使用索引
@Entity('conversations')
@Index(['status'])
@Index(['updatedAt'])
export class Conversation {
  // ...
}
```

### 7.3 缓存策略

```typescript
// src/common/cache/redis-cache.service.ts

import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisCacheService {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    });
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.client.mget(keys);
  }
}

// 使用
async findById(id: string): Promise<Conversation> {
  // 先查缓存
  const cacheKey = `conversation:${id}`;
  const cached = await this.redisCache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // 查数据库
  const conversation = await this.conversationRepo.findOne({
    where: { id },
    relations: ['messages', 'messages.components'],
  });

  // 写入缓存
  if (conversation) {
    await this.redisCache.set(cacheKey, JSON.stringify(conversation), 3600);
  }

  return conversation;
}
```

---

## 8. 监控和日志

### 8.1 性能监控

```typescript
// src/common/interceptors/performance.interceptor.ts

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.log(
          `${request.method} ${request.url} - ${duration}ms`
        );

        // 记录慢查询
        if (duration > 3000) {
          this.logger.warn(
            `Slow request detected: ${request.method} ${request.url} - ${duration}ms`
          );
        }
      }),
    );
  }
}
```

### 8.2 审计日志

```typescript
// src/common/services/audit-log.service.ts

import { Injectable } from '@nestjs/common';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(action: string, entityType: string, entityId: string, userId?: string, metadata?: any) {
    await this.auditLogRepo.save({
      action,
      entityType,
      entityId,
      userId,
      metadata,
      timestamp: Date.now(),
    });
  }

  // 使用示例
  // await this.auditLog.log('CREATE', 'Conversation', conversationId);
  // await this.auditLog.log('DELETE', 'Message', messageId);
}
```

---

**文档版本**: v1.0
**最后更新**: 2025-01-21
**维护者**: AiVista 开发团队
