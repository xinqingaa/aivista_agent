# SSE 流式通信详细设计文档 (SSE Streaming Design)

## 1. 目标

本文档详细定义 AiVista 后端与前端之间的 Server-Sent Events (SSE) 流式通信机制，确保能够实时推送 Agent 的思考过程、GenUI 组件和错误信息，实现即梦 AI 的流式交互体验。

**核心目标：**
- 实现可靠的 SSE 长连接
- 支持多种事件类型的实时推送
- 确保流中断时的重连机制
- 提供清晰的错误处理和用户反馈

## 2. SSE 端点设计

### 2.1 端点定义

```
POST /api/agent/chat
Content-Type: application/json
Accept: text/event-stream
```

### 2.2 请求格式

```typescript
interface ChatRequest {
  // 用户文本输入
  text: string;
  
  // 可选的蒙版数据（局部重绘时使用）
  maskData?: {
    base64: string;        // Base64 编码的蒙版图片
    imageUrl: string;      // 原图 URL
    coordinates?: Array<{   // 蒙版路径点（可选，用于调试）
      x: number;
      y: number;
    }>;
  };
  
  // 会话 ID（用于多轮对话）
  sessionId?: string;
  
  // 上下文信息（可选）
  context?: {
    currentImageUrl?: string;  // 当前画布显示的图片
    previousActions?: Array<string>; // 历史操作
  };
}
```

### 2.3 响应格式（SSE 事件流）

SSE 响应遵循标准格式：

```
event: {event_type}
data: {json_data}

event: {event_type}
data: {json_data}

...
```

## 3. 事件类型定义

### 3.1 thought_log（思考日志）

**用途：** 推送 Agent 在关键节点的思考过程，用于前端展示"AI 正在思考..."的动画效果。

**推送时机：**
- Planner 节点开始和完成时
- Executor 节点开始和完成时
- Critic 节点开始和完成时
- RAG 节点检索到结果时

**数据格式：**

```typescript
interface ThoughtLogEvent {
  type: 'thought_log';
  timestamp: number;
  data: {
    node: 'planner' | 'rag' | 'executor' | 'critic' | 'genui';
    message: string;           // 思考内容
    progress?: number;            // 进度百分比 (0-100)，可选
    metadata?: {
      action?: string;          // 当前执行的动作
      confidence?: number;      // 置信度（如果适用）
      [key: string]: any;       // 其他元数据
    };
  };
}
```

**SSE 格式示例：**

```
event: thought_log
data: {"type":"thought_log","timestamp":1709888888000,"data":{"node":"planner","message":"正在分析用户意图...","progress":20}}

event: thought_log
data: {"type":"thought_log","timestamp":1709888888500,"data":{"node":"planner","message":"已识别意图：generate_image，置信度：0.95","progress":100}}
```

**前端处理：**
- 接收到 `thought_log` 事件时，在聊天界面显示思考动画
- 可以显示节点名称和思考内容
- 支持进度条显示（如果有 `progress` 字段）

---

### 3.2 gen_ui_component（GenUI 组件）

**用途：** 推送需要前端渲染的 UI 组件（SmartCanvas、AgentMessage、ActionPanel）。

**推送时机：**
- Agent 完成某个阶段，需要展示结果时
- 需要用户交互时（如显示 ActionPanel）
- 状态更新需要更新已有组件时

**数据格式：**

```typescript
interface GenUIComponentEvent {
  type: 'gen_ui_component';
  timestamp: number;
  data: {
    id?: string;              // 组件唯一 ID（用于更新已有组件）
    widgetType: 'SmartCanvas' | 'AgentMessage' | 'ActionPanel';
    props: {
      // SmartCanvas 属性
      imageUrl?: string;
      mode?: 'view' | 'draw_mask';
      ratio?: number;
      
      // AgentMessage 属性
      state?: 'success' | 'loading' | 'failed';
      text?: string;
      isThinking?: boolean;
      
      // ActionPanel 属性
      actions?: Array<{
        id: string;
        label: string;
        type: 'button' | 'slider' | 'select';
        min?: number;
        max?: number;
        value?: any;
        options?: Array<{ label: string; value: any }>;
      }>;
      
      [key: string]: any;      // 其他动态属性
    };
    updateMode?: 'append' | 'replace' | 'update'; // 更新模式，默认 'append'
    targetId?: string;        // 如果 updateMode 为 'update'，指定要更新的组件 ID
  };
}
```

