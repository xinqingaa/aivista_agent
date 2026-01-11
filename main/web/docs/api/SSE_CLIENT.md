# SSE 客户端实现 (SSE Client Implementation)

## 1. 概述

本文档详细说明如何在前端实现 Server-Sent Events (SSE) 客户端，用于接收后端 Agent 工作流的流式响应。

## 2. SSE 基础

### 2.1 什么是 SSE

Server-Sent Events (SSE) 是一种服务器向客户端推送数据的机制，基于 HTTP 长连接。

**特点：**
- 单向通信（服务器 → 客户端）
- 自动重连（浏览器原生支持）
- 基于文本格式（UTF-8）

### 2.2 与 WebSocket 的区别

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| 通信方向 | 单向（服务器→客户端） | 双向 |
| 协议 | HTTP | WS/WSS |
| 重连 | 自动 | 需手动实现 |
| 数据格式 | 文本 | 二进制/文本 |
| 复杂度 | 简单 | 较复杂 |

**选择 SSE 的理由：**
- 后端已使用 SSE
- 只需接收数据，无需双向通信
- 实现简单，浏览器原生支持

## 3. 实现方案

### 3.1 问题：原生 EventSource 不支持 POST

**问题：**
- 原生 `EventSource` API 只支持 GET 请求
- 后端 `/api/agent/chat` 需要 POST 请求（发送文本和蒙版数据）

**解决方案：**
1. 使用 `fetch` + `ReadableStream` 实现 POST SSE
2. 手动解析 SSE 格式

### 3.2 实现代码

```typescript
// lib/sse/sse-client.ts
export interface SSEOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
}

export class SSEClient {
  private abortController: AbortController | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor(private url: string) {}

  connect(options: SSEOptions = {}): () => void {
    const {
      method = 'GET',
      headers = {},
      body,
      onMessage,
      onError,
      onOpen,
      onClose,
    } = options;

    // 取消之前的连接
    this.disconnect();

    // 创建新的 AbortController
    this.abortController = new AbortController();

    // 建立连接
    this._connect(method, headers, body, onMessage, onError, onOpen, onClose);

    // 返回断开连接的函数
    return () => this.disconnect();
  }

  private async _connect(
    method: string,
    headers: Record<string, string>,
    body: string | undefined,
    onMessage?: (event: SSEEvent) => void,
    onError?: (error: Error) => void,
    onOpen?: () => void,
    onClose?: () => void
  ) {
    try {
      const response = await fetch(this.url, {
        method,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...headers,
        },
        body,
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE连接失败: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      // 调用 onOpen 回调
      onOpen?.();

      // 重置重连次数
      this.reconnectAttempts = 0;

      // 读取流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onClose?.();
          break;
        }

        // 解码数据
        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE 事件
        const events = this._parseSSE(buffer);
        buffer = events.remaining;

        // 处理事件
        for (const event of events.events) {
          if (event.type && event.data) {
            try {
              const data = JSON.parse(event.data);
              onMessage?.({
                type: event.type,
                data,
                id: event.id,
                retry: event.retry,
              });
            } catch (err) {
              console.error('解析SSE数据失败:', err);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 主动断开，不触发错误
        return;
      }

      onError?.(error instanceof Error ? error : new Error('未知错误'));

      // 自动重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        setTimeout(() => {
          this._connect(method, headers, body, onMessage, onError, onOpen, onClose);
        }, delay);
      } else {
        onClose?.();
      }
    }
  }

  private _parseSSE(buffer: string): {
    events: Array<{ type?: string; data?: string; id?: string; retry?: number }>;
    remaining: string;
  } {
    const events: Array<{
      type?: string;
      data?: string;
      id?: string;
      retry?: number;
    }> = [];
    let currentEvent: {
      type?: string;
      data?: string;
      id?: string;
      retry?: number;
    } = {};

    const lines = buffer.split('\n');
    let remaining = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 空行表示事件结束
      if (line === '') {
        if (currentEvent.type || currentEvent.data) {
          events.push(currentEvent);
          currentEvent = {};
        }
        continue;
      }

      // 解析字段
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        // 没有冒号，可能是最后一行不完整
        if (i === lines.length - 1) {
          remaining = line;
          break;
        }
        continue;
      }

      const field = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (field) {
        case 'event':
          currentEvent.type = value;
          break;
        case 'data':
          currentEvent.data = currentEvent.data
            ? `${currentEvent.data}\n${value}`
            : value;
          break;
        case 'id':
          currentEvent.id = value;
          break;
        case 'retry':
          currentEvent.retry = parseInt(value, 10);
          break;
      }
    }

    // 如果还有未处理的数据，保留在 remaining 中
    if (remaining === '' && currentEvent.type) {
      remaining = buffer.substring(buffer.lastIndexOf('\n') + 1);
    }

    return { events, remaining };
  }

  disconnect() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
```

