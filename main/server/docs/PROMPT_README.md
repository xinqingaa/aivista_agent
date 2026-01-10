# 后端实施指南 (NestJS)

**角色：** 高级后端架构师
**任务：** 初始化并开发 AiVista 的 NestJS 后端核心。

## 1. 项目结构说明

```
src/
├── main.ts                      # 应用入口
├── app.module.ts                # 根模块
├── agent/                       # Agent 工作流模块
│   ├── agent.module.ts
│   ├── agent.controller.ts     # SSE 端点
│   ├── agent.service.ts         # LangGraph 编排逻辑
│   ├── nodes/                   # 工作流节点
│   │   ├── planner.node.ts
│   │   ├── rag.node.ts
│   │   ├── executor.node.ts
│   │   └── critic.node.ts
│   ├── interfaces/              # 接口定义
│   │   └── agent-state.interface.ts
│   └── graph/                   # 状态图定义
│       └── agent.graph.ts
├── knowledge/                   # 知识库模块
│   ├── knowledge.module.ts
│   ├── knowledge.service.ts     # LanceDB 封装
│   ├── services/                # 服务
│   │   └── embedding.service.ts # 向量嵌入服务
│   └── data/                    # 初始化数据
│       └── initial-styles.ts    # 默认风格数据
├── common/                      # 共享模块
│   ├── types/                   # 类型定义
│   │   ├── agent-state.interface.ts
│   │   ├── genui-component.interface.ts
│   │   └── error.interface.ts
│   ├── filters/                 # 异常过滤器
│   │   └── all-exceptions.filter.ts
│   └── guards/                  # 守卫
│       └── auth.guard.ts
└── config/                      # 配置模块
    └── configuration.ts
```

## 2. 初始化步骤 (Setup Instructions)

- 在当前目录下创建一个新的 NestJS 项目。
- 安装必要的依赖包：
  - `@nestjs/config` (环境变量管理)
  - `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`
  - `@langchain/langgraph` (图编排核心)
  - `@langchain/openai` (用于兼容 OpenAI 协议的 LLM 适配器，支持 DeepSeek 等)
  - `@langchain/community` (用于支持阿里云通义千问等其他 LLM 提供商)
  - `@langchain/core`
  - `vectordb` (Node.js 版 LanceDB)
  - `rxjs` (NestJS 标配)
  - `class-validator`, `class-transformer` (数据验证)

## 2.1 环境变量配置

创建 `.env` 文件（参考 `.env.example`），包含以下配置：

### LLM 服务配置（必填）

```bash
# LLM 提供商选择: 'aliyun' | 'deepseek' | 'openai'
# 默认: 'aliyun'
LLM_PROVIDER=aliyun
```

#### 阿里云通义千问配置（LLM_PROVIDER=aliyun 时使用）

```bash
# 阿里云 DashScope API Key（必填）
DASHSCOPE_API_KEY=sk-xxxxxx

# 模型名称（可选，默认: qwen-turbo）
# 可选值: qwen-turbo, qwen-plus, qwen-max
ALIYUN_MODEL_NAME=qwen-turbo

# 温度参数（可选，默认: 0.3）
ALIYUN_TEMPERATURE=0.3

# Embedding 模型名称（可选，默认: text-embedding-v1）
# 可选值: text-embedding-v1, text-embedding-v2, text-embedding-v3, text-embedding-v4, multimodal-embedding-v1
ALIYUN_EMBEDDING_MODEL=text-embedding-v1
```

#### DeepSeek 配置（LLM_PROVIDER=deepseek 时使用）

```bash
# DeepSeek API Key（必填）
DEEPSEEK_API_KEY=sk-xxxxxx

# API Base URL（可选，默认: https://api.deepseek.com）
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 模型名称（可选，默认: deepseek-chat）
DEEPSEEK_MODEL_NAME=deepseek-chat

# 温度参数（可选，默认: 0.3）
DEEPSEEK_TEMPERATURE=0.3
```

#### OpenAI 配置（LLM_PROVIDER=openai 时使用）

