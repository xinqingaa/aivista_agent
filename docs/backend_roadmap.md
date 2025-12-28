# 后端架构实施路径 (Backend Roadmap)

**目标：** 构建基于 NestJS + LangGraph 的 Agent 编排服务。

## 📅 里程碑 1：基础通路 (Baseline)
- **任务:** 搭建 NestJS + SSE (Server-Sent Events) + DeepSeek 直连。
- **验证:** 前端发送 "hello"，后端调用 DeepSeek，前端能看到流式回复。
- **产出:** `AgentController` (处理 SSE), `DeepSeekService` (基础调用).

## 📅 里程碑 2：大脑构建 (The Brain)
- **任务:** 引入 `LangGraph`。
- **逻辑:**
    1.  定义 `AgentState` (messages, current_img, ui_components).
    2.  实现 **Planner Node**: 解析用户意图 (JSON Output).
    3.  实现 **Executor Node**: 根据意图执行 Mock 生图逻辑。
- **验证:** 用户输入 "画只猫"，后端日志显示 Planner 解析成功，并返回 Picsum 图片链接。

## 📅 里程碑 3：记忆与协议 (Memory & Protocol)
- **任务:** 集成 LanceDB (RAG) 和 GenUI 封装。
- **逻辑:**
    1.  **RAG Node:** 在 Planner 和 Executor 之间插入检索层。
    2.  **GenUI Factory:** 将 Agent 的执行结果包装成符合 `gen_ui_schema.md` 的 JSON。
- **验证:** 完整的即梦复刻流程跑通。