## 4. React Hook 封装

### 4.1 useSSE Hook

```typescript
// hooks/useSSE.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { SSEClient, SSEEvent } from '@/lib/sse/sse-client';

export interface UseSSEOptions {
  url: string;
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useSSE(options: UseSSEOptions) {
  const {
    url,
    method = 'POST',
    body,
    headers,
    enabled = true,
    onMessage,
    onError,
    onOpen,
    onClose,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<SSEClient | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !url) return;

    const client = new SSEClient(url);
    clientRef.current = client;

    const disconnect = client.connect({
      method,
      headers,
      body,
      onMessage: (event) => {
        onMessage?.(event);
      },
      onError: (err) => {
        setError(err);
        setIsConnected(false);
        onError?.(err);
      },
      onOpen: () => {
        setIsConnected(true);
        setError(null);
        onOpen?.();
      },
      onClose: () => {
        setIsConnected(false);
        onClose?.();
      },
    });

    disconnectRef.current = disconnect;
  }, [url, method, body, headers, enabled, onMessage, onError, onOpen, onClose]);

  const disconnect = useCallback(() => {
    if (disconnectRef.current) {
      disconnectRef.current();
      disconnectRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
}
```

## 5. Agent 聊天 Hook

### 5.1 useAgentChat Hook

```typescript
// hooks/useAgentChat.ts
import { useState, useCallback } from 'react';
import { useSSE, SSEEvent } from './useSSE';
import { API_ENDPOINTS } from '@/lib/api/client';

export interface ChatRequest {
  text: string;
  maskData?: {
    base64: string;
    imageUrl: string;
    coordinates?: Array<{ x: number; y: number }>;
  };
  sessionId?: string;
  preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  components?: any[];
  enhancedPrompt?: {
    original: string;
    retrieved: Array<{
      style: string;
      prompt: string;
      similarity: number;
    }>;
    final: string;
  };
  progress?: number;
  progressMessage?: string;
  error?: {
    code: string;
    message: string;
    node?: string;
    retryable?: boolean;
  };
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const { isConnected, error, connect, disconnect } = useSSE({
    url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${API_ENDPOINTS.AGENT.CHAT}`,
    method: 'POST',
    enabled: false, // 手动控制连接
    onMessage: (event: SSEEvent) => {
      handleSSEEvent(event);
    },
    onOpen: () => {
      setIsConnecting(false);
    },
    onError: (err) => {
      setIsConnecting(false);
      console.error('SSE错误:', err);
    },
  });

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'connection':
        if (event.data.sessionId) {
          setSessionId(event.data.sessionId);
        }
        break;

      case 'thought_log':
        // 添加思考日志消息
        setMessages((prev) => [
          ...prev,
          {
            id: `thought-${Date.now()}`,
            type: 'assistant',
            content: event.data.message,
            timestamp: event.timestamp || Date.now(),
          },
        ]);
        break;

      case 'enhanced_prompt':
        // 处理增强 Prompt 事件（RAG 检索结果）
        // 存储增强 Prompt 信息，用于展示检索到的风格
        setMessages((prev) => [
          ...prev,
          {
            id: `enhanced-prompt-${Date.now()}`,
            type: 'assistant',
            content: '',
            timestamp: event.timestamp || Date.now(),
            enhancedPrompt: event.data, // 存储增强 Prompt 数据
          },
        ]);
        break;

      case 'gen_ui_component':
        // 添加 GenUI 组件
        setMessages((prev) => [
          ...prev,
          {
            id: `component-${Date.now()}`,
            type: 'assistant',
            content: '',
            timestamp: event.timestamp || Date.now(),
            components: [event.data],
          },
        ]);
        break;

      case 'progress':
        // 处理进度事件（可选）
        // 可以更新进度条或显示进度信息
        setMessages((prev) => {
          // 更新最后一条消息的进度，或添加新的进度消息
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === 'assistant') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                progress: event.data.progress,
                progressMessage: event.data.message,
              },
            ];
          }
          return prev;
        });
        break;

      case 'error':
        // 添加错误消息
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            type: 'system',
            content: event.data.message || '发生错误',
            timestamp: event.timestamp || Date.now(),
            error: event.data, // 存储错误详情
          },
        ]);
        break;

      case 'stream_end':
        disconnect();
        break;

      case 'heartbeat':
        // 心跳事件，保持连接活跃（通常不需要处理）
        break;
    }
  }, [disconnect]);

  const sendMessage = useCallback(
    async (request: ChatRequest) => {
      // 添加用户消息
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          type: 'user',
          content: request.text,
          timestamp: Date.now(),
        },
      ]);

      // 建立 SSE 连接
      setIsConnecting(true);
      connect();

      // 发送请求（通过 POST body）
      // 注意：这里需要修改 useSSE 以支持动态 body
      // 或者使用其他方式发送请求
    },
    [connect]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    disconnect();
  }, [disconnect]);

  return {
    messages,
    sessionId,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    clearMessages,
  };
}
```

## 6. 事件处理

### 6.1 事件类型定义

```typescript
// lib/types/sse.ts
export interface ConnectionEvent {
  type: 'connection';
  timestamp: number;
  data: {
    status: 'connected';
    sessionId: string;
  };
}

