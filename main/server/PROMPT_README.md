# 后端实施指南 (NestJS)

**角色：** 高级后端架构师
**任务：** 初始化并开发 AiVista 的 NestJS 后端核心。

## 1. 初始化步骤 (Setup Instructions)
- 在当前目录下创建一个新的 NestJS 项目。
- 安装必要的依赖包：
  - `@nestjs/config` (环境变量管理)
  - `@langchain/langgraph` (图编排核心)
  - `@langchain/openai` (用于兼容 DeepSeek 的 LLM 适配器)
  - `@langchain/core`
  - `vectordb` (Node.js 版 LanceDB)
  - `rxjs` (NestJS 标配)

## 2. 模块架构 (Module Architecture)
采用轻量级领域驱动设计 (DDD)：
- `src/agent/`: 包含 `agent.service.ts` (LangGraph 编排逻辑) 和 `agent.controller.ts` (SSE 端点)。
- `src/knowledge/`: 包含 LanceDB 的封装服务 (KnowledgeService)。
- `src/common/`: 共享的类型定义和守卫 (Guards)。

## 3. 开发优先级 (Implementation Priorities)
1.  **环境配置:** 创建 `.env.example` 文件，包含 `DEEPSEEK_API_KEY`。
2.  **Mock 策略 (关键):** **绝对不要**实现真实的生图 API 调用。所有图片生成请求，请直接返回 `https://picsum.photos` 的随机 URL。
3.  **图逻辑 (Graph Logic):** 按照 `../docs/architecture.md` 中的描述，实现 `Planner -> Executor -> Critic` 的状态机流转。
4.  **SSE 实现:** 确保 Controller 返回 `Observable<MessageEvent>` 以实现实时流式传输。

## 4. 约束条件 (Constraints)
- 使用严格模式的 TypeScript (Strict Mode)。
- 错误处理必须健壮（在 LLM 调用周围添加 try/catch）。
- 代码注释需清晰，解释 Agent 每一步的意图。