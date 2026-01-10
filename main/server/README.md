# AiVista 后端服务

AiVista 是一个基于 LangGraph 的智能图像生成 Agent 系统，通过多节点工作流实现意图识别、风格检索和任务执行。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填写 DASHSCOPE_API_KEY
```

### 3. 启动服务

```bash
pnpm run start:dev
```

服务将在 `http://localhost:3000` 启动。

### 4. 测试 API

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只赛博朋克风格的猫"}'
```

## 核心功能

- **Planner Node**: 意图识别，解析用户输入
- **RAG Node**: 向量检索，从知识库检索相关风格
- **Executor Node**: 任务执行，生成图片（当前为 Mock 实现）
- **SSE 流式响应**: 实时推送工作流执行过程
- **知识库管理**: 支持风格数据的检索和管理

## 文档导航

### 安装和配置
- [安装指南](docs/setup/INSTALLATION.md) - 详细的安装和配置说明
- [快速启动](docs/setup/QUICK_START.md) - 快速启动和测试指南

### 工作流
- [工作流指南](docs/workflow/WORKFLOW_GUIDE.md) - 完整的工作流程说明
- [工作流设计](docs/workflow/AGENT_WORKFLOW_DESIGN.md) - 工作流架构设计
- [SSE 流式设计](docs/workflow/SSE_STREAMING_DESIGN.md) - SSE 协议设计

### 知识库
- [知识库初始化](docs/knowledge/KNOWLEDGE_BASE_INIT.md) - 知识库数据和管理

### API
- [Apifox 导入指南](docs/api/APIFOX_IMPORT.md) - 如何导入 API 到 Apifox
- [SSE 调试指南](docs/api/SSE_DEBUG_GUIDE.md) - SSE 流式响应调试

### 设计文档
- [后端实施文档](docs/design/PROMPT_README.md) - 后端实施指南
- [数据模型设计](docs/design/DATA_MODELS_DESIGN.md) - 数据模型定义
- [错误处理设计](docs/design/ERROR_HANDLING_DESIGN.md) - 错误处理机制
- [LLM 服务设计](docs/design/LLM_SERVICE_DESIGN.md) - LLM 服务架构

### 开发
- [开发路线图](docs/development/DEVELOPMENT_ROADMAP.md) - 下一步开发计划

## API 文档

### Swagger UI

启动服务后，访问 Swagger UI 查看完整的 API 文档：

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs-json

### 主要端点

- `POST /api/agent/chat` - Agent 对话接口（SSE 流式响应）
- `GET /api/knowledge/styles` - 获取所有风格列表
- `GET /api/knowledge/search?query=xxx` - 测试检索功能
- `GET /api/knowledge/stats` - 获取知识库统计信息

## 项目结构

```
src/
├── main.ts                 # 应用入口
├── app.module.ts           # 根模块
├── agent/                  # Agent 工作流模块
│   ├── agent.module.ts
│   ├── agent.controller.ts
│   ├── agent.service.ts
│   ├── nodes/              # 工作流节点
│   │   ├── planner.node.ts
│   │   ├── rag.node.ts
│   │   └── executor.node.ts
│   └── graph/              # 状态图定义
│       └── agent.graph.ts
├── knowledge/             # 知识库模块
│   ├── knowledge.module.ts
│   ├── knowledge.service.ts
│   └── data/               # 初始化数据
│       └── initial-styles.ts
├── llm/                    # LLM 服务模块
│   └── services/
└── config/                # 配置模块
    └── configuration.ts
```

## 开发命令

- `pnpm run start:dev` - 开发模式（热重载）
- `pnpm run build` - 构建生产版本
- `pnpm run start:prod` - 运行生产版本
- `pnpm test` - 运行测试

## 当前状态

✅ **Milestone 3 已完成**：
- Planner → RAG → Executor 工作流
- LanceDB 向量数据库集成
- 知识库管理 API
- SSE 流式响应
- 动态 LLM/Embedding 服务切换

📋 **下一步计划**：查看 [开发路线图](docs/development/DEVELOPMENT_ROADMAP.md)

## 注意事项

1. **API Key 配置**：确保 `.env` 文件中的 `DASHSCOPE_API_KEY` 已正确填写
2. **端口配置**：默认端口 3000，可在 `.env` 中修改 `PORT`
3. **CORS 配置**：默认允许所有来源，生产环境建议修改 `CORS_ORIGIN`