**SSE 格式示例：**

```
event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1709888890000,"data":{"widgetType":"AgentMessage","props":{"state":"success","text":"我已经为您生成了一张赛博朋克风格的猫。","isThinking":false}}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1709888891000,"data":{"id":"canvas_001","widgetType":"SmartCanvas","props":{"imageUrl":"https://picsum.photos/seed/123/800/600","mode":"view","ratio":1.5}}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1709888892000,"data":{"widgetType":"ActionPanel","props":{"actions":[{"id":"style_strength","label":"风格化强度","type":"slider","min":0,"max":100,"value":50}]}}}
```

**前端处理：**
- 根据 `updateMode` 决定是追加、替换还是更新组件
- 如果 `id` 存在且 `updateMode` 为 'update'，更新对应 ID 的组件
- 否则追加到聊天列表末尾

---

### 3.3 error（错误事件）

**用途：** 推送错误信息，用于前端显示错误提示。

**推送时机：**
- API 调用失败时
- 节点执行出错时
- 输入验证失败时
- 工作流异常中断时

**数据格式：**

```typescript
interface ErrorEvent {
  type: 'error';
  timestamp: number;
  data: {
    code: string;             // 错误代码
    message: string;          // 错误消息（用户友好）
    node?: string;            // 出错的节点名称
    details?: string;        // 详细错误信息（用于调试）
    recoverable?: boolean;   // 是否可恢复
    retryable?: boolean;     // 是否可重试
    retryAfter?: number;     // 重试等待时间（秒）
  };
}
```

**错误代码定义：**

| 错误代码 | 说明 | 可恢复 | 可重试 |
|---------|------|--------|--------|
| `DEEPSEEK_API_ERROR` | DeepSeek API 调用失败 | 是 | 是 |
| `INVALID_INPUT` | 用户输入无效 | 是 | 否 |
| `MASK_DATA_MISSING` | 局部重绘缺少蒙版数据 | 是 | 否 |
| `EXECUTION_TIMEOUT` | 执行超时 | 是 | 是 |
| `VECTOR_DB_ERROR` | 向量数据库错误 | 是 | 是 |
| `WORKFLOW_ERROR` | 工作流执行错误 | 否 | 是 |
| `UNKNOWN_ERROR` | 未知错误 | 否 | 否 |

**SSE 格式示例：**

```
event: error
data: {"type":"error","timestamp":1709888900000,"data":{"code":"DEEPSEEK_API_ERROR","message":"AI 服务暂时不可用，请稍后重试","node":"planner","recoverable":true,"retryable":true,"retryAfter":5}}
```

**前端处理：**
- 显示错误消息（使用 AgentMessage 组件，state='failed'）
- 如果 `retryable` 为 true，显示重试按钮
- 如果 `recoverable` 为 false，可能需要重置会话

---

### 3.4 progress（进度事件）

**用途：** 推送任务执行进度，用于前端显示进度条。

**推送时机：**
- 长时间运行的任务（如图片生成）进行中
- 可以定期推送进度更新

**数据格式：**

```typescript
interface ProgressEvent {
  type: 'progress';
  timestamp: number;
  data: {
    task: string;            // 任务名称
    progress: number;        // 进度百分比 (0-100)
    message?: string;        // 进度描述
    estimatedTimeRemaining?: number; // 预计剩余时间（秒）
  };
}
```

**SSE 格式示例：**

```
event: progress
data: {"type":"progress","timestamp":1709888910000,"data":{"task":"generate_image","progress":50,"message":"正在生成图片...","estimatedTimeRemaining":2}}
```

**前端处理：**
- 在对应的 UI 组件上显示进度条
- 可以显示预计剩余时间

---

### 3.5 stream_end（流结束事件）

**用途：** 标记 SSE 流正常结束。

**推送时机：**
- Agent 工作流完成，所有结果已推送
- 正常关闭连接时

