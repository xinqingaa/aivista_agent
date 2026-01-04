---
name: Flutter 客户端项目初始化和核心功能实现（修正版）
overview: 使用 flutter_client_sse 实现 SSE 客户端，配置项目依赖，创建项目目录结构，实现 GenUI 渲染器和智能画布组件
todos: []
---

# Flutter 客户端

项目初始化和核心功能实现（修正版）

## 目标

1. 配置项目依赖（使用 `flutter_client_sse` 处理 SSE）
2. 创建项目目录结构（根据设计文档）
3. 实现 SSE 客户端（ChatService，使用 `flutter_client_sse`）
4. 实现 GenUI 渲染器（GenUIRenderer）
5. 实现智能画布组件（SmartCanvas）
6. 实现状态管理（Provider）
7. 创建主页面和基础应用结构

## 实施步骤

### 1. 配置项目依赖

在 `pubspec.yaml` 中添加：

- `flutter_client_sse: ^最新版本` - **SSE 客户端（必须）**
- `provider: ^6.1.1` - 状态管理
- `dio: ^5.4.0` - HTTP 请求（用于非 SSE 的普通请求）
- `shared_preferences: ^2.2.2` - 本地存储
- `uuid: ^4.3.0` - 生成唯一 ID
- `json_annotation: ^4.8.1` - JSON 序列化注解
- `json_serializable: ^6.7.1` - JSON 序列化代码生成

**注意：** 如果 `flutter_client_sse` 包不存在或无法找到，需要：

1. 检查包名是否正确
2. 或使用替代方案（如 `sse` 或 `event_source` 包）
3. 或手动实现 SSE 解析（使用 `http` 包的 `StreamedResponse`）

### 2. 创建项目目录结构

根据 `PROMPT_README.md` 中的结构：

```javascript
lib/
├── main.dart                    # 应用入口
├── app/
│   ├── chat/                    # 聊天页面
│   │   ├── chat_page.dart
│   │   └── chat_service.dart    # SSE 连接服务（使用 flutter_client_sse）
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
│   │   └── genui_list.dart
│   └── providers/               # 状态管理
│       ├── chat_state_provider.dart
│       ├── canvas_state_provider.dart
│       └── agent_state_provider.dart
├── models/                      # 数据模型
│   ├── genui_component.dart
│   ├── sse_event.dart
│   ├── mask_data.dart
│   └── message.dart
└── utils/                       # 工具类
    ├── constants.dart
    └── helpers.dart
```



### 3. 实现数据模型

#### 3.1 GenUI 组件模型（`models/genui_component.dart`）

- `GenUIComponent` - 组件数据模型
- `ActionItem` - 操作项模型
- `SelectOption` - 选择项模型

#### 3.2 SSE 事件模型（`models/sse_event.dart`）

- `SSEEvent` - SSE 事件基础模型
- `ThoughtLogEvent` - 思考日志事件
- `GenUIComponentEvent` - GenUI 组件事件
- `ErrorEvent` - 错误事件
- `ConnectionEvent` - 连接事件
- `StreamEndEvent` - 流结束事件

#### 3.3 画布相关模型（`models/mask_data.dart`）

- `MaskData` - 蒙版数据
- `MaskPath` - 蒙版路径
- `CanvasMode` - 画布模式枚举

#### 3.4 消息模型（`models/message.dart`）

- `Message` - 消息模型
- `MessageRole` - 消息角色枚举

### 4. 实现 SSE 客户端服务（使用 flutter_client_sse）

#### 4.1 ChatService（`app/chat/chat_service.dart`）

**关键实现：**

- 使用 `flutter_client_sse` 包的 `EventSource` 类
- 支持 POST 请求发送消息和蒙版数据
- 解析 SSE 事件流（`event:` 和 `data:` 行）
- 实现重连机制（指数退避）
- 错误处理和超时处理

**参考实现结构：**

