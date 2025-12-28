# 前端实施指南 (Flutter)

**角色：** 高级 Flutter 工程师
**任务：** 初始化并开发 AiVista 的 Flutter 移动端应用。

## 1. 初始化步骤 (Setup Instructions)
- 在当前目录下创建一个新的 Flutter 项目。
- 添加核心依赖包：
  - `flutter_client_sse` (用于处理 Server-Sent Events)
  - `provider` (状态管理 - 保持简单高效)
  - `dio` (如有普通 HTTP 请求需求)
  - `json_annotation` & `json_serializable` (JSON 序列化)

## 2. 核心功能开发 (Core Features)
1.  **GenUI 渲染器 (GenUI Renderer):** 实现一个工厂 Widget，它接收来自 `../docs/gen_ui_protocol.md` 的 JSON 数据，并返回对应的 Flutter Widget (`SmartCanvas`, `AgentMessage` 等)。
2.  **智能画布 (SmartCanvas):**
    - 必须使用 `CustomPainter` 实现，支持用户在图片上绘制红色的蒙版 (Mask) 路径。
    - 必须使用 `RepaintBoundary` 进行性能优化，避免重绘导致卡顿。
    - 需要实现坐标转换逻辑：将屏幕像素坐标 (Screen pixels) 转换为图片内部逻辑坐标 (Image pixels)。
3.  **聊天页面 (ChatPage):** 一个可滚动的列表视图，实时渲染从 SSE 流接收到的 UI 组件。

## 3. 约束条件 (Constraints)
- **逻辑隔离:** UI 代码中不能包含网络请求逻辑。请创建一个 `ChatService` 专门处理 SSE 连接。
- **视觉风格:** 默认使用深色主题 (Dark Theme)，偏向赛博朋克风格 (Cyberpunk style)。