**数据格式：**

```typescript
interface StreamEndEvent {
  type: 'stream_end';
  timestamp: number;
  data: {
    sessionId: string;       // 会话 ID
    summary?: string;        // 执行摘要（可选）
  };
}
```

**SSE 格式示例：**

```
event: stream_end
data: {"type":"stream_end","timestamp":1709888920000,"data":{"sessionId":"session_123","summary":"任务完成"}}
```

**前端处理：**
- 关闭 SSE 连接
- 可以显示完成提示

---

## 4. 推送时机详细说明

### 4.1 Planner 节点

```typescript
// 节点开始
await pushSSEEvent({
  type: 'thought_log',
  data: {
    node: 'planner',
    message: '正在分析用户意图...',
    progress: 10
  }
});

// 节点完成
await pushSSEEvent({
  type: 'thought_log',
  data: {
    node: 'planner',
    message: `已识别意图：${intent.action}，置信度：${intent.confidence}`,
    progress: 100,
    metadata: {
      action: intent.action,
      confidence: intent.confidence
    }
  }
});
```

### 4.2 RAG 节点

```typescript
// 检索开始
await pushSSEEvent({
  type: 'thought_log',
  data: {
    node: 'rag',
    message: '正在检索风格库...',
    progress: 30
  }
});

// 检索完成
if (results.length > 0) {
  await pushSSEEvent({
    type: 'thought_log',
    data: {
      node: 'rag',
      message: `检索到 ${results.length} 条相关风格`,
      progress: 100,
      metadata: {
        styles: results.map(r => r.style)
      }
    }
  });
}
```

### 4.3 Executor 节点

```typescript
// 执行开始
await pushSSEEvent({
  type: 'thought_log',
  data: {
    node: 'executor',
    message: `开始执行任务：${action}`,
    progress: 40
  }
});

// 执行中（如果是长时间任务）
await pushSSEEvent({
  type: 'progress',
  data: {
    task: action,
    progress: 60,
    message: '正在生成图片...',
    estimatedTimeRemaining: 2
  }
});

// 执行完成
await pushSSEEvent({
  type: 'thought_log',
  data: {
    node: 'executor',
    message: '任务执行完成',
    progress: 100
  }
});

// 推送结果组件
await pushSSEEvent({
  type: 'gen_ui_component',
  data: {
    widgetType: 'SmartCanvas',
    props: {
      imageUrl: executionResult.imageUrl,
      mode: 'view'
    }
  }
});
```

### 4.4 Critic 节点

```typescript
// 审查开始
await pushSSEEvent({
  type: 'thought_log',
  data: {
    node: 'critic',
    message: '开始质量审查...',
    progress: 80
  }
});

// 审查完成
await pushSSEEvent({
  type: 'thought_log',
  data: {
    node: 'critic',
    message: `审查完成，得分：${score.toFixed(2)}，${passed ? '通过' : '未通过'}`,
    progress: 100,
    metadata: {
      score,
      passed
    }
  }
});
```

## 5. 错误处理与重连机制

### 5.1 流中断处理

**后端处理：**

```typescript
@Post('chat')
async chat(
  @Body() request: ChatRequest,
  @Res() response: Response
): Promise<void> {
  // 设置 SSE 响应头
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

  try {
    // 发送初始连接确认
    response.write(`event: connection\n`);
    response.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

    // 执行工作流并流式推送
    for await (const event of executeWorkflowStream(initialState)) {
      // 检查客户端是否断开连接
      if (response.destroyed) {
        console.log('Client disconnected');
        break;
      }

      // 推送事件
      response.write(`event: ${event.type}\n`);
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // 发送流结束事件
    response.write(`event: stream_end\n`);
    response.write(`data: ${JSON.stringify({ sessionId: request.sessionId })}\n\n`);

  } catch (error) {
    // 推送错误事件
    response.write(`event: error\n`);
    response.write(`data: ${JSON.stringify({
      type: 'error',
      data: {
        code: 'STREAM_ERROR',
        message: '流式传输出错',
        details: error.message
      }
    })}\n\n`);
  } finally {
    response.end();
  }
}
```

