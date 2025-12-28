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
│   └── graph/                   # 状态图定义
│       └── agent.graph.ts
├── knowledge/                   # 知识库模块
│   ├── knowledge.module.ts
│   └── knowledge.service.ts     # LanceDB 封装
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
  - `@langchain/openai` (用于兼容 DeepSeek 的 LLM 适配器)
  - `@langchain/core`
  - `vectordb` (Node.js 版 LanceDB)
  - `rxjs` (NestJS 标配)
  - `class-validator`, `class-transformer` (数据验证)

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
- [ ] 搭建 NestJS 项目结构
- [ ] 配置环境变量（`.env.example`）
- [ ] 实现 DeepSeek 服务封装
- [ ] 实现基础的 SSE 端点
- [ ] 验证：前端能连接并接收流式数据

### 里程碑 2：大脑构建 (The Brain)
- [ ] 引入 LangGraph
- [ ] 定义 AgentState 数据结构
- [ ] 实现 Planner Node（意图解析）
- [ ] 实现 Executor Node（Mock 生图）
- [ ] 验证：用户输入 "画只猫"，后端能解析并返回 Mock 图片

### 里程碑 3：记忆与协议 (Memory & Protocol)
- [ ] 集成 LanceDB（RAG Node）
- [ ] 实现 GenUI 组件生成
- [ ] 实现完整的 SSE 事件推送（thought_log, gen_ui_component）
- [ ] 验证：完整的即梦复刻流程跑通

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
- **状态机可视化:** `../../docs/agent_state_machine.md`