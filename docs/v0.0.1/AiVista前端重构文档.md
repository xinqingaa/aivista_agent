# AiVista v0.0.1 功能实现方案

## 一、现状分析

### 1.1 当前功能状态

#### 已实现功能
- ✅ 基础聊天界面（ChatInterface）
- ✅ SSE 流式通信
- ✅ Agent 工作流（Planner → RAG → Executor → Critic）
- ✅ GenUI 组件系统（ImageView、ThoughtLogItem、EnhancedPromptView）
- ✅ 后端支持 `sessionId` 参数

#### 缺失功能
- ❌ 侧边栏设计和会话管理
- ❌ SmartCanvas 组件实现
- ❌ 重试按钮功能实现
- ❌ 多轮对话支持（前端会话历史管理）

### 1.2 技术现状

#### 后端
- 框架：NestJS + LangGraph
- 会话管理：仅支持 `sessionId` 参数传递，无持久化
- 接口：`POST /api/agent/chat` 支持 `sessionId`、`text`、`maskData`、`preferredModel`

#### 前端
- 框架：Next.js 14 + React 18 + TypeScript
- 状态管理：Zustand 已安装但未使用，当前使用 React Hooks
- 数据存储：无本地数据库，状态仅存在于内存
- SSE 客户端：`useAgentChat` Hook，每次发送消息创建新连接

## 二、技术选型

### 2.1 前端本地数据库

**选择：IndexedDB + Dexie.js**

**理由：**
- IndexedDB 是浏览器原生 API，无需额外服务
- Dexie.js 提供简洁的 Promise API，易于使用
- 支持存储大量结构化数据（会话历史、消息、组件状态）
- 支持索引查询，性能优秀
- 无需 Docker 或外部数据库


### 2.2 状态管理

**选择：Zustand**

**理由：**
- 已安装但未使用，无需新增依赖
- 轻量级，API 简洁
- 支持持久化中间件（persist）
- 与 React 集成良好

**状态结构：**
```typescript
interface AppState {
  // 会话管理
  sessions: Session[];
  currentSessionId: string | null;
  
  // UI 状态
  sidebarOpen: boolean;
  
  // 其他全局状态...
}
```

### 2.3 后端改动策略

**原则：尽可能少改后端代码**

**改动范围：**
1. **AgentController**：支持会话历史查询
2. **AgentService**：无需改动（已支持 sessionId）
3. **AgentState**：无需改动（已包含 sessionId）
4. **工作流节点**：无需改动

**不改动：**
- ❌ 不添加数据库（PostgreSQL、MongoDB 等）
- ❌ 不添加 Docker 容器
- ❌ 不添加 Redis 缓存
- ❌ 不修改核心工作流逻辑

## 三、实现方案

### 3.1 侧边栏和会话管理

#### 3.1.1 数据结构设计

**会话（Session）数据结构：**
```typescript
interface Session {
  id: string;                    // sessionId
  title: string;                 // 会话标题（自动生成或用户编辑）
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 最后更新时间戳
  messageCount: number;          // 消息数量
  lastMessage?: string;           // 最后一条消息预览
  isActive: boolean;             // 是否当前活跃会话
}
```

**消息（Message）数据结构：**
```typescript
interface Message {
  id: string;                    // 消息 ID
  sessionId: string;             // 所属会话 ID
  role: 'user' | 'assistant';    // 角色
  content: string;               // 文本内容
  timestamp: number;              // 时间戳
  genUIComponents?: GenUIComponent[]; // 关联的 GenUI 组件
  imageUrl?: string;             // 关联的图片 URL
}
```

#### 3.1.2 IndexedDB 数据库设计

**使用 Dexie.js 定义数据库：**