```dart
import 'package:flutter_client_sse/flutter_client_sse.dart';

class ChatService {
  EventSource? _eventSource;
  String? _sessionId;
  
  // 连接 SSE 流
  Future<void> connect({
    required String text,
    MaskData? maskData,
    String? sessionId,
  }) async {
    // 使用 EventSource 连接
    _eventSource = EventSource(
      'http://localhost:3000/api/agent/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: jsonEncode({
        'text': text,
        'maskData': maskData?.toJson(),
        'sessionId': sessionId,
      }),
    );
    
    // 监听消息事件
    _eventSource!.onMessage = (MessageEvent event) {
      // 解析 SSE 事件
      _handleSSEEvent(event);
    };
    
    // 监听错误
    _eventSource!.onError = (error) {
      // 处理错误和重连
      _handleError(error);
    };
    
    // 连接
    await _eventSource!.connect();
  }
  
  // 解析 SSE 事件
  void _handleSSEEvent(MessageEvent event) {
    // 解析 event.data 中的 JSON
    // 根据 event.type 分发到不同的事件处理器
  }
  
  // 断开连接
  void disconnect() {
    _eventSource?.close();
    _eventSource = null;
  }
}
```

**注意：** 如果 `flutter_client_sse` 包的 API 不同，需要根据实际包文档调整实现。

### 5. 实现 GenUI 渲染器

#### 5.1 GenUIRenderer（`app/genui/genui_renderer.dart`）

- 工厂类，根据 `widgetType` 创建对应 Widget
- 支持三种组件类型：SmartCanvas、AgentMessage、ActionPanel
- 处理组件更新策略（append/update/replace）

#### 5.2 GenUIList（`app/genui/genui_list.dart`）

- 管理组件列表
- 支持追加、更新、替换操作
- 使用 `RepaintBoundary` 优化性能

#### 5.3 AgentMessageWidget（`app/genui/widgets/agent_message_widget.dart`）

- 显示 AI 消息
- 支持 loading、success、failed 状态
- 显示思考动画

#### 5.4 ActionPanelWidget（`app/genui/widgets/action_panel_widget.dart`）

- 支持按钮、滑块、选择器、输入框
- 处理操作触发回调

#### 5.5 SmartCanvasWidget（`app/genui/widgets/smart_canvas_widget.dart`）

- GenUI 协议中的 SmartCanvas 组件包装器
- 内部使用 `SmartCanvas` 组件

### 6. 实现智能画布组件

#### 6.1 SmartCanvas（`app/canvas/smart_canvas.dart`）

- 图片加载和显示
- 缩放和平移手势（使用 `GestureDetector`）
- 蒙版绘制功能（在 `draw_mask` 模式下）
- 坐标系统转换
- 撤销/重做机制（最多 50 条历史记录）

#### 6.2 CanvasPainter（`app/canvas/canvas_painter.dart`）

- `ImagePainter` - 图片绘制（`CustomPainter`）
- `MaskPainter` - 蒙版绘制（`CustomPainter`）

#### 6.3 CanvasTransform（`app/canvas/canvas_transform.dart`）

- `screenToImage()` - 屏幕坐标转图片坐标
- `imageToScreen()` - 图片坐标转屏幕坐标
- 处理变换矩阵（Matrix4）

### 7. 实现状态管理

#### 7.1 ChatStateProvider（`app/providers/chat_state_provider.dart`）

- 管理消息列表
- 管理 GenUI 组件列表
- 处理组件更新（append/update/replace）
- 继承 `ChangeNotifier`

#### 7.2 CanvasStateProvider（`app/providers/canvas_state_provider.dart`）

- 管理画布状态（图片、蒙版路径、变换）
- 管理历史记录（撤销/重做）
- 继承 `ChangeNotifier`

#### 7.3 AgentStateProvider（`app/providers/agent_state_provider.dart`）

- 管理连接状态
- 管理会话 ID
- 管理当前任务
- 继承 `ChangeNotifier`

### 8. 创建主页面

#### 8.1 ChatPage（`app/chat/chat_page.dart`）