**前端处理：**

```dart
// Flutter SSE 客户端处理
class ChatService {
  EventSource? _eventSource;
  
  Future<void> connect({
    required String text,
    MaskData? maskData,
    required Function(SSEEvent) onEvent,
    required Function(dynamic) onError,
  }) async {
    try {
      _eventSource = EventSource(
        '/api/agent/chat',
        method: 'POST',
        body: jsonEncode({
          'text': text,
          'maskData': maskData?.toJson(),
        }),
      );

      _eventSource!.onMessage = (MessageEvent event) {
        final data = jsonDecode(event.data);
        onEvent(SSEEvent.fromJson(data));
      };

      _eventSource!.onError = (error) {
        onError(error);
        // 自动重连逻辑
        _reconnect();
      };

      await _eventSource!.connect();
    } catch (e) {
      onError(e);
    }
  }

  void _reconnect() {
    // 指数退避重连
    Future.delayed(Duration(seconds: 2), () {
      if (_eventSource?.readyState != ReadyState.open) {
        connect(/* ... */);
      }
    });
  }

  void disconnect() {
    _eventSource?.close();
  }
}
```

### 5.2 心跳机制

为了保持连接活跃，可以定期发送心跳：

```typescript
// 每 30 秒发送一次心跳
setInterval(() => {
  if (!response.destroyed) {
    response.write(`event: heartbeat\n`);
    response.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
  }
}, 30000);
```

### 5.3 超时处理

```typescript
// 设置总超时时间（5 分钟）
const timeout = setTimeout(() => {
  if (!response.destroyed) {
    response.write(`event: error\n`);
    response.write(`data: ${JSON.stringify({
      type: 'error',
      data: {
        code: 'TIMEOUT',
        message: '请求超时，请重试'
      }
    })}\n\n`);
    response.end();
  }
}, 5 * 60 * 1000);

// 工作流完成后清除超时
// clearTimeout(timeout);
```

## 6. 性能优化

### 6.1 事件批处理

对于短时间内产生的多个事件，可以批量推送：

```typescript
const eventBuffer: SSEEvent[] = [];

function flushEvents() {
  if (eventBuffer.length > 0) {
    const batch = eventBuffer.splice(0);
    response.write(`event: batch\n`);
    response.write(`data: ${JSON.stringify({ events: batch })}\n\n`);
  }
}

// 每 100ms 或缓冲区达到 5 个事件时刷新
setInterval(flushEvents, 100);
```

### 6.2 压缩传输

对于大型数据（如 Base64 蒙版），可以考虑压缩：

```typescript
import * as zlib from 'zlib';

function compressData(data: any): string {
  const json = JSON.stringify(data);
  const compressed = zlib.gzipSync(json);
  return compressed.toString('base64');
}
```

## 7. 安全考虑

### 7.1 请求验证

```typescript
@Post('chat')
@UseGuards(AuthGuard) // 如果需要认证
async chat(@Body() request: ChatRequest) {
  // 验证输入
  if (!request.text || request.text.trim().length === 0) {
    throw new BadRequestException('文本输入不能为空');
  }

  // 验证蒙版数据大小
  if (request.maskData?.base64) {
    const size = Buffer.from(request.maskData.base64, 'base64').length;
    if (size > 10 * 1024 * 1024) { // 10MB 限制
      throw new BadRequestException('蒙版数据过大');
    }
  }
}
```

### 7.2 速率限制

```typescript
@Post('chat')
@UseGuards(ThrottlerGuard) // 使用 @nestjs/throttler
async chat() {
  // 限制每个 IP 每分钟最多 10 次请求
}
```

## 8. 测试验证

### 8.1 单元测试

```typescript
describe('SSE Streaming', () => {
  it('should push thought_log events', async () => {
    const events: SSEEvent[] = [];
    const mockResponse = createMockResponse((event) => events.push(event));
    
    await agentController.chat(mockRequest, mockResponse);
    
    expect(events.some(e => e.type === 'thought_log')).toBe(true);
  });
});
```

### 8.2 集成测试

使用工具如 `curl` 或 Postman 测试 SSE 流：

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只猫"}'
```

