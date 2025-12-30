# 前端实施指南 (Flutter)

**角色：** 高级 Flutter 工程师
**任务：** 初始化并开发 AiVista 的 Flutter 移动端应用。

## 1. 项目结构说明

```
lib/
├── main.dart                    # 应用入口
├── app/
│   ├── chat/                    # 聊天页面
│   │   ├── chat_page.dart
│   │   └── chat_service.dart    # SSE 连接服务
│   ├── canvas/                  # 智能画布
│   │   ├── smart_canvas.dart
│   │   ├── canvas_painter.dart
│   │   └── canvas_transform.dart
│   ├── genui/                   # GenUI 渲染器
│   │   ├── genui_renderer.dart
│   │   ├── widgets/
│   │   │   ├── smart_canvas_widget.dart
│   │   │   ├── agent_message_widget.dart
│   │   │   └── action_panel_widget.dart
│   └── providers/               # 状态管理
│       ├── chat_state_provider.dart
│       ├── canvas_state_provider.dart
│       └── agent_state_provider.dart
├── models/                      # 数据模型
│   ├── genui_component.dart
│   ├── mask_data.dart
│   └── message.dart
└── utils/                       # 工具类
    ├── coordinate_transform.dart
    └── state_persistence.dart
```

## 2. 初始化步骤 (Setup Instructions)

- 在当前目录下创建一个新的 Flutter 项目。
- 添加核心依赖包：
  - `flutter_client_sse` (用于处理 Server-Sent Events)
  - `provider` (状态管理 - 保持简单高效)
  - `dio` (如有普通 HTTP 请求需求)
  - `json_annotation` & `json_serializable` (JSON 序列化)
  - `shared_preferences` (本地存储)

## 3. 核心模块依赖关系

```
ChatPage
  ├── ChatService (SSE 连接)
  ├── GenUIRenderer (组件渲染)
  │   ├── SmartCanvasWidget
  │   ├── AgentMessageWidget
  │   └── ActionPanelWidget
  └── Providers
      ├── ChatStateProvider
      ├── CanvasStateProvider
      └── AgentStateProvider

SmartCanvas
  ├── CanvasTransform (坐标转换)
  ├── ImagePainter (图片绘制)
  ├── MaskPainter (蒙版绘制)
  └── CanvasStateProvider (状态管理)
```

## 4. 核心功能开发 (Core Features)

### 4.1 GenUI 渲染器 (GenUI Renderer)

实现一个工厂 Widget，它接收来自 `../docs/gen_ui_protocol.md` 的 JSON 数据，并返回对应的 Flutter Widget。

**详细设计参考：** `GENUI_RENDERER_DESIGN.md`

**关键实现点：**
- 组件工厂模式：根据 `widgetType` 动态创建 Widget
- 支持三种组件类型：SmartCanvas、AgentMessage、ActionPanel
- 组件更新策略：追加、替换、更新已有组件
- 流式渲染：实时解析 SSE 数据流并渲染

### 4.2 智能画布 (SmartCanvas)

**详细设计参考：** `SMART_CANVAS_DESIGN.md`

**核心功能：**
- 使用 `CustomPainter` 实现图片和蒙版绘制
- 支持三种交互手势：
  - **缩放 (Pinch)**: 双指缩放，范围 0.5x - 5x
  - **平移 (Pan)**: 单指拖动，在查看模式下平移图片
  - **绘制 (Draw)**: 在绘制模式下绘制红色蒙版路径
- 坐标转换：屏幕坐标 ↔ 图片逻辑坐标
- 撤销/重做：支持操作历史栈（最多 50 条）
- 性能优化：使用 `RepaintBoundary` 避免不必要的重绘

**坐标系统参考：** `../../docs/canvas_coordinate_system.md`

### 4.3 状态管理 (State Management)

**详细设计参考：** `STATE_MANAGEMENT_DESIGN.md`

**状态分离：**
- **ChatState**: 聊天消息、GenUI 组件列表
- **CanvasState**: 画布状态（图片、蒙版路径、历史记录）
- **AgentState**: Agent 连接状态、当前任务

**状态同步：**
- 画布状态与 Agent 响应的自动同步
- 蒙版数据变化时自动通知后端

### 4.4 聊天页面 (ChatPage)

一个可滚动的列表视图，实时渲染从 SSE 流接收到的 UI 组件。

**功能要求：**
- 支持流式渲染（组件实时追加）
- 支持组件更新和替换
- 错误处理和重连机制

## 5. 开发优先级和里程碑

### 里程碑 1：基础通路 (Baseline)
- [ ] 搭建 Flutter 项目结构
- [ ] 实现 SSE 连接服务 (ChatService)
- [ ] 实现基础的 GenUI 渲染器（仅 AgentMessage）
- [ ] 验证：前端能接收并显示 Agent 的文本回复

### 里程碑 2：智能画布 (Smart Canvas)
- [ ] 实现 SmartCanvas 组件
- [ ] 实现图片加载和显示
- [ ] 实现基础的手势交互（缩放、平移）
- [ ] 验证：用户能查看和操作图片

### 里程碑 3：蒙版绘制 (Mask Drawing)
- [ ] 实现蒙版绘制功能
- [ ] 实现坐标转换系统
- [ ] 实现撤销/重做功能
- [ ] 验证：用户能绘制蒙版并发送到后端

### 里程碑 4：完整 GenUI (Full GenUI)
- [ ] 实现所有组件类型（SmartCanvas、AgentMessage、ActionPanel）
- [ ] 实现组件更新策略
- [ ] 实现状态管理（Provider）
- [ ] 验证：完整的即梦复刻流程跑通

### 里程碑 5：优化与完善 (Polish)
- [ ] 性能优化（RepaintBoundary、路径简化）
- [ ] 状态持久化（SharedPreferences）
- [ ] 错误处理和用户提示
- [ ] UI/UX 优化

## 6. 约束条件 (Constraints)

- **逻辑隔离:** UI 代码中不能包含网络请求逻辑。请创建一个 `ChatService` 专门处理 SSE 连接。
- **视觉风格:** 默认使用深色主题 (Dark Theme)，偏向赛博朋克风格 (Cyberpunk style)。
- **性能要求:** 画布绘制帧率 ≥ 60fps，蒙版路径简化以减少内存占用。
- **代码规范:** 遵循 Flutter 官方代码规范，使用 `dart format` 格式化代码。

## 7. 测试验证标准

### 7.1 功能测试
- [ ] SSE 连接正常，能接收流式数据
- [ ] GenUI 组件正确渲染
- [ ] 画布交互流畅（缩放、平移、绘制）
- [ ] 坐标转换准确（蒙版位置正确）
- [ ] 撤销/重做功能正常

### 7.2 性能测试
- [ ] 画布绘制帧率 ≥ 60fps
- [ ] 大量蒙版路径（>1000 点）不卡顿
- [ ] 内存占用合理（< 200MB）

### 7.3 边界情况测试
- [ ] 网络断开时的重连机制
- [ ] 无效 JSON 数据的处理
- [ ] 图片加载失败的处理
- [ ] 超大图片的处理（> 10MB）

## 8. 相关文档

- **产品规格:** `../../docs/product_spec.md`
- **GenUI 协议:** `../../docs/gen_ui_protocol.md`
- **架构设计:** `../../docs/architecture.md`
- **智能画布设计:** `SMART_CANVAS_DESIGN.md`
- **GenUI 渲染器设计:** `GENUI_RENDERER_DESIGN.md`
- **状态管理设计:** `STATE_MANAGEMENT_DESIGN.md`
- **坐标系统:** `../../docs/canvas_coordinate_system.md`