```bash
# OpenAI API Key（必填）
OPENAI_API_KEY=sk-xxxxxx

# API Base URL（可选，默认: https://api.openai.com/v1）
OPENAI_BASE_URL=https://api.openai.com/v1

# 模型名称（可选，默认: gpt-3.5-turbo）
OPENAI_MODEL_NAME=gpt-3.5-turbo

# 温度参数（可选，默认: 0.3）
OPENAI_TEMPERATURE=0.3
```

### Embedding 服务配置（可选）

```bash
# Embedding 提供商选择（可选，默认: 使用 LLM_PROVIDER 的值）
# 可选值: 'aliyun' | 'openai' | 'deepseek'
# 如果未设置，将使用 LLM_PROVIDER 的值
EMBEDDING_PROVIDER=aliyun

# OpenAI Embedding 模型（EMBEDDING_PROVIDER=openai 时使用）
# 可选，默认: text-embedding-ada-002
EMBEDDING_MODEL=text-embedding-ada-002
```

**说明：**
- 如果 `EMBEDDING_PROVIDER` 未设置，将自动使用 `LLM_PROVIDER` 的值
- 阿里云的 Embedding 使用 `ALIYUN_EMBEDDING_MODEL` 配置
- OpenAI/DeepSeek 的 Embedding 使用 `EMBEDDING_MODEL` 配置（兼容 OpenAI API）

### 服务配置

```bash
# 服务端口（可选，默认: 3000）
PORT=3000

# 环境模式（可选，默认: development）
# 可选值: development, production, test
NODE_ENV=development

# CORS 配置（可选，默认: *）
# 生产环境建议设置为具体域名
CORS_ORIGIN=*

# 日志级别（可选，默认: info）
# 可选值: error, warn, info, debug
LOG_LEVEL=info
```

### 向量数据库配置

```bash
# LanceDB 数据存储路径（可选，默认: ./data/lancedb）
VECTOR_DB_PATH=./data/lancedb

# 向量维度（可选，默认: 1536，对应 OpenAI embedding）
VECTOR_DIMENSION=1536
```

### 性能配置

```bash
# 工作流超时时间（秒，可选，默认: 60）
WORKFLOW_TIMEOUT=60

# 节点超时配置（秒，可选）
PLANNER_TIMEOUT=10
RAG_TIMEOUT=5
EXECUTOR_TIMEOUT=5
CRITIC_TIMEOUT=8

# 并发控制（可选）
MAX_CONCURRENT_SESSIONS=50
MAX_QUEUE_SIZE=100

# 缓存配置（可选）
CACHE_TTL=3600  # 缓存过期时间（秒）
```

### 安全配置

```bash
# API 速率限制（可选）
# 格式: { "windowMs": 60000, "max": 100 }
# 表示每分钟最多 100 次请求
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# 会话超时时间（分钟，可选，默认: 30）
SESSION_TIMEOUT_MINUTES=30
```

### 完整示例（.env.example）

```bash
# ============================================
# LLM 服务配置
# ============================================
LLM_PROVIDER=aliyun

# 阿里云配置
DASHSCOPE_API_KEY=your_dashscope_api_key_here
ALIYUN_MODEL_NAME=qwen-turbo
ALIYUN_TEMPERATURE=0.3
ALIYUN_EMBEDDING_MODEL=text-embedding-v1

# DeepSeek 配置（备用）
# DEEPSEEK_API_KEY=your_deepseek_api_key_here
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_MODEL_NAME=deepseek-chat

# ============================================
# 服务配置
# ============================================
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
LOG_LEVEL=info

# ============================================
# Embedding 服务配置（可选）
# ============================================
# Embedding 提供商（可选，默认使用 LLM_PROVIDER）
# EMBEDDING_PROVIDER=aliyun

# ============================================
# 向量数据库配置
# ============================================
VECTOR_DB_PATH=./data/lancedb
VECTOR_DIMENSION=1536

# ============================================
# 性能配置
# ============================================
WORKFLOW_TIMEOUT=60
PLANNER_TIMEOUT=10
RAG_TIMEOUT=5
EXECUTOR_TIMEOUT=5
CRITIC_TIMEOUT=8
MAX_CONCURRENT_SESSIONS=50
MAX_QUEUE_SIZE=100
CACHE_TTL=3600

# ============================================
# 安全配置
# ============================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
SESSION_TIMEOUT_MINUTES=30
```

