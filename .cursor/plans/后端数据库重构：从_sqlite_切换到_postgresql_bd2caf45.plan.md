---
name: 后端数据库重构：从 SQLite 切换到 PostgreSQL
overview: 分3步重构后端数据库：第一步切换到 PostgreSQL 并修复兼容性问题，第二步优化配置和环境变量，第三步验证和测试。同时提供完整的环境变量配置说明。
todos:
  - id: step1-restore-entities
    content: 第一步：恢复实体类型为 PostgreSQL 原生类型（jsonb 和 enum）
    status: pending
  - id: step1-update-config
    content: 第一步：更新数据库配置，确保 PostgreSQL 配置正确
    status: pending
  - id: step2-update-env-example
    content: 第二步：更新 .env.example 文件，添加 PostgreSQL 配置说明
    status: pending
  - id: step2-create-docker-compose
    content: 第二步：创建 docker-compose.yml（可选，用于 Docker 方案）
    status: pending
  - id: step3-test-connection
    content: 第三步：验证数据库连接和表结构创建
    status: pending
  - id: step3-test-apis
    content: 第三步：测试 API 接口，确保功能正常
    status: pending
isProject: false
---

# 后端数据库重构：从 SQLite 切换到 PostgreSQL

## 问题分析

当前问题：

1. SQLite 不支持 `enum` 类型（3处：conversation.status, message.role, genui-component.updateMode）
2. SQLite 不支持 `jsonb` 类型（已修复为 `simple-json`，但 PostgreSQL 原生支持更好）
3. SQLite 功能限制较多，不适合生产环境

关于纯向量数据库方案：

- **LanceDB 不适合**：LanceDB 是向量数据库，专为向量检索设计，不支持关系查询、事务、外键等关系数据库特性
- **会话数据需要关系数据库**：conversations、messages、genui_components 之间存在复杂的关系（外键、级联删除等）
- **结论**：必须使用关系数据库（PostgreSQL），LanceDB 仅用于 RAG 向量检索

## 重构方案

### 架构设计

```
┌─────────────────────────────────────────┐
│         应用层 (NestJS)                │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐   │
│  │ TypeORM      │  │ LanceDB      │   │
│  │ (关系数据)   │  │ (向量数据)   │   │
│  └──────────────┘  └──────────────┘   │
│         │                  │           │
│         ▼                  ▼           │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │ LanceDB      │   │
│  │ 会话/消息    │  │ 风格向量      │   │
│  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────┘
```

- **PostgreSQL**：存储会话、消息、组件、RAG上下文（关系数据）
- **LanceDB**：存储风格向量数据（向量检索）

## 重构步骤

### 第一步：切换到 PostgreSQL 并修复兼容性

#### 1.1 恢复实体类型为 PostgreSQL 原生类型

**文件**: `main/server/src/conversation/entities/conversation.entity.ts`

```typescript
// 修改 status 字段：enum → varchar + CHECK 约束（或保持 enum，PostgreSQL 支持）
@Column({
  type: 'enum',
  enum: ['active', 'completed', 'failed'],
  default: 'active',
})
status: 'active' | 'completed' | 'failed';

// 修改 metadata：simple-json → jsonb（PostgreSQL 原生支持）
@Column('jsonb', { nullable: true })
metadata: { ... };
```

**文件**: `main/server/src/conversation/entities/message.entity.ts`

```typescript
// 修改 role 字段：enum → enum（PostgreSQL 支持）
@Column({
  type: 'enum',
  enum: ['user', 'assistant', 'system'],
})
role: 'user' | 'assistant' | 'system';

// 修改 metadata：simple-json → jsonb
@Column('jsonb', { nullable: true })
metadata: { ... };
```

**文件**: `main/server/src/conversation/entities/genui-component.entity.ts`

```typescript
// 修改 props：simple-json → jsonb
@Column('jsonb')
props: Record<string, any>;

// 修改 updateMode：enum → enum（PostgreSQL 支持）
@Column({
  type: 'enum',
  enum: ['append', 'replace', 'update'],
  default: 'append',
})
updateMode: 'append' | 'replace' | 'update';

// 修改 metadata：simple-json → jsonb
@Column('jsonb', { nullable: true })
metadata: Record<string, any>;
```

**文件**: `main/server/src/conversation/entities/rag-context.entity.ts`

```typescript
// 修改 retrievedContext：simple-json → jsonb
@Column('jsonb')
retrievedContext: any;

// 修改 metadata：simple-json → jsonb
@Column('jsonb', { nullable: true })
metadata: Record<string, any>;
```

#### 1.2 更新数据库配置

**文件**: `main/server/src/config/database.config.ts`

