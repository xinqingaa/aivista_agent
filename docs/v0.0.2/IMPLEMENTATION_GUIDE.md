# AiVista 多轮对话重构 - 启动指南

> **版本**: v1.0  
> **日期**: 2025-01-21  
> **状态**: 实施完成

---

## 实施完成清单

### 后端 (100% 完成)

- ✅ **Phase B1**: 修复 Conversation Entity，添加 OneToMany 关系映射
- ✅ **Phase B2**: RAGContextService 完整实现
- ✅ **Phase B3**: Agent Controller SSE 集成完善
- ✅ **Phase B4**: PostgreSQL 数据库配置

### 前端 (100% 完成)

- ✅ **Phase F1**: 状态管理架构
  - Zustand Store (`stores/conversation-store.ts`)
  - IndexedDB 数据库 (`lib/db/conversation-db.ts`)
  - 类型定义 (`lib/types/conversation.ts`)
- ✅ **Phase F2**: 侧边栏 UI
  - Sidebar 组件 (`components/sidebar/Sidebar.tsx`)
  - MainLayout 组件 (`components/layout/MainLayout.tsx`)
- ✅ **Phase F3**: 聊天功能集成
  - chat-interface.tsx 重构
  - use-sse.ts 支持 conversationId
- ✅ **Phase F4**: 功能按钮
  - ActionButtons 组件
  - ImageActionButtons 组件
- ✅ **Phase F5**: 优化和完善
  - ConversationView 组件
  - ChatLoading/ChatError 组件
  - useMediaQuery hook
  - useDebounce hook

---

## 快速启动

### 1. 启动后端服务

后端项目支持多种数据库启动方案，根据你的环境选择最适合的方式：

#### 📖 完整启动方案指南

请查看 [后端启动指南](./BACKEND_STARTUP_GUIDE.md) 获取详细的启动方案，包括：

- **方案一：SQLite**（推荐）- 零配置快速启动，无需安装数据库
- **方案二：Docker PostgreSQL** - 容器化数据库，环境隔离
- **方案三：本地 PostgreSQL** - 生产环境推荐
- **方案四：云数据库 Supabase** - 零部署，云端托管

#### 🚀 快速启动（SQLite，推荐新手）

```bash
# 进入后端目录
cd main/server

# 复制环境变量文件
cp .env.example .env

# 编辑 .env，设置 API Key
# DASHSCOPE_API_KEY=your_api_key_here
# DB_TYPE=sqlite  # 使用默认配置

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run start:dev
```

#### 🐳 使用 Docker（推荐团队开发）

```bash
# 进入后端目录
cd main/server

# 启动 PostgreSQL 容器
docker-compose up -d

# 配置 .env
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=aivista
# DB_PASSWORD=aivista_password
# DB_NAME=aivista_dev

# 安装依赖并启动
pnpm install
pnpm run start:dev
```

#### 🐘 使用本地 PostgreSQL（生产环境）

```bash
# 安装 PostgreSQL（macOS）
brew install postgresql@15
brew services start postgresql@15

# 创建数据库
createdb aivista_dev

# 配置 .env
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_NAME=aivista_dev

# 启动服务
cd main/server
pnpm install
pnpm run start:dev
```

**预期输出**：
```
[Nest] INFO [TypeOrmModule] DB Connection established
[Nest] INFO [NestApplication] Nest application successfully started
```

**验证数据库表**：
```bash
psql aivista_dev -c "\dt"
```

应该看到 4 张表：
- `conversations` - 会话表
- `messages` - 消息表
- `genui_components` - GenUI 组件表
- `rag_contexts` - RAG 检索上下文表

---

### 2. 启动前端应用

```bash
# 进入前端目录
cd main/web

# 安装依赖（如果需要）
pnpm install

# 启动开发服务器
pnpm run dev
```

访问 `http://localhost:3001/chat`

---

## 核心功能验证

### 功能 1：会话管理

1. **创建新对话**
   - 点击侧边栏的「新建对话」按钮
   - 验证：新对话出现在列表顶部
   - 验证：IndexedDB 中保存了新对话

2. **切换对话**
   - 点击侧边栏的对话项
   - 验证：聊天界面切换到对应对话
   - 验证：历史消息和组件正确显示