### 环境变量验证

项目启动时会自动验证必填的环境变量：

- `LLM_PROVIDER` 必须设置
- 根据 `LLM_PROVIDER` 的值，验证对应的 API Key：
  - `aliyun` → 需要 `DASHSCOPE_API_KEY`
  - `deepseek` → 需要 `DEEPSEEK_API_KEY`
  - `openai` → 需要 `OPENAI_API_KEY`

- `EMBEDDING_PROVIDER`（可选，默认使用 `LLM_PROVIDER` 的值）
  - 如果 `EMBEDDING_PROVIDER=aliyun`（或未设置且 `LLM_PROVIDER=aliyun`）→ 需要 `DASHSCOPE_API_KEY`
  - 如果 `EMBEDDING_PROVIDER=openai/deepseek` → 需要 `OPENAI_API_KEY` 或 `DEEPSEEK_API_KEY`

缺少必填配置时，应用启动会失败并提示错误信息。

## 3. 模块架构详细说明 (Module Architecture)

采用轻量级领域驱动设计 (DDD)：

### 3.1 Agent 模块 (`src/agent/`)

**核心职责：** Agent 工作流的编排和执行

- **agent.controller.ts**: 处理 SSE 连接，接收用户请求
- **agent.service.ts**: LangGraph 状态图的构建和执行
- **nodes/**: 四个核心节点
  - `planner.node.ts`: 意图解析
  - `rag.node.ts`: 风格检索和 Prompt 增强
  - `executor.node.ts`: 任务执行（文生图、局部重绘、参数调整）
  - `critic.node.ts`: 质量审查

**详细设计参考：** `AGENT_WORKFLOW_DESIGN.md`

### 3.2 Knowledge 模块 (`src/knowledge/`)

**核心职责：** 向量数据库管理和风格检索

- **knowledge.service.ts**: LanceDB 的封装，提供向量检索接口
- 项目启动时自动初始化风格数据（5 条示例数据）

### 3.3 Common 模块 (`src/common/`)

**核心职责：** 共享的类型定义、异常处理、守卫

- **types/**: 所有数据模型的 TypeScript 接口
  - `agent-state.interface.ts`: AgentState 定义
  - `genui-component.interface.ts`: GenUI 组件定义
  - `error.interface.ts`: 错误类型定义
- **filters/**: 全局异常过滤器
- **guards/**: 认证和授权守卫

**详细设计参考：** `DATA_MODELS_DESIGN.md`, `ERROR_HANDLING_DESIGN.md`

## 4. 开发优先级细化 (Implementation Priorities)

### 里程碑 1：基础通路 (Baseline)
- [x] 搭建 NestJS 项目结构
- [x] 配置环境变量（`.env.example`）
- [x] 实现 LLM 服务封装（参考 `LLM_SERVICE_DESIGN.md`）
- [x] 实现基础的 SSE 端点
- [x] 验证：前端能连接并接收流式数据

### 里程碑 2：大脑构建 (The Brain)
- [x] 引入 LangGraph
- [x] 定义 AgentState 数据结构
- [x] 实现 Planner Node（意图解析）
- [x] 实现 Executor Node（Mock 生图）
- [x] 验证：用户输入 "画只猫"，后端能解析并返回 Mock 图片

#### 里程碑2前后核心流程对比
- 之前的实现（里程碑1 - 顺序调用）
```ts
// AgentService 直接顺序调用节点
async *executeWorkflow(initialState: AgentState) {
  let state = { ...initialState };
  
  // 1. 手动调用 Planner Node
  const plannerResult = await this.plannerNode.execute(state);
  state = { ...state, ...plannerResult };  // 手动合并状态
  
  // 2. 手动判断是否继续
  if (state.intent?.action === 'unknown' || state.error) {
    yield error;
    return;  // 手动控制流程
  }
  
  // 3. 手动调用 Executor Node
  const executorResult = await this.executorNode.execute(state);
  state = { ...state, ...executorResult };  // 手动合并状态
  
  // 4. 手动推送事件
  yield events;
}
```
- 特点：
  - 顺序调用：代码中硬编码执行顺序
  - 手动状态管理：需要手动合并和传递状态
  - 流程控制：用 if/else 控制流程
  - 难以扩展：添加新节点需要修改多处代码
- 现在的实现（里程碑2 - LangGraph 状态图）
```ts
// 1. 定义状态图（agent.graph.ts）
const graph = new StateGraph(AgentStateAnnotation);
graph.addNode('planner', plannerNode);
graph.addNode('executor', executorNode);
graph.addEdge(START, 'planner');
graph.addConditionalEdges('planner', (state) => {
  if (state.error || state.intent?.action === 'unknown') {
    return END;  // 条件边自动控制流程
  }
  return 'executor';
});
graph.addEdge('executor', END);

// 2. AgentService 使用图执行
async *executeWorkflow(initialState: AgentState) {
  const stream = await this.graph.stream(initialState, {
    streamMode: 'updates',  // 流式获取每个节点的状态更新
  });
  
  for await (const chunk of stream) {
    // chunk: { planner: {...}, executor: {...} }
    // LangGraph 自动管理状态合并和流程控制
  }
}
```
- 特点：
  - 声明式编排：通过图结构定义工作流
  - 自动状态管理：通过状态通道（channels）和 reducer 自动合并
  - 条件边控制：通过 addConditionalEdges 声明式控制流程
  - 易于扩展：添加节点只需在图定义中添加，无需修改执行逻辑
#### 核心区别总结
维度	之前（里程碑1）	现在（里程碑2）
执行方式	顺序调用（命令式）	状态图编排（声明式）
状态管理	手动合并 {...state, ...update}	自动合并（通过 reducer）
流程控制	if/else 判断	条件边（conditional edges）
扩展性	需要修改多处代码	只需修改图定义
可观测性	手动记录日志	LangGraph 自动提供节点执行信息
错误处理	手动检查错误	可通过条件边自动路由到错误处理节点
#### 实际效果
之前：
- 代码耦合度高，添加 RAG 或 Critic 节点需要修改 AgentService
- 状态传递容易出错（手动合并可能遗漏字段）
- 难以可视化工作流
现在：
- 工作流清晰可见（在 agent.graph.ts 中一目了然）
- 状态管理自动化，减少错误
- 添加新节点只需：
  ```ts
  graph.addNode('rag', ragNode);  
  graph.addEdge('planner', 'rag');  
  graph.addEdge('rag', 'executor');
  ```
- 支持复杂流程（循环、并行、条件分支等）
里程碑2的核心价值：从命令式顺序调用升级为声明式状态图编排，提升了可维护性和可扩展性。

**完成时间：** 2024-12-30

**完成内容：**
- ✅ 创建 LangGraph 状态图（`src/agent/graph/agent.graph.ts`）
- ✅ 集成 LangGraph 到 AgentService，实现流式执行
- ✅ Planner Node 和 Executor Node 已集成到工作流
- ✅ 支持 SSE 流式推送工作流执行过程
- ✅ 可在 Apifox 中测试完整工作流

### 里程碑 3：记忆与协议 (Memory & Protocol)
- [x] 集成 LanceDB（RAG Node）
- [x] 实现 GenUI 组件生成
- [x] 实现完整的 SSE 事件推送（thought_log, gen_ui_component）
- [x] 验证：完整的即梦复刻流程跑通

**完成时间：** 2024-12-30

**完成内容：**
- ✅ 创建 KnowledgeService（LanceDB 封装）和 EmbeddingService（向量嵌入）
- ✅ 实现 RAG Node（风格检索和 Prompt 增强）
- ✅ 更新 AgentState 接口，支持 enhancedPrompt 对象类型
- ✅ 更新状态图，添加 RAG 节点：`planner → rag → executor → END`
- ✅ 知识库自动初始化（启动时加载 5 条默认风格数据）
- ✅ Executor Node 使用增强后的 Prompt
- ✅ 完整的即梦复刻流程已跑通

### 里程碑 4：质量审查 (Quality Control)
- [ ] 实现 Critic Node（质量审查）
- [ ] 实现错误处理和重试机制
- [ ] 实现多模态输入处理（文本 + 蒙版）
- [ ] 验证：工作流完整执行，包括质量审查和错误处理

### 里程碑 5：优化与完善 (Polish)
- [ ] 性能优化（缓存、并发控制）
- [ ] 完善的错误处理和用户提示
- [ ] 日志记录和监控
- [ ] 单元测试和集成测试

## 5. 核心实现要点

### 5.1 Mock 策略 (关键)

**绝对不要**实现真实的生图 API 调用。所有图片生成请求，请直接返回 `https://picsum.photos` 的随机 URL。

**实现要求：**
- 模拟 2-3 秒的延迟（文生图）或 3-4 秒（局部重绘）
- 基于 Prompt 的哈希值生成 seed，确保相同 Prompt 返回相同图片
- 返回的图片 URL 格式：`https://picsum.photos/seed/{seed}/800/600`

### 5.2 LangGraph 状态图

**详细设计参考：** `AGENT_WORKFLOW_DESIGN.md`, `../../docs/agent_state_machine.md`

**核心流程：**
```
Planner → RAG → Executor → Critic → GenUI → END
```

**条件分支：**
- 无风格关键词时跳过 RAG 节点
- Critic 未通过且可重试时返回 RAG 节点（最多 3 次）
- 任何节点失败时进入错误处理流程

### 5.3 SSE 流式传输

**详细设计参考：** `SSE_STREAMING_DESIGN.md`

**事件类型：**
- `thought_log`: 思考日志（关键节点推送）
- `gen_ui_component`: GenUI 组件
- `error`: 错误信息
- `progress`: 进度更新
- `stream_end`: 流结束

**推送时机：**
- Planner 节点开始和完成时
- Executor 节点开始、执行中、完成时
- Critic 节点开始和完成时

### 5.4 错误处理

**详细设计参考：** `ERROR_HANDLING_DESIGN.md`

**错误分类：**
- API 调用错误（可重试）
- 输入验证错误（用户友好提示）
- 业务逻辑错误（引导用户操作）
- 系统资源错误（降级处理）

## 6. 测试验证标准

### 6.1 单元测试
- [ ] 每个节点的输入/输出验证
- [ ] 错误处理逻辑测试
- [ ] 边界情况测试（空输入、超长输入等）

### 6.2 集成测试
- [ ] 完整工作流端到端测试
- [ ] 多模态输入处理测试
- [ ] SSE 流式推送测试

### 6.3 性能测试
- [ ] 单次工作流执行时间 < 5 秒（Mock 延迟除外）
- [ ] 并发 10 个会话的稳定性测试
- [ ] 内存和 CPU 使用率监控

## 7. 约束条件 (Constraints)

- **TypeScript:** 使用严格模式 (Strict Mode)
- **错误处理:** 必须健壮（在 LLM 调用周围添加 try/catch）
- **代码注释:** 需清晰，解释 Agent 每一步的意图
- **API Key:** 必须从 `.env` 文件加载，严禁硬编码
- **Mock 策略:** 不调用真实的生图 API，使用 Picsum 图片

## 8. 相关文档

- **产品规格:** `../../docs/product_spec.md`
- **架构设计:** `../../docs/architecture.md`
- **GenUI 协议:** `../../docs/gen_ui_protocol.md`
- **Agent 工作流设计:** `AGENT_WORKFLOW_DESIGN.md`
- **SSE 流式设计:** `SSE_STREAMING_DESIGN.md`
- **错误处理设计:** `ERROR_HANDLING_DESIGN.md`
- **数据模型设计:** `DATA_MODELS_DESIGN.md`
- **LLM 服务设计:** `LLM_SERVICE_DESIGN.md`
- **知识库初始化:** `KNOWLEDGE_BASE_INIT.md`
- **状态机可视化:** `../../docs/agent_state_machine.md`