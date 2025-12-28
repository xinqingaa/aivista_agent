# AiVista 系统架构设计文档 (System Architecture Design)

## 1. 系统概览 (System Overview)
AiVista 是一个基于 Agent（智能体）的 AI 创作平台，核心特色是“智能画布 (Smart Canvas)”。
- **前端 (Frontend):** 使用 Flutter (移动端)。负责渲染 GenUI（生成式界面）并处理用户的绘画手势。
- **后端 (Backend):** 使用 NestJS + LangGraph.js。作为系统的“大脑”，负责编排 AI Agent 的工作流。
- **AI 模型:** 使用 DeepSeek-V3 (通过兼容 OpenAI SDK 调用)。

## 2. 核心业务流程 (Core Flows)

### 2.1 Agent 工作流 (后端核心)
我们使用 `LangGraph` 实现一个有状态的图结构 (State Graph)：
1.  **规划节点 (Planner Node):** 接收用户输入 -> 调用 DeepSeek -> 分析用户意图 (例如：“生成一张图”、“修改选区”、“风格迁移”)。
2.  **RAG 检索节点 (Mocked for MVP):** 搜索本地向量数据库 (LanceDB)，查找对应的风格提示词 (例如：搜索“赛博朋克”返回具体的 Prompt 关键词)。
3.  **执行节点 (Executor Node - Mocked Image Gen):**
    - **注意：** 为了节省成本，此处**不**调用真实的 DALL-E/Midjourney API。
    - **逻辑：** 直接返回一张来自 `picsum.photos` 的随机高清图片 URL。
    - **产出：** 生成包含图片和交互组件的 `GenUI` JSON 数据。
4.  **审查节点 (Critic Node):** 自我反思步骤（MVP 版本可简化为随机通过或简单的关键词检查），模拟质量控制流程。

### 2.2 SSE 流式通信 (Server-Sent Events)
前后端通信严格采用 **流式 (Stream-based)** 机制：
- 客户端建立 SSE 长连接至 `/api/agent/chat`。
- 服务端推送以下类型的事件：
    - `event: thought`: AI 的内部思考日志（用于前端展示“AI 正在思考...”）。
    - `event: gen_ui`: 用于前端渲染组件的 JSON 数据。
    - `event: error`: 错误处理信息。

## 3. 技术栈约束 (Tech Stack Constraints)
- **后端:** NestJS, LangChain/LangGraph, LanceDB (嵌入式向量库), RxJS (处理 SSE)。
- **前端:** Flutter, Provider (状态管理), flutter_client_sse (网络库)。
- **安全:** API Key 必须从 `.env` 文件加载，严禁硬编码。