3. **删除对话**
   - 悬停在对话项上，点击删除按钮
   - 确认删除
   - 验证：对话从列表中移除

### 功能 2：多轮对话

1. **发送消息**
   - 在输入框输入「生成一只赛博朋克风格的猫」
   - 点击发送或按 Enter
   - 验证：消息保存到当前会话
   - 验证：conversationId 传递给后端
   - 验证：SSE 流正常接收

2. **继续对话**
   - 在同一会话中再发送一条消息
   - 验证：新消息添加到现有会话
   - 验证：conversationId 保持一致

3. **查看对话历史**
   - 刷新页面
   - 验证：对话列表和消息都还在
   - 验证：可以正常切换和查看历史对话

### 功能 3：数据持久化

1. **IndexedDB 验证**
   - 打开浏览器开发者工具
   - Application > Storage > IndexedDB
   - 查看 `AiVistaConversationsDB` 数据库
   - 验证：对话数据正确存储

2. **PostgreSQL 验证**
   ```bash
   # 查看会话数据
   psql aivista_dev -c "SELECT id, title, status FROM conversations ORDER BY updated_at DESC LIMIT 5;"
   
   # 查看消息数据
   psql aivista_dev -c "SELECT id, role, content FROM messages LIMIT 5;"
   ```

### 功能 4：功能按钮

1. **预览图片**
   - 生成一张图片后
   - 悬停在图片上
   - 点击「预览」按钮
   - 验证：新窗口打开图片

2. **下载图片**
   - 点击「下载」按钮
   - 验证：图片下载到本地

3. **复制链接**
   - 点击「复制」按钮
   - 验证：图片 URL 复制到剪贴板

---

## 数据库架构

### 表结构

```sql
-- 会话表
CREATE TABLE conversations (
  id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  status VARCHAR CHECK(status IN ('active', 'completed', 'failed')),
  metadata JSONB,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT
);

-- 消息表
CREATE TABLE messages (
  id VARCHAR PRIMARY KEY,
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  timestamp BIGINT NOT NULL
);

-- GenUI 组件表
CREATE TABLE genui_components (
  id VARCHAR PRIMARY KEY,
  conversation_id VARCHAR NOT NULL,
  message_id VARCHAR REFERENCES messages(id) ON DELETE CASCADE,
  widget_type VARCHAR NOT NULL,
  props JSONB NOT NULL,
  update_mode VARCHAR CHECK(update_mode IN ('append', 'replace', 'update')),
  target_id VARCHAR,
  metadata JSONB,
  timestamp BIGINT NOT NULL
);

-- RAG 上下文表
CREATE TABLE rag_contexts (
  id VARCHAR PRIMARY KEY,
  conversation_id VARCHAR NOT NULL,
  message_id VARCHAR REFERENCES messages(id) ON DELETE CASCADE,
  original_prompt TEXT NOT NULL,
  retrieved_context JSONB NOT NULL,
  final_prompt TEXT NOT NULL,
  metadata JSONB,
  timestamp BIGINT NOT NULL
);
```

---

## API 接口

### 会话管理 API

```bash
# 获取会话列表
GET /api/conversations?limit=20&offset=0

# 获取会话详情
GET /api/conversations/:id

# 创建会话
POST /api/conversations
{
  "title": "新对话",
  "status": "active"
}

# 更新会话
PATCH /api/conversations/:id
{
  "title": "更新的标题",
  "status": "completed"
}

# 删除会话
DELETE /api/conversations/:id

# 批量删除
POST /api/conversations/bulk-delete
{
  "ids": ["conv_1", "conv_2"]
}

# 获取会话消息
GET /api/conversations/:id/messages

# 获取会话组件
GET /api/conversations/:id/components
```

### SSE 聊天 API