```typescript
// lib/db/database.ts
import Dexie, { Table } from 'dexie';

interface SessionRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
}

interface MessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  genUIComponents?: string;  // JSON 字符串
  imageUrl?: string;
}

class AiVistaDB extends Dexie {
  sessions!: Table<SessionRecord, string>;
  messages!: Table<MessageRecord, string>;

  constructor() {
    super('AiVistaDB');
    this.version(1).stores({
      sessions: 'id, createdAt, updatedAt',
      messages: 'id, sessionId, timestamp',
    });
  }
}

export const db = new AiVistaDB();
```

#### 3.1.3 Zustand Store 设计

```typescript
// stores/session-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db/database';

interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  sidebarOpen: boolean;
  
  // Actions
  createSession: () => Promise<string>;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  loadSessions: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      sidebarOpen: true,

      createSession: async () => {
        const sessionId = `session_${Date.now()}`;
        const session: Session = {
          id: sessionId,
          title: '新对话',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messageCount: 0,
          isActive: true,
        };
        
        await db.sessions.add({
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messageCount: session.messageCount,
        });
        
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: sessionId,
        }));
        
        return sessionId;
      },

      selectSession: (sessionId: string) => {
        set((state) => ({
          sessions: state.sessions.map(s => ({
            ...s,
            isActive: s.id === sessionId,
          })),
          currentSessionId: sessionId,
        }));
      },

      deleteSession: async (sessionId: string) => {
        await db.sessions.delete(sessionId);
        await db.messages.where('sessionId').equals(sessionId).delete();
        
        set((state) => {
          const newSessions = state.sessions.filter(s => s.id !== sessionId);
          const newCurrentId = state.currentSessionId === sessionId
            ? (newSessions[0]?.id || null)
            : state.currentSessionId;
          
          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
          };
        });
      },

      updateSessionTitle: async (sessionId: string, title: string) => {
        await db.sessions.update(sessionId, { title, updatedAt: Date.now() });
        
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, title, updatedAt: Date.now() } : s
          ),
        }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      loadSessions: async () => {
        const records = await db.sessions
          .orderBy('updatedAt')
          .reverse()
          .toArray();
        
        const sessions: Session[] = records.map(r => ({
          ...r,
          isActive: r.id === get().currentSessionId,
        }));
        
        set({ sessions });
      },
    }),
    {
      name: 'aivista-session-storage',
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
```

#### 3.1.4 侧边栏组件设计

```typescript
// components/layout/sidebar.tsx
'use client';

import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Edit2 } from 'lucide-react';

export function Sidebar() {
  const {
    sessions,
    currentSessionId,
    sidebarOpen,
    createSession,
    selectSession,
    deleteSession,
    setSidebarOpen,
  } = useSessionStore();

  if (!sidebarOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-0 top-0 z-50"
      >
        <MessageSquare />
      </Button>
    );
  }

  return (
    <div className="w-64 border-r bg-background h-full flex flex-col">
      {/* 头部：新建会话按钮 */}
      <div className="p-4 border-b">
        <Button
          onClick={createSession}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          新建对话
        </Button>
      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              onSelect={() => selectSession(session.id)}
              onDelete={() => deleteSession(session.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

#### 3.1.5 消息存储服务

```typescript
// lib/services/message-service.ts
import { db } from '@/lib/db/database';
import { Message, GenUIComponent } from '@/lib/types';

export class MessageService {
  // 保存用户消息
  static async saveUserMessage(
    sessionId: string,
    content: string
  ): Promise<string> {
    const messageId = `msg_${Date.now()}`;
    await db.messages.add({
      id: messageId,
      sessionId,
      role: 'user',
      content,
      timestamp: Date.now(),
    });
    
    // 更新会话信息
    await this.updateSessionInfo(sessionId);
    
    return messageId;
  }

  // 保存助手消息（包含 GenUI 组件）
  static async saveAssistantMessage(
    sessionId: string,
    content: string,
    genUIComponents?: GenUIComponent[]
  ): Promise<string> {
    const messageId = `msg_${Date.now()}`;
    const imageUrl = this.extractImageUrl(genUIComponents);
    
    await db.messages.add({
      id: messageId,
      sessionId,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      genUIComponents: genUIComponents
        ? JSON.stringify(genUIComponents)
        : undefined,
      imageUrl,
    });
    
    await this.updateSessionInfo(sessionId);
    
    return messageId;
  }