确保 PostgreSQL 配置正确，移除 SQLite 相关代码（可选，保留以支持切换）：

```typescript
export const databaseConfig = TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const dbType = configService.get<string>('DB_TYPE') || 'postgres';

    // 只保留 PostgreSQL 配置（或保留 SQLite 作为开发选项）
    if (dbType === 'sqlite') {
      // SQLite 配置（可选，用于快速开发）
      // 注意：需要处理 enum 和 jsonb 兼容性
    }

    // PostgreSQL 配置（生产环境）
    return {
      type: 'postgres',
      host: configService.get<string>('DB_HOST') || 'localhost',
      port: configService.get<number>('DB_PORT') || 5432,
      username: configService.get<string>('DB_USER') || 'postgres',
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_NAME') || 'aivista',
      entities: [Conversation, Message, GenUIComponent, RAGContext],
      synchronize: configService.get<boolean>('DB_SYNCHRONIZE') !== false,
      logging: configService.get<boolean>('DB_LOGGING') === true,
      ssl: configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    };
  },
});
```

### 第二步：优化配置和环境变量

#### 2.1 更新环境变量配置

**文件**: `main/server/.env.example`

更新默认配置为 PostgreSQL：

```bash
# ============================================
# 数据库配置 - PostgreSQL（推荐）
# ============================================
DB_TYPE=postgres

# PostgreSQL 连接配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=aivista_dev

# 开发环境配置
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=false

# ============================================
# SQLite 配置（可选，仅用于快速开发）
# ============================================
# 如需使用 SQLite，设置：
# DB_TYPE=sqlite
# DB_DATABASE=./data/aivista.db
# 注意：SQLite 不支持 enum 和 jsonb，需要额外处理
```

#### 2.2 创建数据库初始化脚本

**文件**: `main/server/scripts/init-db.sh`（新建）

```bash
#!/bin/bash
# PostgreSQL 数据库初始化脚本

DB_NAME=${DB_NAME:-aivista_dev}
DB_USER=${DB_USER:-postgres}

echo "Creating database: $DB_NAME"

# 创建数据库（如果不存在）
psql -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  psql -U $DB_USER -c "CREATE DATABASE $DB_NAME"

echo "Database $DB_NAME created successfully"
```

### 第三步：验证和测试

#### 3.1 验证数据库连接

启动服务后检查日志：

```
[Nest] INFO [TypeOrmModule] Connected to database: postgres
```

#### 3.2 验证表结构

```bash
psql -U postgres -d aivista_dev -c "\d conversations"
psql -U postgres -d aivista_dev -c "\d messages"
```

#### 3.3 测试 API

```bash
# 创建会话
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "测试对话"}'

# 测试聊天接口
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只猫"}'
```

## 环境变量配置说明

### 方案 A：本地 PostgreSQL（推荐开发环境）

#### 1. 安装 PostgreSQL

**macOS**:

```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows**:

- 下载安装包：https://www.postgresql.org/download/windows/
- 安装时记住设置的密码

#### 2. 创建数据库

```bash
# 方式 1：使用 createdb 命令
createdb -U postgres aivista_dev

# 方式 2：使用 psql
psql -U postgres
CREATE DATABASE aivista_dev;
\q
```

#### 3. 配置 .env 文件

```bash
# 数据库类型
DB_TYPE=postgres

# PostgreSQL 连接配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=aivista_dev

# 开发环境配置
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=false
```

### 方案 B：Docker PostgreSQL（推荐团队开发）

#### 1. 创建 docker-compose.yml

**文件**: `main/server/docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: aivista-postgres
    restart: always
    environment:
      POSTGRES_USER: aivista
      POSTGRES_PASSWORD: aivista_password
      POSTGRES_DB: aivista_dev
    ports:
                                                                                 - "5432:5432"
    volumes:
                                                                                 - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aivista"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

#### 2. 启动 PostgreSQL

```bash
cd main/server
docker-compose up -d
```

#### 3. 配置 .env 文件

```bash
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=aivista
DB_PASSWORD=aivista_password
DB_NAME=aivista_dev
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=false
```

### 方案 C：Supabase 云数据库（推荐生产环境）

#### 1. 创建 Supabase 项目

1. 访问 https://supabase.com
2. 注册/登录账号
3. 创建新项目
4. 等待项目创建完成（约 2 分钟）

#### 2. 获取连接信息

1. 进入项目 Dashboard
2. Settings → Database
3. 复制连接字符串或提取以下信息：

                                                                                                - Host: `db.xxx.supabase.co`
                                                                                                - Port: `5432`
                                                                                                - User: `postgres`
                                                                                                - Password: `your_password`
                                                                                                - Database: `postgres`