- 集成 GenUIList 显示组件
- 集成输入框发送消息
- 连接 ChatService 接收 SSE 事件
- 处理用户交互（图片点击、蒙版变化、操作触发）

#### 8.2 应用入口（`main.dart`）

- 配置 MultiProvider（ChatStateProvider、CanvasStateProvider、AgentStateProvider）
- 设置深色主题（赛博朋克风格）
- 初始化应用

### 9. 配置和常量

#### 9.1 constants.dart（`utils/constants.dart`）

- API 基础 URL：`http://localhost:3000`
- SSE 端点：`/api/agent/chat`
- 超时配置
- 其他常量

#### 9.2 helpers.dart（`utils/helpers.dart`）

- 辅助函数
- JSON 解析工具
- 坐标转换工具

## 文件创建清单

### 数据模型（models/）

1. `lib/models/genui_component.dart`
2. `lib/models/sse_event.dart`
3. `lib/models/mask_data.dart`
4. `lib/models/message.dart`

### 服务层（app/chat/）

5. `lib/app/chat/chat_service.dart` - **使用 flutter_client_sse**

### Provider（app/providers/）

6. `lib/app/providers/chat_state_provider.dart`
7. `lib/app/providers/canvas_state_provider.dart`
8. `lib/app/providers/agent_state_provider.dart`

### GenUI 组件（app/genui/）

9. `lib/app/genui/genui_renderer.dart`
10. `lib/app/genui/genui_list.dart`
11. `lib/app/genui/widgets/agent_message_widget.dart`
12. `lib/app/genui/widgets/action_panel_widget.dart`
13. `lib/app/genui/widgets/smart_canvas_widget.dart`

### 画布组件（app/canvas/）

14. `lib/app/canvas/smart_canvas.dart`
15. `lib/app/canvas/canvas_painter.dart`
16. `lib/app/canvas/canvas_transform.dart`

### 页面（app/chat/）

17. `lib/app/chat/chat_page.dart`

### 工具类（utils/）

18. `lib/utils/constants.dart`
19. `lib/utils/helpers.dart`

### 更新文件

20. `lib/main.dart` - 更新应用入口
21. `pubspec.yaml` - 添加依赖（**flutter_client_sse**）

## 关于 flutter_client_sse 的说明

### 如果包不存在或无法找到

**方案 1：查找正确的包名**

- 搜索 pub.dev 上的 SSE 相关包
- 可能的替代包：`sse`、`event_source`、`sse_client`

**方案 2：手动实现 SSE 解析**

- 使用 `http` 包的 `StreamedResponse`
- 手动解析 SSE 格式（`event:` 和 `data:` 行）
- 参考 `SSE_STREAMING_DESIGN.md` 中的事件格式

**方案 3：使用 Web 平台的 EventSource**

- 如果是 Web 平台，可以使用 `dart:html` 的 `EventSource`
- 需要平台特定实现

### 推荐的实现方式

根据 `SSE_STREAMING_DESIGN.md` 中的示例，如果 `flutter_client_sse` 包提供类似 JavaScript `EventSource` 的 API，应该：

1. 支持 POST 请求（发送 JSON body）
2. 支持设置请求头（`Content-Type`、`Accept`）
3. 提供 `onMessage` 回调接收事件
4. 提供 `onError` 回调处理错误
5. 提供 `connect()` 方法建立连接
6. 提供 `close()` 方法断开连接

## 实施优先级

### 第一阶段：基础结构（必须）

1. 配置依赖（**确认 flutter_client_sse 包可用性**）
2. 创建目录结构
3. 实现数据模型
4. 实现基础 SSE 客户端（使用 flutter_client_sse）

### 第二阶段：核心功能（必须）

5. 实现 GenUI 渲染器（AgentMessage）
6. 实现智能画布（基础版本）
7. 实现状态管理

### 第三阶段：完整功能（重要）

8. 完善智能画布（手势、坐标转换、蒙版绘制）
9. 实现所有 GenUI 组件类型
10. 实现状态同步
11. 创建主页面

## 注意事项