  // 加载会话消息
  static async loadSessionMessages(sessionId: string): Promise<Message[]> {
    const records = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
    
    return records.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      role: r.role,
      content: r.content,
      timestamp: r.timestamp,
      genUIComponents: r.genUIComponents
        ? JSON.parse(r.genUIComponents)
        : undefined,
      imageUrl: r.imageUrl,
    }));
  }

  // 更新会话信息（最后消息、消息数量等）
  private static async updateSessionInfo(sessionId: string) {
    const messages = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
    
    const lastMessage = messages[messages.length - 1];
    const lastMessagePreview = lastMessage?.content.substring(0, 50) || '';
    
    await db.sessions.update(sessionId, {
      updatedAt: Date.now(),
      messageCount: messages.length,
      lastMessage: lastMessagePreview,
    });
  }

  // 从 GenUI 组件中提取图片 URL
  private static extractImageUrl(
    components?: GenUIComponent[]
  ): string | undefined {
    if (!components) return undefined;
    
    const imageView = components.find(c => c.widgetType === 'ImageView');
    if (imageView) {
      return (imageView.props as ImageViewProps).imageUrl;
    }
    
    const smartCanvas = components.find(c => c.widgetType === 'SmartCanvas');
    if (smartCanvas) {
      return (smartCanvas.props as SmartCanvasProps).imageUrl;
    }
    
    return undefined;
  }
}
```

### 3.2 多轮对话支持

#### 3.2.1 前端改造

**修改 `useAgentChat` Hook：**

```typescript
// hooks/use-sse.ts (修改 sendMessage 方法)
export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const { currentSessionId } = useSessionStore();
  
  // ... 其他代码 ...

  const sendMessage = useCallback((text: string, maskData?: any) => {
    const body = {
      text,
      sessionId: currentSessionId || undefined, // 传递当前会话 ID
      ...(maskData && { maskData }),
    };

    if (callbacksRef.current.onChatStart) {
      callbacksRef.current.onChatStart();
    }

    sse.send(body);
  }, [sse, currentSessionId]);

  return {
    ...sse,
    sendMessage,
  };
}
```

**修改 `ChatInterface` 组件：**

```typescript
// components/chat/chat-interface.tsx
export function ChatInterface({ ... }: ChatInterfaceProps) {
  const { currentSessionId, createSession } = useSessionStore();
  const [messages, setMessages] = useState<Message[]>([]);
  
  // 加载会话消息
  useEffect(() => {
    if (currentSessionId) {
      MessageService.loadSessionMessages(currentSessionId).then(setMessages);
    } else {
      // 如果没有当前会话，创建新会话
      createSession().then(() => {
        setMessages([]);
      });
    }
  }, [currentSessionId, createSession]);

  const { sendMessage } = useAgentChat({
    onChatStart: () => {
      setIsProcessing(true);
      // 保存用户消息
      if (currentSessionId) {
        MessageService.saveUserMessage(currentSessionId, input);
      }
    },
    onGenUIComponent: (data) => {
      // ... 现有逻辑 ...
      // 保存助手响应（包含 GenUI 组件）
      if (currentSessionId) {
        MessageService.saveAssistantMessage(
          currentSessionId,
          'AI 响应',
          [component]
        );
      }
    },
    // ... 其他回调 ...
  });

  // ... 其他代码 ...
}
```

#### 3.2.2 后端改动（最小化）

**后端无需改动**，因为：
- ✅ `AgentController` 已支持 `sessionId` 参数
- ✅ `AgentState` 已包含 `sessionId` 字段
- ✅ 工作流节点可以访问 `sessionId`

**增强（需要上下文记忆）：**

如果需要在多轮对话中传递上下文，在后端添加简单的内存缓存：

```typescript
// server/src/agent/agent.service.ts (可选)
private sessionContexts = new Map<string, {
  messages: Array<{ role: string; content: string }>;
  lastImageUrl?: string;
}>();