#### 3. 配置 .env 文件

```bash
DB_TYPE=postgres
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_supabase_password
DB_NAME=postgres
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=true  # Supabase 需要 SSL
```

## 完整 .env 配置示例

```bash
# ============================================
# LLM 服务配置
# ============================================
LLM_PROVIDER=aliyun
DASHSCOPE_API_KEY=your_api_key_here
ALIYUN_MODEL_NAME=qwen-turbo
ALIYUN_TEMPERATURE=0.3

# ============================================
# 服务配置
# ============================================
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
LOG_LEVEL=info

# ============================================
# 向量数据库配置（LanceDB，用于 RAG）
# ============================================
VECTOR_DB_PATH=./data/lancedb
VECTOR_DIMENSION=1536

# ============================================
# 关系数据库配置（PostgreSQL，用于会话数据）
# ============================================
DB_TYPE=postgres

# PostgreSQL 连接配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=aivista_dev

# 开发环境配置
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=false

# ============================================
# RAG 检索配置
# ============================================
RAG_MIN_SIMILARITY=0.4
RAG_SEARCH_LIMIT=3

# ============================================
# 性能配置
# ============================================
WORKFLOW_TIMEOUT=60
CRITIC_PASS_THRESHOLD=0.7
CRITIC_USE_LLM=false
MAX_RETRY_COUNT=3
PLANNER_TIMEOUT=10
RAG_TIMEOUT=5
EXECUTOR_TIMEOUT=5
CRITIC_TIMEOUT=8

# ============================================
# 图片生成服务配置
# ============================================
USE_REAL_IMAGE_SERVICE=false
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1
DASHSCOPE_IMAGE_ENDPOINT=/services/aigc/multimodal-generation/generation
ALIYUN_IMAGE_MODEL=qwen-image-plus
ALIYUN_IMAGE_SIZE=1024x1024
ALIYUN_IMAGE_PROMPT_EXTEND=true
ALIYUN_IMAGE_WATERMARK=false
```

## 文件修改清单

### 需要修改的文件

1. `main/server/src/conversation/entities/conversation.entity.ts`

                                                                                                - `metadata`: `simple-json` → `jsonb`
                                                                                                - `status`: 保持 `enum`（PostgreSQL 支持）

2. `main/server/src/conversation/entities/message.entity.ts`

                                                                                                - `metadata`: `simple-json` → `jsonb`
                                                                                                - `role`: 保持 `enum`（PostgreSQL 支持）

3. `main/server/src/conversation/entities/genui-component.entity.ts`

                                                                                                - `props`: `simple-json` → `jsonb`
                                                                                                - `metadata`: `simple-json` → `jsonb`
                                                                                                - `updateMode`: 保持 `enum`（PostgreSQL 支持）

4. `main/server/src/conversation/entities/rag-context.entity.ts`

                                                                                                - `retrievedContext`: `simple-json` → `jsonb`
                                                                                                - `metadata`: `simple-json` → `jsonb`

5. `main/server/.env.example`

                                                                                                - 更新默认配置为 PostgreSQL
                                                                                                - 添加详细的配置说明

6. `main/server/.env`（用户需要手动配置）

                                                                                                - 根据选择的方案（本地/Docker/Supabase）配置

### 可选文件

- `main/server/docker-compose.yml`（新建，如果使用 Docker）
- `main/server/scripts/init-db.sh`（新建，数据库初始化脚本）

## 风险评估

- **低风险**：PostgreSQL 是成熟的关系数据库，完全支持所需特性
- **数据迁移**：如果已有 SQLite 数据，需要手动迁移（开发环境通常可以重新开始）
- **兼容性**：PostgreSQL 支持所有 TypeORM 特性（enum, jsonb, 关系等）
- **性能**：PostgreSQL 性能优于 SQLite，适合生产环境

## 验证清单

- [ ] 修改所有实体文件（jsonb 和 enum）
- [ ] 更新 .env.example 文件
- [ ] 安装并配置 PostgreSQL（选择方案 A/B/C）
- [ ] 创建数据库
- [ ] 配置 .env 文件
- [ ] 清理旧数据库文件（SQLite）
- [ ] 重新编译项目
- [ ] 启动服务，验证连接成功
- [ ] 测试创建会话 API
- [ ] 测试聊天接口
- [ ] 验证数据库表结构

## 后续优化建议

1. **生产环境**：关闭 `DB_SYNCHRONIZE`，使用 TypeORM migrations
2. **性能优化**：配置连接池、索引优化
3. **备份策略**：定期备份 PostgreSQL 数据库
4. **监控**：添加数据库监控和日志