```bash
# 发送消息（支持 conversationId）
POST /api/agent/chat
{
  "conversationId": "conv_xxx", // 可选，不传则创建新会话
  "text": "生成一张图片",
  "maskData": {},  // 可选
  "preferredModel": "qwen-image-plus"  // 可选
}

# 响应（SSE 流）
event: connection
data: {"status":"connected","sessionId":"...","conversationId":"conv_xxx"}

event: thought_log
data: {"node":"planner","message":"分析用户意图..."}

event: enhanced_prompt
data: {"original":"...","retrieved":{},"final":"..."}

event: gen_ui_component
data: {"widgetType":"ImageView","props":{"imageUrl":"..."}}

event: stream_end
data: {"timestamp":1234567890}
```

---

## 故障排查

### 后端问题

**问题 1：数据库连接失败**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案**：
```bash
# 检查 PostgreSQL 是否运行
brew services list | grep postgresql

# 启动 PostgreSQL
brew services start postgresql@15

# 验证连接
psql -U postgres -c "SELECT version();"
```

**问题 2：表未创建**
```
QueryFailedError: relation "conversations" does not exist
```

**解决方案**：
- 确保 `.env` 中 `DB_SYNCHRONIZE=true`
- 重启后端服务
- 检查日志中的表创建信息

### 前端问题

**问题 1：Store 导入错误**
```
Module not found: Can't resolve '@/stores/conversation-store'
```

**解决方案**：
```bash
# 确保文件已创建
ls -la main/web/stores/

# 重启前端开发服务器
pnpm run dev
```

**问题 2：IndexedDB 不可用**
```
[IndexedDB] IndexedDB not available
```

**解决方案**：
- 检查是否在无痕模式
- 检查浏览器是否支持 IndexedDB
- 清除浏览器缓存后重试

**问题 3：类型错误**
```
Type 'GenUIComponent' is not assignable to...
```

**解决方案**：
- 检查 `lib/types/conversation.ts` 是否正确创建
- 检查导入路径是否正确
- 重启 TypeScript 服务器（VS Code: Cmd+Shift+P > Restart TS Server）

---

## 使用建议

### 开发环境

1. **使用 SQLite（更快速启动）**
   ```bash
   # .env 文件
   DB_TYPE=sqlite
   DB_DATABASE=./data/aivista.db
   DB_SYNCHRONIZE=true
   ```

2. **使用 PostgreSQL（推荐）**
   ```bash
   # .env 文件
   DB_TYPE=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=aivista_dev
   DB_SYNCHRONIZE=true
   DB_LOGGING=true
   ```

### 生产环境

1. **数据库迁移**
   - 关闭 `DB_SYNCHRONIZE`
   - 使用 TypeORM migration
   ```bash
   pnpm run migration:generate -- -n InitialSchema
   pnpm run migration:run
   ```

2. **环境变量**
   - 使用环境变量管理敏感信息
   - 不要提交 `.env` 文件到 Git

3. **性能优化**
   - 启用 Redis 缓存
   - 配置数据库连接池
   - 添加 CDN 加速图片加载

---

## 下一步计划

### 短期（1-2周）

1. **实现重新生成功能**
   - 后端添加 `/api/agent/regenerate` 接口
   - 前端完善重新生成按钮逻辑

2. **数据同步优化**
   - 实现前端 → 后端自动同步
   - 添加离线支持和冲突解决

3. **UI/UX 改进**
   - 添加对话搜索
   - 实现对话标签分类
   - 优化移动端体验

### 中期（1个月）

1. **性能优化**
   - 虚拟滚动长对话列表
   - 图片懒加载和预加载
   - 前端代码分割

2. **功能增强**
   - 对话导出（JSON/PDF）
   - 批量操作（删除、归档）
   - 对话统计和分析

3. **安全加固**
   - 添加请求签名验证
   - 实现 CSRF 保护
   - 添加内容安全策略

### 长期（3个月）

1. **协作功能**
   - 对话分享
   - 多设备同步
   - 团队协作

2. **AI 能力增强**
   - 多模态输入（语音、图片）
   - 更多 AI 模型支持
   - 自定义 Agent 工作流

---

## 测试检查清单

### 基础功能测试

- [ ] 创建新对话
- [ ] 发送消息
- [ ] 查看 AI 响应
- [ ] 切换对话
- [ ] 删除对话
- [ ] 页面刷新数据保持

### 多轮对话测试

- [ ] 在同一对话中发送多条消息
- [ ] 验证 conversationId 一致性
- [ ] 验证历史消息正确显示
- [ ] 验证 GenUI 组件关联正确