async *executeWorkflow(initialState: AgentState): AsyncGenerator<any> {
  const sessionId = initialState.sessionId;
  
  // 获取会话上下文（如果有）
  const context = this.sessionContexts.get(sessionId);
  if (context) {
    // 可以将上下文传递给 LLM（如需要）
    // 这里仅作示例，实际实现需要根据需求调整
  }
  
  // ... 现有工作流逻辑 ...
  
  // 保存会话上下文（可选）
  if (!this.sessionContexts.has(sessionId)) {
    this.sessionContexts.set(sessionId, { messages: [] });
  }
  const sessionContext = this.sessionContexts.get(sessionId)!;
  sessionContext.messages.push({
    role: 'user',
    content: initialState.userInput.text,
  });
  
  // ... 其他代码 ...
}
```

**注意：** 本次需要上下文记忆，后端需要改动。

### 3.3 SmartCanvas 组件实现

#### 3.3.1 前端实现

**组件结构：**

```typescript
// genui/components/smart-canvas.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SmartCanvasProps, MaskData } from '@/lib/types/genui';
import { Undo2, Redo2, Eraser, Pen, Check, X } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface MaskPath {
  points: Point[];
  strokeWidth: number;
}

export function SmartCanvas({
  imageUrl,
  mode,
  ratio,
  onMaskComplete,
  onCanvasAction,
}: SmartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskPaths, setMaskPaths] = useState<MaskPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [history, setHistory] = useState<MaskPath[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 绘制画布
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 应用变换（缩放和平移）
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(scale, scale);

    // 绘制图片
    const img = imageRef.current;
    const imgAspect = img.width / img.height;
    const canvasAspect = canvas.width / canvas.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let drawX = 0;
    let drawY = 0;

    if (imgAspect > canvasAspect) {
      drawHeight = canvas.width / imgAspect;
      drawY = (canvas.height - drawHeight) / 2;
    } else {
      drawWidth = canvas.height * imgAspect;
      drawX = (canvas.width - drawWidth) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // 绘制蒙版路径
    if (mode === 'draw_mask') {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 绘制已完成的路径
      maskPaths.forEach(path => {
        if (path.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        }
      });

      // 绘制当前路径
      if (currentPath.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [imageUrl, mode, maskPaths, currentPath, scale, panOffset]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 鼠标事件处理
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / scale;
    const y = (e.clientY - rect.top - panOffset.y) / scale;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw_mask') return;

    setIsDrawing(true);
    const point = getCanvasPoint(e);
    setCurrentPath([point]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== 'draw_mask') return;

    const point = getCanvasPoint(e);
    setCurrentPath(prev => [...prev, point]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    if (currentPath.length > 0) {
      const newPath: MaskPath = {
        points: [...currentPath],
        strokeWidth: 3,
      };

      // 保存到历史
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...maskPaths, newPath]);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      setMaskPaths(prev => [...prev, newPath]);
      setCurrentPath([]);
    }
  };

  // 生成蒙版数据（Base64）
  const generateMaskData = useCallback(async (): Promise<MaskData> => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) {
      throw new Error('Canvas or image not loaded');
    }

    // 创建临时画布用于生成蒙版
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageRef.current.width;
    maskCanvas.height = imageRef.current.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error('Failed to get mask context');

    // 绘制黑色背景
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // 绘制白色蒙版区域
    maskCtx.fillStyle = 'white';
    maskCtx.strokeStyle = 'white';
    maskCtx.lineWidth = 10;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    maskPaths.forEach(path => {
      if (path.points.length > 0) {
        // 将屏幕坐标转换为图片坐标
        const imgPoints = path.points.map(p => {
          // 这里需要根据实际的坐标转换逻辑计算
          // 简化示例：假设画布和图片尺寸一致
          return {
            x: (p.x / canvas.width) * maskCanvas.width,
            y: (p.y / canvas.height) * maskCanvas.height,
          };
        });

        maskCtx.beginPath();
        maskCtx.moveTo(imgPoints[0].x, imgPoints[0].y);
        for (let i = 1; i < imgPoints.length; i++) {
          maskCtx.lineTo(imgPoints[i].x, imgPoints[i].y);
        }
        maskCtx.stroke();
      }
    });

    // 转换为 Base64
    const base64 = maskCanvas.toDataURL('image/png').split(',')[1];

    return {
      base64,
      imageUrl,
      coordinates: maskPaths.flatMap(p => p.points),
    };
  }, [maskPaths, imageUrl]);

  // 完成蒙版绘制
  const handleComplete = async () => {
    try {
      const maskData = await generateMaskData();
      onMaskComplete?.(maskData);
    } catch (error) {
      console.error('Failed to generate mask data:', error);
    }
  };

  // 撤销/重做
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMaskPaths(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMaskPaths(history[historyIndex + 1]);
    }
  };

  // 清除所有蒙版
  const handleClear = () => {
    setMaskPaths([]);
    setCurrentPath([]);
    setHistory([]);
    setHistoryIndex(-1);
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-auto cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* 工具栏 */}
        {mode === 'draw_mask' && (
          <div className="absolute top-4 left-4 flex gap-2 bg-background/90 backdrop-blur-sm p-2 rounded-lg border">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClear}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={maskPaths.length === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              完成
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCanvasAction?.({ type: 'clear_mask' })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
```

**注册 SmartCanvas 组件：**

```typescript
// genui/core/register-components.ts
import { GenUIRegistry } from './gen-ui-registry';
import { SmartCanvas } from '../components/smart-canvas';

export function registerGenUIComponents() {
  const registry = GenUIRegistry.getInstance();
  
  registry.register({
    type: 'SmartCanvas',
    component: SmartCanvas,
  });
  
  // ... 其他组件注册 ...
}
```

#### 3.3.2 后端支持（最小改动）

**后端无需改动**，因为：
- ✅ GenUI 协议已定义 SmartCanvas 组件
- ✅ 前端可以独立处理蒙版绘制和坐标转换
- ✅ 蒙版数据通过 `maskData` 参数传递给后端

**如果需要在后端生成 SmartCanvas 组件：**

```typescript
// server/src/agent/nodes/executor.node.ts 
// 在生成图片后，如果需要局部重绘，可以生成 SmartCanvas 组件
if (intent.action === 'inpainting' && generatedImageUrl) {
  uiComponents.push({
    id: generateComponentId('canvas'),
    widgetType: 'SmartCanvas',
    props: {
      imageUrl: generatedImageUrl,
      mode: 'draw_mask',
    },
    timestamp: Date.now(),
  });
}
```

### 3.4 重试按钮实现

#### 3.4.1 前端实现

**修改 ImageView 组件：**

```typescript
// genui/components/image-view.tsx
export function ImageView({
  imageUrl,
  prompt,
  alt = 'Generated Image',
  actions,
  onLoad,
  onError,
}: ImageViewProps) {
  const { sendMessage } = useAgentChat();
  const { currentSessionId } = useSessionStore();

  const handleAction = (actionId: string) => {
    if (actionId === 'regenerate_btn') {
      // 重试：使用相同的 prompt 重新生成
      if (prompt) {
        sendMessage(prompt);
      } else {
        // 如果没有 prompt，使用最后一条用户消息
        // 这里可以从消息历史中获取
        console.warn('No prompt available for regeneration');
      }
    }
  };

  // ... 其他代码 ...
}
```

**或者，更好的方案：保存原始请求信息**

```typescript
// 在 ChatInterface 中保存原始请求
interface ChatRequest {
  text: string;
  maskData?: MaskData;
  preferredModel?: string;
  timestamp: number;
}

// 在发送消息时保存请求
const handleSend = () => {
  const text = input.trim();
  if (!text) return;

  const request: ChatRequest = {
    text,
    timestamp: Date.now(),
  };

  // 保存到当前会话
  if (currentSessionId) {
    MessageService.saveChatRequest(currentSessionId, request);
  }

  sendMessage(text);
  setInput('');
};

// 重试时使用保存的请求
const handleRetry = async (messageId: string) => {
  const request = await MessageService.getChatRequest(messageId);
  if (request) {
    sendMessage(request.text, request.maskData);
  }
};
```

#### 3.4.2 后端支持（无需改动）

**后端无需改动**，因为：
- ✅ 重试就是重新发送相同的请求
- ✅ 后端接口已支持所有必要参数

## 四、实施步骤

### 阶段一：侧边栏和会话管理（前端）

1. **安装依赖**
   ```bash
   cd main/web
   pnpm add dexie zustand
   ```

2. **创建数据库层**
   - 创建 `lib/db/database.ts`
   - 定义 SessionRecord 和 MessageRecord 接口
   - 初始化 Dexie 数据库

3. **创建 Zustand Store**
   - 创建 `stores/session-store.ts`
   - 实现会话 CRUD 操作
   - 实现侧边栏状态管理

4. **创建消息服务**
   - 创建 `lib/services/message-service.ts`
   - 实现消息保存和加载方法

5. **创建侧边栏组件**
   - 创建 `components/layout/sidebar.tsx`
   - 实现会话列表 UI
   - 实现新建、删除、选择会话功能

6. **修改布局**
   - 修改 `app/chat/page.tsx`
   - 添加侧边栏到布局
   - 集成会话管理

7. **测试**
   - 测试会话创建、删除、选择
   - 测试消息持久化
   - 测试页面刷新后数据恢复

### 阶段二：多轮对话支持（前后端）

1. **前端改造**
   - 修改 `hooks/use-sse.ts`：传递 `sessionId`
   - 修改 `components/chat/chat-interface.tsx`：加载会话消息
   - 修改消息发送逻辑：保存消息到数据库

2. **后端增强**（需要上下文记忆）
   - 在 `AgentService` 中添加内存缓存
   - 实现简单的上下文传递

3. **测试**
   - 测试多轮对话消息连续性
   - 测试会话切换
   - 测试消息历史加载

### 阶段三：SmartCanvas 组件（前后端）

1. **前端实现**
   - 创建 `genui/components/smart-canvas.tsx`
   - 实现画布绘制功能
   - 实现蒙版绘制功能
   - 实现坐标转换
   - 实现 Base64 蒙版生成
   - 注册组件到 GenUIRegistry

2. **后端可选支持**（如需要）
   - 在 Executor 节点中生成 SmartCanvas 组件（可选）

3. **集成测试**
   - 测试画布显示
   - 测试蒙版绘制
   - 测试蒙版数据传递到后端

### 阶段四：重试按钮（前端）

1. **实现重试逻辑**
   - 修改 `genui/components/image-view.tsx`
   - 实现重试按钮点击处理
   - 保存原始请求信息（可选）

2. **测试**
   - 测试重试按钮功能
   - 测试重试后消息流

## 五、文件清单

### 5.1 新增文件

#### 前端
```
main/web/
├── lib/
│   ├── db/
│   │   └── database.ts              # IndexedDB 数据库定义
│   └── services/
│       └── message-service.ts       # 消息存储服务
├── stores/
│   └── session-store.ts             # Zustand 会话状态管理
├── components/
│   └── layout/
│       └── sidebar.tsx              # 侧边栏组件
└── genui/
    └── components/
        └── smart-canvas.tsx          # SmartCanvas 组件
```

#### 后端（可选）
```
main/server/src/agent/
└── services/
    └── session-context.service.ts   # 会话上下文服务（可选）
```

### 5.2 修改文件

#### 前端
```
main/web/
├── hooks/
│   └── use-sse.ts                   # 添加 sessionId 传递
├── components/
│   └── chat/
│       └── chat-interface.tsx       # 集成会话管理和消息加载
├── genui/
│   └── components/
│       └── image-view.tsx          # 实现重试按钮
└── app/
    └── chat/
        └── page.tsx                 # 添加侧边栏布局
```

#### 后端（可选）
```
main/server/src/agent/
├── agent.service.ts                 # 可选：添加会话上下文缓存
└── nodes/
    └── executor.node.ts            # 可选：生成 SmartCanvas 组件
```

## 六、技术约束和注意事项

### 6.1 前端约束

1. **IndexedDB 容量限制**
   - 浏览器通常限制 50MB-1GB
   - 需要实现数据清理策略（如：LRU淘汰策略）

2. **状态同步**
   - 确保 Zustand Store 和 IndexedDB 数据一致
   - 页面刷新时从 IndexedDB 恢复状态

3. **性能优化**
   - 消息列表时使用虚拟滚动
   - 图片懒加载
   - 组件按需加载

### 6.2 后端约束

1. **内存缓存限制**
   - 如果使用内存缓存，需要实现 LRU 策略
   - 设置最大缓存数量（如：100 个会话）

2. **会话超时**
   - 实现会话超时清理（如：30 分钟无活动）

### 6.3 兼容性

1. **浏览器支持**
   - IndexedDB：现代浏览器均支持
   - Dexie.js：需要 Promise 支持（IE11+）

2. **移动端**
   - IndexedDB 在移动浏览器中支持良好
   - 需要注意存储容量限制

## 七、后续优化方向

### 7.1 功能增强

1. **会话搜索**
   - 实现会话标题和消息内容搜索

2. **会话导出/导入**
   - 支持导出会话为 JSON
   - 支持导入会话

3. **会话分享**
   - 生成会话分享链接

4. **上下文记忆**
   - 后端实现 LLM 上下文记忆
   - 支持长对话上下文

### 7.2 性能优化

1. **数据压缩**
   - 压缩存储的 JSON 数据

2. **增量加载**
   - 消息列表分页加载

3. **图片优化**
   - 图片缩略图缓存
   - 懒加载优化

### 7.3 用户体验

1. **拖拽排序**
   - 会话列表拖拽排序

2. **快捷键**
   - 新建会话：Cmd/Ctrl + N
   - 搜索：Cmd/Ctrl + K

3. **主题定制**
   - 会话列表主题定制

## 八、风险评估

### 8.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| IndexedDB 存储限制 | 中 | 实现数据清理策略 |
| 浏览器兼容性 | 低 | 使用 Dexie.js 兼容层 |
| 状态同步问题 | 中 | 完善的错误处理和恢复机制 |
| 性能问题（大量数据） | 中 | 虚拟滚动和分页加载 |

### 8.2 业务风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 数据丢失 | 高 | 定期备份到服务器（可选） |
| 用户体验不一致 | 中 | 完善的加载状态和错误提示 |

## 九、总结

本方案以前端实现为主，后端最小改动，实现了：

1. ✅ **侧边栏和会话管理**：使用 IndexedDB + Zustand，完全前端实现
2. ✅ **多轮对话支持**：前端维护会话历史，后端仅需传递 sessionId（已支持）
3. ✅ **SmartCanvas 组件**：前端完整实现，后端可选支持
4. ✅ **重试按钮**：前端实现，调用现有接口

**后端改动最小化：**
- 无需添加数据库
- 无需添加 Docker
- 仅可选的内存缓存（如需要上下文记忆）

**实施优先级：**
1. 阶段一：侧边栏和会话管理（核心功能）
2. 阶段二：多轮对话支持（核心功能）
3. 阶段三：SmartCanvas 组件（重要功能）
4. 阶段四：重试按钮（增强功能）
