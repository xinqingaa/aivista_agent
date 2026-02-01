# AiVista Web 前端实现文档

## 目录

1. [架构概述](#架构概述)
2. [核心模块实现](#核心模块实现)
3. [技术实现细节](#技术实现细节)
4. [组件系统](#组件系统)
5. [状态管理](#状态管理)
6. [样式与响应式设计](#样式与响应式设计)
7. [部署与构建](#部署与构建)
8. [总结](#总结)

---

## 架构概述

### 1.1 整体架构

AiVista Web 前端基于 **Next.js 14** 构建，采用 App Router 架构，使用 **TypeScript** + **TailwindCSS** + **shadcn/ui** 技术栈。

```
┌─────────────────────────────────────────────────────────┐
│                      用户界面层                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   首页       │  │  AI 智绘     │  │  知识库管理  │  │
│  │   (Home)     │  │  (Chat)      │  │ (Knowledge)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    组件层 (Components)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  ChatInterface│ │  SmartCanvas │  │  GenUI系统   │  │
│  │  聊天界面     │  │  智能画布    │  │  动态组件    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  MessageList │ │  InputArea    │  │  Sidebar     │  │
│  │  消息列表     │  │  输入区域    │  │  侧边栏      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    服务层 (Services)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  SSE Client  │  │  API Client  │  │  Utils       │  │
│  │  流式通信     │  │  HTTP请求    │  │  工具函数    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                  状态管理 (Stores)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ SessionStore │  │  ChatStore   │  │  UIStore     │  │
│  │  会话状态     │  │  聊天状态    │  │  UI状态      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                     后端 API                             │
│  POST /api/agent/chat (SSE)                             │
│  GET/POST /api/knowledge/*                              │
└─────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18+ | UI 框架 |
| Next.js | 14+ | 全栈框架（App Router） |
| TypeScript | 5.x | 开发语言 |
| TailwindCSS | Latest | 样式框架 |
| shadcn/ui | Latest | UI 组件库 |
| Zustand | Latest | 状态管理 |
| Lucide React | Latest | 图标库 |

### 1.3 目录结构

```
web/
├── app/                      # Next.js App Router
│   ├── (main)/              # 主应用分组
│   │   ├── page.tsx         # 首页
│   │   ├── layout.tsx       # 主布局
│   │   └── knowledge/       # 知识库页面
│   │       └── page.tsx
│   ├── chat/                # AI 智绘页面
│   │   └── page.tsx
│   └── layout.tsx           # 根布局
├── components/              # 组件目录
│   ├── chat/                # 聊天相关组件
│   │   ├── chat-interface.tsx      # 聊天界面主组件
│   │   ├── message-list.tsx        # 消息列表
│   │   ├── message-item.tsx        # 单条消息
│   │   ├── input-area.tsx          # 输入区域
│   │   ├── thought-log-view.tsx    # 思考日志展示
│   │   └── test-guide-dialog.tsx   # 测试指南弹窗
│   ├── genui/               # GenUI 组件系统
│   │   ├── smart-canvas.tsx        # 智能画布
│   │   ├── agent-message.tsx       # Agent 消息
│   │   ├── image-view.tsx          # 图片展示
│   │   ├── enhanced-prompt-view.tsx # 增强提示词展示
│   │   └── renderer.tsx            # GenUI 渲染器
│   ├── knowledge/           # 知识库组件
│   │   ├── knowledge-table.tsx     # 风格列表表格
│   │   ├── style-form.tsx          # 风格表单
│   │   └── search-bar.tsx          # 搜索栏
│   ├── layout/              # 布局组件
│   │   ├── sidebar.tsx             # 侧边栏
│   │   └── header.tsx              # 顶部导航
│   └── ui/                  # shadcn/ui 组件
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
├── lib/                     # 工具库
│   ├── api/                 # API 客户端
│   │   ├── agent.ts                 # Agent API
│   │   ├── knowledge.ts             # Knowledge API
│   │   └── client.ts                # HTTP 客户端
│   ├── sse/                 # SSE 客户端
│   │   ├── sse-client.ts            # SSE 连接管理
│   │   └── event-handler.ts         # 事件处理
│   ├── stores/              # Zustand 状态管理
│   │   ├── session-store.ts         # 会话状态
│   │   ├── chat-store.ts            # 聊天状态
│   │   └── ui-store.ts              # UI 状态
│   └── utils/              # 工具函数
│       ├── format.ts                # 格式化函数
│       └── validation.ts            # 验证函数
├── styles/                  # 样式文件
│   └── globals.css          # 全局样式
├── public/                  # 静态资源
├── docs/                    # 文档目录
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## 核心模块实现

### 2.1 页面路由

#### 2.1.1 首页

**文件位置**：`app/(main)/page.tsx`

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-4xl font-bold">AiVista Web</h1>
        <p className="text-muted-foreground text-center max-w-md">
          欢迎使用 AiVista Web 前端应用
        </p>
        <div className="flex gap-4">
          <Link href="/chat">
            <Button>AI 智绘</Button>
          </Link>
          <Link href="/knowledge">
            <Button variant="outline">知识库管理</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

#### 2.1.2 AI 智绘页面

**文件位置**：`app/chat/page.tsx`

```tsx
'use client';

import { ChatInterface } from '@/components/chat/chat-interface';
import { Sidebar } from '@/components/layout/sidebar';
import { TestGuideDialog } from '@/components/chat/test-guide-dialog';

export default function ChatPage() {
  return (
    <div className="h-screen mx-auto container flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b px-4 py-3">
        <h1 className="text-xl font-bold">AiVista</h1>
        <p className="text-xs text-muted-foreground">
          AI智绘，创意闪现
        </p>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 聊天界面 */}
        <div className="flex-1 mx-auto py-4">
          <ChatInterface
            title="AI 画图"
            placeholder="输入你的创意，例如：生成一只赛博朋克风格的猫..."
          />
        </div>
      </div>
    </div>
  );
}
```

#### 2.1.3 知识库管理页面

**文件位置**：`app/(main)/knowledge/page.tsx`

```tsx
'use client';

import { KnowledgeTable } from '@/components/knowledge/knowledge-table';
import { SearchBar } from '@/components/knowledge/search-bar';

export default function KnowledgePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">知识库管理</h1>
        <p className="text-muted-foreground">
          管理风格知识库，添加、编辑和删除风格数据
        </p>
      </div>

      <SearchBar />
      <KnowledgeTable />
    </div>
  );
}
```

---

### 2.2 聊天组件系统

#### 2.2.1 ChatInterface（聊天界面主组件）

**文件位置**：`components/chat/chat-interface.tsx`

```tsx
'use client';

import { useState } from 'react';
import { MessageList } from './message-list';
import { InputArea } from './input-area';
import { useSSE } from '@/lib/sse/use-sse';
import { useChatStore } from '@/lib/stores/chat-store';

interface ChatInterfaceProps {
  title: string;
  placeholder: string;
}

export function ChatInterface({ title, placeholder }: ChatInterfaceProps) {
  const [isConnected, connect, disconnect] = useSSE();
  const messages = useChatStore((state) => state.messages);
  const addMessage = useChatStore((state) => state.addMessage);

  const handleSend = async (text: string, maskData?: any) => {
    // 添加用户消息
    addMessage({ role: 'user', content: text });

    // 连接 SSE
    await connect({
      text,
      maskData,
      onEvent: (event) => {
        // 处理 SSE 事件
        handleSSEEvent(event);
      }
    });
  };

  const handleSSEEvent = (event: any) => {
    switch (event.type) {
      case 'thought_log':
        // 更新思考日志
        break;
      case 'gen_ui_component':
        // 渲染 GenUI 组件
        break;
      case 'stream_end':
        // 连接结束
        disconnect();
        break;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 消息列表 */}
      <MessageList messages={messages} />

      {/* 输入区域 */}
      <InputArea
        placeholder={placeholder}
        onSend={handleSend}
        disabled={isConnected}
      />
    </div>
  );
}
```

#### 2.2.2 MessageList（消息列表）

**文件位置**：`components/chat/message-list.tsx`

```tsx
'use client';

import { Message } from '@/lib/types';
import { MessageItem } from './message-item';
import { useEffect, useRef } from 'react';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
    >
      {messages.map((message, index) => (
        <MessageItem
          key={message.id || index}
          message={message}
        />
      ))}
    </div>
  );
}
```

#### 2.2.3 MessageItem（单条消息）

**文件位置**：`components/chat/message-item.tsx`

```tsx
'use client';

import { Message } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { GenUIRenderer } from '@/components/genui/renderer';
import { ThoughtLogView } from './thought-log-view';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* 头像 */}
      {!isUser && (
        <Avatar className="h-8 w-8">
          <Bot className="h-5 w-5" />
        </Avatar>
      )}

      {/* 消息内容 */}
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        {/* 文本内容 */}
        {message.content && (
          <div className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}>
            {message.content}
          </div>
        )}

        {/* GenUI 组件 */}
        {message.components && message.components.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.components.map((component, index) => (
              <GenUIRenderer
                key={index}
                component={component}
              />
            ))}
          </div>
        )}

        {/* 思考日志 */}
        {message.thoughtLogs && message.thoughtLogs.length > 0 && (
          <ThoughtLogView logs={message.thoughtLogs} />
        )}
      </div>

      {/* 用户头像 */}
      {isUser && (
        <Avatar className="h-8 w-8">
          <User className="h-5 w-5" />
        </Avatar>
      )}
    </div>
  );
}
```

#### 2.2.4 InputArea（输入区域）

**文件位置**：`components/chat/input-area.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface InputAreaProps {
  placeholder: string;
  onSend: (text: string, maskData?: any) => void;
  disabled?: boolean;
}

export function InputArea({ placeholder, onSend, disabled }: InputAreaProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[60px] max-h-[200px] resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          size="icon"
          className="h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

### 2.3 GenUI 组件系统

#### 2.3.1 GenUI 渲染器

**文件位置**：`components/genui/renderer.tsx`

```tsx
'use client';

import { GenUIComponent } from '@/lib/types';
import { SmartCanvas } from './smart-canvas';
import { AgentMessage } from './agent-message';
import { ImageView } from './image-view';
import { EnhancedPromptView } from './enhanced-prompt-view';

interface GenUIRendererProps {
  component: GenUIComponent;
}

export function GenUIRenderer({ component }: GenUIRendererProps) {
  const { widgetType, props } = component;

  switch (widgetType) {
    case 'SmartCanvas':
      return <SmartCanvas {...props} />;

    case 'AgentMessage':
      return <AgentMessage {...props} />;

    case 'ImageView':
      return <ImageView {...props} />;

    case 'EnhancedPromptView':
      return <EnhancedPromptView {...props} />;

    default:
      return (
        <div className="text-destructive">
          Unknown widget type: {widgetType}
        </div>
      );
  }
}
```

#### 2.3.2 SmartCanvas（智能画布）

**文件位置**：`components/genui/smart-canvas.tsx`

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Redo, Undo } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SmartCanvasProps {
  imageUrl: string;
  width?: number;
  height?: number;
  mode?: 'view' | 'masking';
}

export function SmartCanvas({
  imageUrl,
  width = 800,
  height = 600,
  mode = 'view'
}: SmartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 绘制蒙版
  const startDrawing = (e: React.MouseEvent) => {
    if (mode !== 'masking') return;

    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || mode !== 'masking') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    // 保存到历史记录
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newDataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newDataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex - 1];
    }
  };

  // 下载
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `aivista-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {mode === 'masking' ? '编辑模式：绘制蒙版' : '查看模式'}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="border rounded cursor-crosshair max-w-full h-auto"
        />
      </div>
    </Card>
  );
}
```

#### 2.3.3 ImageView（图片展示）

**文件位置**：`components/genui/image-view.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Image } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ImageViewProps {
  imageUrl: string;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover';
}

export function ImageView({
  imageUrl,
  width,
  height,
  fit = 'contain'
}: ImageViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <Card className="overflow-hidden">
      {isLoading && (
        <div
          className="flex items-center justify-center bg-muted"
          style={{ width, height }}
        >
          <Image className="h-8 w-8 animate-pulse text-muted-foreground" />
        </div>
      )}

      {hasError ? (
        <div
          className="flex items-center justify-center bg-muted text-destructive"
          style={{ width, height }}
        >
          图片加载失败
        </div>
      ) : (
        <img
          src={imageUrl}
          alt="Generated image"
          width={width}
          height={height}
          className={`max-w-full ${isLoading ? 'hidden' : ''}`}
          style={{ objectFit: fit }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </Card>
  );
}
```

#### 2.3.4 AgentMessage（Agent 消息）

**文件位置**：`components/genui/agent-message.tsx`

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface AgentMessageProps {
  text: string;
  state?: 'thinking' | 'success' | 'failed';
}

export function AgentMessage({ text, state = 'success' }: AgentMessageProps) {
  return (
    <Card className={`p-4 ${
      state === 'thinking'
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
        : state === 'failed'
        ? 'border-destructive bg-destructive/10'
        : 'border-green-500 bg-green-50 dark:bg-green-950'
    }`}>
      <div className="flex items-start gap-3">
        {/* 图标 */}
        {state === 'thinking' && (
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        )}
        {state === 'success' && (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        )}
        {state === 'failed' && (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}

        {/* 文本 */}
        <p className="text-sm">{text}</p>
      </div>
    </Card>
  );
}
```

---

### 2.4 SSE 客户端

#### 2.4.1 SSE Client

**文件位置**：`lib/sse/sse-client.ts`

```typescript
export class SSEClient {
  private abortController: AbortController | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  async connect(
    url: string,
    data: any,
    options: {
      onEvent?: (event: any) => void;
      onError?: (error: Error) => void;
      onClose?: () => void;
    } = {}
  ) {
    this.abortController = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(data),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          options.onClose?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE 事件
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const event = this.parseSSEEvent(line);
            options.onEvent?.(event);
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        options.onError?.(error);
      }
    }
  }

  private parseSSEEvent(line: string): any {
    const eventMatch = line.match(/^event: (.+)$/m);
    const dataMatch = line.match(/^data: (.+)$/m);

    const eventType = eventMatch ? eventMatch[1] : 'message';
    const data = dataMatch ? JSON.parse(dataMatch[1]) : {};

    return { type: eventType, ...data };
  }

  disconnect() {
    this.abortController?.abort();
    this.abortController = null;
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}
```

#### 2.4.2 useSSE Hook

**文件位置**：`lib/sse/use-sse.ts`

```typescript
'use client';

import { useState, useCallback, useRef } from 'react';
import { SSEClient } from './sse-client';

export function useSSE() {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<SSEClient | null>(null);

  const connect = useCallback(async (data: any) => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    const client = new SSEClient();
    clientRef.current = client;

    setIsConnected(true);

    await client.connect('/api/agent/chat', data, {
      onEvent: (event) => {
        console.log('SSE Event:', event);
      },
      onError: (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
      },
      onClose: () => {
        console.log('SSE Connection closed');
        setIsConnected(false);
      },
    });
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsConnected(false);
  }, []);

  return [isConnected, connect, disconnect] as const;
}
```

---

## 技术实现细节

### 3.1 类型定义

**文件位置**：`lib/types/index.ts`

```typescript
// 消息类型
export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  components?: GenUIComponent[];
  thoughtLogs?: ThoughtLog[];
  timestamp?: number;
}

// GenUI 组件类型
export interface GenUIComponent {
  widgetType: string;
  props: Record<string, any>;
  timestamp?: number;
}

// 思考日志类型
export interface ThoughtLog {
  node: string;
  message: string;
  timestamp: number;
}

// 风格类型
export interface Style {
  id: string;
  style: string;
  prompt: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
```

### 3.2 API 客户端

**文件位置**：`lib/api/client.ts`

```typescript
export const apiClient = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async patch<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async delete(url: string): Promise<void> {
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  },
};
```

### 3.3 状态管理

#### SessionStore（会话状态）

**文件位置**：`lib/stores/session-store.ts`

```typescript
import { create } from 'zustand';

interface SessionState {
  sessionId: string | null;
  messages: Message[];

  setSessionId: (sessionId: string) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  messages: [],

  setSessionId: (sessionId) => set({ sessionId }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () => set({ messages: [] }),
}));
```

#### ChatStore（聊天状态）

**文件位置**：`lib/stores/chat-store.ts`

```typescript
import { create } from 'zustand';

interface ChatState {
  isGenerating: boolean;
  currentImage: string | null;

  setIsGenerating: (isGenerating: boolean) => void;
  setCurrentImage: (imageUrl: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isGenerating: false,
  currentImage: null,

  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setCurrentImage: (currentImage) => set({ currentImage }),
}));
```

---

## 样式与响应式设计

### 4.1 TailwindCSS 配置

**文件位置**：`tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### 4.2 响应式断点

```css
/* TailwindCSS 默认断点 */
sm: 640px   /* 小屏设备 */
md: 768px   /* 平板 */
lg: 1024px  /* 桌面 */
xl: 1280px  /* 大屏桌面 */
2xl: 1536px /* 超大屏 */
```

### 4.3 深色模式支持

**文件位置**：`app/layout.tsx`

```tsx
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 部署与构建

### 5.1 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 访问 http://localhost:3001
```

### 5.2 生产构建

```bash
# 构建生产版本
pnpm run build

# 启动生产服务器
pnpm run start
```

### 5.3 环境变量

创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5.4 Docker 部署

```dockerfile
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile

# 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# 生产运行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

---

## 总结

### 6.1 技术亮点

1. **Next.js App Router**：利用最新的文件系统路由，简化开发
2. **GenUI 组件系统**：动态渲染后端下发的 UI 组件
3. **SSE 实时通信**：流式接收 Agent 执行过程
4. **Zustand 状态管理**：轻量级、类型安全的状态管理方案
5. **TailwindCSS + shadcn/ui**：快速构建美观的 UI

### 6.2 性能优化

- **代码分割**：Next.js 自动进行路由级别的代码分割
- **图片优化**：使用 Next.js Image 组件
- **虚拟滚动**：消息列表使用虚拟滚动（未来可添加）
- **懒加载**：动态导入大型组件

### 6.3 开发体验

- **TypeScript**：完整的类型检查
- **ESLint + Prettier**：代码格式化和规范
- **Hot Module Replacement**：快速开发迭代
- **shadcn/ui**：可复制的组件，不是黑盒

---

**文档版本**：v1.0
**最后更新**：2025-02-01