### 数据持久化测试

- [ ] 消息保存到 IndexedDB
- [ ] 消息保存到 PostgreSQL
- [ ] 页面刷新后数据恢复
- [ ] 关闭浏览器重新打开数据仍在

### UI/UX 测试

- [ ] 侧边栏展开/收起动画流畅
- [ ] 移动端适配正常
- [ ] 搜索过滤功能正常
- [ ] 滚动性能良好

### 边界情况测试

- [ ] 网络断开时的表现
- [ ] 数据库连接失败时的降级
- [ ] IndexedDB 配额超限时的提示
- [ ] 并发请求的处理

---

## 文件清单

### 后端文件

```
main/server/
├── src/
│   ├── conversation/
│   │   ├── entities/
│   │   │   ├── conversation.entity.ts      ✅ 已修复（添加关系映射）
│   │   │   ├── message.entity.ts           ✅ 已存在
│   │   │   ├── genui-component.entity.ts   ✅ 已存在
│   │   │   └── rag-context.entity.ts       ✅ 已存在
│   │   ├── dto/                            ✅ 已存在
│   │   ├── conversation.service.ts         ✅ 已存在
│   │   ├── message.service.ts              ✅ 已存在
│   │   ├── genui-component.service.ts      ✅ 已存在
│   │   ├── rag-context.service.ts          ✅ 已完善
│   │   ├── conversation.controller.ts      ✅ 已存在
│   │   └── conversation.module.ts          ✅ 已存在
│   ├── agent/
│   │   └── agent.controller.ts             ✅ 已完善（SSE 集成）
│   ├── config/
│   │   └── database.config.ts              ✅ 已存在
│   └── app.module.ts                       ✅ 已存在
└── .env                                    ✅ 已配置（PostgreSQL）
```

### 前端文件

```
main/web/
├── stores/
│   └── conversation-store.ts               ✅ 新建
├── lib/
│   ├── types/
│   │   └── conversation.ts                 ✅ 新建
│   └── db/
│       └── conversation-db.ts              ✅ 新建
├── components/
│   ├── sidebar/
│   │   └── Sidebar.tsx                     ✅ 新建
│   ├── layout/
│   │   └── MainLayout.tsx                  ✅ 新建
│   └── chat/
│       ├── chat-interface.tsx              ✅ 已重构
│       ├── ActionButtons.tsx               ✅ 新建
│       ├── ConversationView.tsx            ✅ 新建
│       ├── ChatLoading.tsx                 ✅ 新建
│       └── ChatError.tsx                   ✅ 新建
├── hooks/
│   ├── use-sse.ts                          ✅ 已修改
│   ├── use-media-query.ts                  ✅ 新建
│   └── use-debounce.ts                     ✅ 新建（已存在）
└── app/
    └── chat/
        └── page.tsx                        ✅ 已更新
```

---

## 常见问题

**Q1: 为什么选择混合存储（IndexedDB + PostgreSQL）？**

A: 
- IndexedDB：提供快速的本地缓存，支持离线访问
- PostgreSQL：提供可靠的持久化和跨设备同步
- 混合模式：兼顾性能和可靠性

**Q2: conversationId 和 sessionId 有什么区别？**

A:
- `conversationId`：新的统一会话标识符
- `sessionId`：旧的标识符（已弃用，保留向后兼容）
- 后端会优先使用 `conversationId`

**Q3: 如何清理旧数据？**

A:
```typescript
// 前端清理 IndexedDB
import { ConversationDB } from '@/lib/db/conversation-db';
await ConversationDB.clearAll();

// 后端清理数据库
psql aivista_dev -c "TRUNCATE conversations CASCADE;"
```

**Q4: 如何切换回 SQLite？**

A:
```bash
# .env 文件
DB_TYPE=sqlite
DB_DATABASE=./data/aivista.db
```

---

## 联系和支持

如果遇到问题：
1. 查看控制台日志
2. 检查数据库连接
3. 验证环境变量配置
4. 参考本文档的故障排查部分

---

**文档版本**: v1.0  
**最后更新**: 2025-01-21  
**维护者**: AiVista 开发团队