export interface ThoughtLogEvent {
  type: 'thought_log';
  timestamp: number;
  data: {
    node: 'planner' | 'rag' | 'executor' | 'critic' | 'genui';
    message: string;
    progress?: number;
    metadata?: {
      action?: string;
      confidence?: number;
      [key: string]: any;
    };
  };
}

export interface GenUIComponentEvent {
  type: 'gen_ui_component';
  timestamp: number;
  data: {
    id?: string;
    widgetType: 'SmartCanvas' | 'AgentMessage' | 'ActionPanel' | 'ImageView';
    props: any;
    updateMode?: 'append' | 'replace' | 'update';
    targetId?: string;
  };
}

export interface ErrorEvent {
  type: 'error';
  timestamp: number;
  data: {
    code: string;
    message: string;
    node?: string;
    details?: string;
    recoverable?: boolean;
    retryable?: boolean;
    retryAfter?: number;
  };
}

export interface StreamEndEvent {
  type: 'stream_end';
  timestamp: number;
  data: {
    sessionId: string;
    summary?: string;
  };
}

export type SSEEvent =
  | ConnectionEvent
  | ThoughtLogEvent
  | GenUIComponentEvent
  | ErrorEvent
  | StreamEndEvent;
```

### 6.2 事件处理器

```typescript
// lib/sse/event-handler.ts
import { SSEEvent } from '@/lib/types/sse';

export class EventHandler {
  private handlers: Map<string, Array<(event: SSEEvent) => void>> = new Map();

  on(eventType: string, handler: (event: SSEEvent) => void) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: (event: SSEEvent) => void) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: SSEEvent) {
    const handlers = this.handlers.get(event.type) || [];
    handlers.forEach((handler) => handler(event));

    // 也触发通用事件
    const allHandlers = this.handlers.get('*') || [];
    allHandlers.forEach((handler) => handler(event));
  }
}
```

## 7. 使用示例

### 7.1 在组件中使用

```typescript
// components/features/TextToImage/ChatInterface.tsx
'use client';

import { useAgentChat } from '@/hooks/useAgentChat';
import { useState } from 'react';

export function ChatInterface() {
  const { messages, sendMessage, isConnected, isConnecting } = useAgentChat();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    await sendMessage({
      text: input,
      sessionId: undefined, // 自动生成
    });

    setInput('');
  };

  return (
    <div>
      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.type === 'user' && <div>用户: {msg.content}</div>}
            {msg.type === 'assistant' && <div>AI: {msg.content}</div>}
            {msg.components && (
              <div>
                {/* 渲染 GenUI 组件 */}
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isConnecting || !isConnected}
        />
        <button onClick={handleSend} disabled={isConnecting || !isConnected}>
          发送
        </button>
      </div>
    </div>
  );
}
```

## 8. 错误处理和重连

### 8.1 重连策略

- **指数退避**: 重连延迟逐渐增加（1s, 2s, 4s）
- **最大重试次数**: 默认 3 次
- **手动重连**: 提供手动重连方法

### 8.2 错误处理

- **网络错误**: 自动重连
- **服务器错误**: 显示错误消息，允许重试
- **超时**: 设置超时时间，超时后断开连接

## 9. 性能优化

### 9.1 事件去重

```typescript
// 使用事件 ID 去重
const processedIds = new Set<string>();

function handleEvent(event: SSEEvent) {
  if (event.id && processedIds.has(event.id)) {
    return; // 已处理，跳过
  }
  if (event.id) {
    processedIds.add(event.id);
  }
  // 处理事件
}
```

### 9.2 批量更新

```typescript
// 批量处理事件，减少渲染次数
const eventQueue: SSEEvent[] = [];
let updateTimer: NodeJS.Timeout | null = null;

function queueEvent(event: SSEEvent) {
  eventQueue.push(event);

  if (!updateTimer) {
    updateTimer = setTimeout(() => {
      processEvents(eventQueue.splice(0));
      updateTimer = null;
    }, 100);
  }
}
```

## 10. 事件处理总结

### 10.1 所有 SSE 事件类型

后端推送的所有事件类型及其处理方式：

| 事件类型 | 处理方式 | 优先级 | 说明 |
|---------|---------|--------|------|
| `connection` | 必需 | 高 | 连接确认，获取 sessionId |
| `thought_log` | 必需 | 高 | 思考日志，显示节点执行过程 |
| `enhanced_prompt` | 必需 | 高 | RAG 检索结果，展示检索到的风格 |
| `gen_ui_component` | 必需 | 高 | GenUI 组件，动态渲染 UI |
| `error` | 必需 | 高 | 错误信息，显示错误提示 |
| `progress` | 可选 | 中 | 任务进度，显示进度条 |
| `stream_end` | 必需 | 高 | 流结束，关闭连接 |
| `heartbeat` | 可选 | 低 | 心跳事件，保持连接活跃 |

### 10.2 事件处理优先级

**必需处理的事件（核心功能）：**
1. `connection` - 建立连接
2. `thought_log` - 工作流执行过程
3. `enhanced_prompt` - RAG 检索结果（核心展示）
4. `gen_ui_component` - 动态 UI 组件
5. `error` - 错误处理
6. `stream_end` - 结束处理

**可选处理的事件（增强体验）：**
- `progress` - 进度展示
- `heartbeat` - 连接保活

### 10.3 事件处理完整性检查

确保所有事件类型都有对应的处理：

```typescript
function handleSSEEvent(event: SSEEvent) {
  switch (event.type) {
    case 'connection':
      // ✅ 已处理
      break;
    case 'thought_log':
      // ✅ 已处理
      break;
    case 'enhanced_prompt':
      // ✅ 已处理
      break;
    case 'gen_ui_component':
      // ✅ 已处理
      break;
    case 'progress':
      // ✅ 已处理（可选）
      break;
    case 'error':
      // ✅ 已处理
      break;
    case 'stream_end':
      // ✅ 已处理
      break;
    case 'heartbeat':
      // ✅ 已处理（可选）
      break;
    default:
      // 未知事件类型
      console.warn('Unknown event type:', event.type);
  }
}
```

## 11. 相关文档

- [API 集成指南](./API_INTEGRATION.md)
- [类型定义](./TYPES.md)
- [Agent 工作流前端实现](../features/AGENT_WORKFLOW.md)
- [后端 SSE 设计](../../../main/server/docs/workflow/SSE_STREAMING_DESIGN.md)
