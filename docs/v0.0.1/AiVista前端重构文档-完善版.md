# AiVista v0.0.1 功能实现方案（完善版）

> **重要说明**：
> - 本文档中的代码示例仅供参考，展示设计思路和数据结构
> - 实际代码实现请参考 `/main/web/` 和 `/main/server/` 目录下的源文件
> - 文档中的文件路径均为绝对路径，基于项目根目录
> - 文档已结合实际代码进行完善，补充了真实的工作流程和数据格式
>
> **审查状态**: ✅ 已完成实际代码审查和文档完善
> **最后更新**: 2026-01-28

## 目录

- [一、现状分析](#一现状分析)
- [二、实际代码架构](#二实际代码架构)
- [三、技术选型](#三技术选型)
- [四、实现方案](#四实现方案)
- [五、实施步骤](#五实施步骤)
- [六、文件清单](#六文件清单)
- [七、技术约束和注意事项](#七技术约束和注意事项)
- [八、后续优化方向](#八后续优化方向)
- [九、风险评估](#九风险评估)
- [十、总结](#十总结)

---

## 一、现状分析

### 1.1 当前功能状态

#### 已实现功能
- ✅ 基础聊天界面（ChatInterface）
  - 位置：`/main/web/components/chat/chat-interface.tsx`
  - 功能：单轮对话、消息展示、SSE 流式接收
- ✅ SSE 流式通信
  - 位置：`/main/web/lib/sse/sse-client.ts`
  - 功能：POST 请求、自动重连、事件解析
- ✅ Agent 工作流（Planner → RAG → Executor → Critic）
  - 位置：`/main/server/src/agent/graph/agent.graph.ts`
  - 功能：完整的工作流状态管理和节点执行
- ✅ GenUI 组件系统
  - 位置：`/main/web/genui/`
  - 已实现组件：
    - ✅ `ThoughtLogItem` - `/main/web/genui/components/thought-log-item.tsx`
    - ✅ `EnhancedPromptView` - `/main/web/genui/components/enhanced-prompt-view.tsx`
    - ✅ `ImageView` - `/main/web/genui/components/image-view.tsx`
    - ❌ `SmartCanvas` - 未实现（文档 3.3 节提供参考实现）
    - ❓ `AgentMessage` - 需要确认实现状态
    - ❓ `ActionPanel` - 需要确认实现状态
- ✅ 后端支持 `sessionId` 参数
  - 位置：`/main/server/src/agent/agent.controller.ts:260`
  - 功能：接收和传递 sessionId，但无持久化和上下文记忆

#### 缺失功能
- ❌ 侧边栏设计和会话管理
  - 当前状态：无侧边栏组件
  - 数据存储：无 IndexedDB 实现
  - 状态管理：Zustand 已安装但未使用
- ❌ SmartCanvas 组件实现
  - 类型定义：已存在（`/main/web/lib/types/genui.ts:49-55`）
  - 组件实现：未找到对应文件
- ❌ 重试按钮功能实现
  - ImageView 组件未实现重试逻辑
  - 未保存原始请求信息
- ❌ 多轮对话支持（前端会话历史管理）
  - 当前状态：每次刷新页面，消息丢失
  - sessionId 已传递，但前端未实现会话管理

### 1.2 技术现状

#### 后端
- 框架：NestJS + LangGraph
- 会话管理：仅支持 `sessionId` 参数传递，无持久化
- 接口：`POST /api/agent/chat` 支持 `sessionId`、`text`、`maskData`、`preferredModel`
- SSE 实现：`/main/server/src/agent/agent.controller.ts:248`

#### 前端
- 框架：Next.js 14 + React 18 + TypeScript
- 状态管理：Zustand 已安装但未使用，当前使用 React Hooks
- 数据存储：无本地数据库，状态仅存在于内存
- SSE 客户端：`useAgentChat` Hook (`/main/web/hooks/use-sse.ts`)，每次发送消息创建新连接

---

## 二、实际代码架构

> 本章基于实际代码分析，说明真实的架构设计、数据流和工作流程。

### 2.1 SSE 事件类型和数据格式

**后端实际发送的事件** (`/main/server/src/agent/agent.controller.ts:281-295`):

```typescript
// SSE 事件格式（后端 → 前端）
event: connection
data: {"status":"connected","sessionId":"session_1234567890"}

event: thought_log
data: {"type":"thought_log","timestamp":1234567890,"data":{"node":"planner","message":"已识别意图：generate_image"}}

event: enhanced_prompt
data: {"type":"enhanced_prompt","timestamp":1234567891,"data":{"original":"生成一只赛博朋克风格的猫","retrieved":[...],"final":"..."}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1234567892,"data":{"widgetType":"ImageView","props":{...}}}

event: stream_end
data: {"type":"stream_end","timestamp":1234567893,"data":{"sessionId":"session_1234567890","summary":"任务完成"}}
```

**关键点**：
- 后端发送嵌套格式：`{type, timestamp, data}`
- 前端 SSE 客户端会提取内层的 `data` 作为实际业务数据
- 事件类型：`connection`, `thought_log`, `enhanced_prompt`, `gen_ui_component`, `error`, `stream_end`

**前端实际的事件处理** (`/main/web/lib/sse/sse-client.ts:229-276`):

```typescript
// 前端解析逻辑
const parsedData = JSON.parse(data);
const isNestedFormat = parsedData.type && parsedData.data !== undefined;

if (isNestedFormat) {
  // 后端发送的是完整事件对象，提取内层数据
  event = {
    type: eventType as any,
    timestamp: parsedData.timestamp || Date.now(),
    data: parsedData.data,  // ← 提取真实的业务数据
  };
}
```

### 2.2 GenUI 组件注册机制

**注册表实现** (`/main/web/genui/core/gen-ui-registry.ts`):

```typescript
// 单例模式
export class GenUIRegistry {
  private static instance: GenUIRegistry;
  private components: Map<GenUIWidgetType, ComponentDefinition> = new Map();

  static getInstance(): GenUIRegistry {
    if (!GenUIRegistry.instance) {
      GenUIRegistry.instance = new GenUIRegistry();
    }
    return GenUIRegistry.instance;
  }

  register(definition: ComponentDefinition): void {
    // definition: { type, component, validate?, transform? }
    this.components.set(definition.type, definition);
  }

  get(type: GenUIWidgetType): ComponentDefinition | undefined {
    return this.components.get(type);
  }
}
```

**组件类型定义** (`/main/web/lib/types/genui.ts:10-16`):

```typescript
// 前端完整的组件类型列表
export type GenUIWidgetType =
  | 'SmartCanvas'
  | 'ImageView'
  | 'AgentMessage'
  | 'ActionPanel'
  | 'EnhancedPromptView'  // 注意：后端未定义此类型
  | 'ThoughtLogItem';     // 注意：后端未定义此类型
```

**类型不一致问题**：
- 后端 GenUI 协议 (`/main/server/src/common/types/genui-component.interface.ts:3`)：仅定义了 `SmartCanvas | ImageView | AgentMessage | ActionPanel`
- 前端类型定义：额外包含 `EnhancedPromptView` 和 `ThoughtLogItem`
- **实际工作方式**：前端通过 `ChatInterface` 将 `thought_log` 和 `enhanced_prompt` SSE 事件转换为对应的 GenUI 组件

### 2.3 ChatInterface 实际工作流程

**文件位置**：`/main/web/components/chat/chat-interface.tsx`

**SSE 事件到 GenUI 组件的转换** (`/main/web/components/chat/chat-interface.tsx:212-253`):

```typescript
const { sendMessage } = useAgentChat({
  onChatStart: () => {
    setIsProcessing(true);
    setGenUIComponents([]); // 清空组件状态
  },

  // 1. thought_log 事件 → ThoughtLogItem 组件
  onThoughtLog: (data: ThoughtLogEventData) => {
    addGenUIComponent({
      id: generateComponentId('thought'),
      widgetType: 'ThoughtLogItem',
      props: {
        node: data.node,
        message: data.message,
        progress: data.progress,
        metadata: data.metadata,
        timestamp: Date.now(),
      },
    });
  },

  // 2. enhanced_prompt 事件 → EnhancedPromptView 组件
  onEnhancedPrompt: (data: EnhancedPromptEventData) => {
    addGenUIComponent({
      id: generateComponentId('enhanced'),
      widgetType: 'EnhancedPromptView',
      props: {
        original: data.original,
        retrieved: data.retrieved,
        final: data.final,
      },
    });
  },

  // 3. gen_ui_component 事件 → 直接渲染（ImageView, SmartCanvas 等）
  onGenUIComponent: (data: GenUIComponentEventData) => {
    const component: GenUIComponent = {
      id: data.id || generateComponentId(data.widgetType.toLowerCase()),
      widgetType: data.widgetType as GenUIComponent['widgetType'],
      props: data.props as GenUIComponent['props'],
      updateMode: data.updateMode,
      targetId: data.targetId,
    };

    if (data.updateMode && data.updateMode !== 'append') {
      updateGenUIComponent(component);
    } else {
      addGenUIComponent(component);
    }
  },

  onChatEnd: () => {
    setIsProcessing(false);
  },
});
```

**组件布局结构** (`/main/web/components/chat/chat-interface.tsx:37-145`):

```typescript
// 实际的渲染顺序
<div className="space-y-6">
  {/* 第一层：思考过程 (Timeline) */}
  <div className="ml-1 pl-4 border-l-2 border-muted/50 space-y-0">
    {thoughtLogs.map((component, index) => {
      const isLast = index === thoughtLogs.length - 1;
      return <GenUIRenderer key={component.id} component={{...component, props: {...props, isLast}}} />;
    })}
  </div>

  {/* 第二层：增强 Prompt */}
  {enhancedPrompts.map((component) => (
    <GenUIRenderer key={component.id} component={component} />
  ))}

  {/* 第三层：生成结果（ImageView + 关联的 ActionPanel） */}
  {images.map((imageComponent) => {
    // 查找关联的 ActionPanel（通过 targetId）
    const relatedActionPanel = components.find(
      c => c.widgetType === 'ActionPanel' &&
           (c.targetId === imageComponent.id || ...)
    );
    // 合并 actions 到 ImageView props
    return <GenUIRenderer component={{...imageComponent, props: {...props, actions: ...}}} />;
  })}
</div>
```

### 2.4 updateMode 实际实现

**Update 逻辑** (`/main/web/components/chat/chat-interface.tsx:172-205`):

```typescript
const updateGenUIComponent = useCallback((component: GenUIComponent) => {
  setGenUIComponents(prev => {
    const updateMode = component.updateMode || 'append';

    switch (updateMode) {
      case 'replace':
        // 替换同 ID 的组件
        if (component.id) {
          const index = prev.findIndex(c => c.id === component.id);
          if (index !== -1) {
            const newComponents = [...prev];
            newComponents[index] = component;
            return newComponents;
          }
        }
        return [...prev, component];

      case 'update':
        // 更新同 ID 组件的属性（合并）
        if (component.id) {
          return prev.map(c =>
            c.id === component.id
              ? { ...c, props: { ...c.props, ...component.props } }
              : c
          );
        }
        return [...prev, component];

      case 'append':
      default:
        return [...prev, component];
    }
  });
}, []);
```

### 2.5 后端 Agent 工作流状态图

**状态图定义** (`/main/server/src/agent/graph/agent.graph.ts`):

```
工作流状态：
┌──────────────────────────────────────────────────────────────┐
│ State Channels (使用 LangGraph Annotations)                  │
├──────────────────────────────────────────────────────────────┤
│ userInput      → 用户输入（text, maskData, preferredModel）  │
│ intent         → 意图识别结果（action, subject, style, ...）  │
│ enhancedPrompt → 增强后的提示词（original, retrieved, final）│
│ generatedImageUrl → 生成的图片 URL                          │
│ qualityCheck   → 质量检查结果（passed, score, feedback）     │
│ uiComponents   → GenUI 组件列表（append 策略）               │
│ thoughtLogs    → 执行日志（append 策略）                     │
│ metadata       → 元数据（retryCount, currentNode, ...）      │
│ sessionId      → 会话 ID                                     │
│ error          → 错误信息                                    │
└──────────────────────────────────────────────────────────────┘

工作流节点：
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Planner  │ →  │   RAG    │ →  │ Executor │ →  │  Critic  │
│ 意图识别  │    │  向量检索  │    │  任务执行  │    │  质量审查  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                      │                              │
                      └─────── retry (max 3) ────────┘
                              (if quality check failed)

条件边：
1. planner → rag 或 END: intent.action === 'unknown' 则结束
2. rag → executor: 总是继续
3. executor → critic 或 END: 生成成功则继续
4. critic → END 或 rag: qualityCheck.passed === true 则结束，否则重试
```

**关键配置** (`/main/server/src/config/configuration.ts`):

```typescript
// Agent 配置
MAX_RETRY_COUNT: 3              // 最大重试次数
CRITIC_PASS_THRESHOLD: 0.7      // 质量检查阈值
CRITIC_USE_LLM: false           // 是否使用 LLM 进行质量检查（默认简单逻辑）

// RAG 配置
RAG_MIN_SIMILARITY: 0.4         // 最小相似度阈值
RAG_SEARCH_LIMIT: 3             // 检索结果数量

// 图片生成配置
USE_REAL_IMAGE_SERVICE: false   // 是否使用真实图片服务（默认 mock）
ALIYUN_IMAGE_MODEL: 'qwen-image-plus'
ALIYUN_IMAGE_SIZE: '1024x1024'
```

### 2.6 前端目录结构（实际）

```
/main/web/
├── app/
│   ├── (main)/                      # 路由组
│   │   ├── knowledge/               # 知识库管理页面
│   │   │   └── page.tsx
│   │   ├── layout.tsx               # 主布局（Header + Footer）
│   │   └── page.tsx                 # 首页
│   ├── chat/
│   │   └── page.tsx                 # 聊天页面
│   └── layout.tsx                   # 根布局（ThemeProvider）
├── components/
│   ├── chat/
│   │   └── chat-interface.tsx       # ✅ 核心聊天组件
│   ├── knowledge/                   # 知识库相关组件
│   ├── layout/                      # 布局组件
│   └── ui/                          # shadcn/ui 基础组件
├── genui/
│   ├── components/
│   │   ├── thought-log-item.tsx     # ✅ 已实现
│   │   ├── enhanced-prompt-view.tsx # ✅ 已实现
│   │   ├── image-view.tsx           # ✅ 已实现
│   │   ├── smart-canvas.tsx         # ❌ 未实现
│   │   ├── agent-message.tsx        # ❓ 未找到
│   │   └── action-panel.tsx         # ❓ 未找到
│   ├── core/
│   │   ├── gen-ui-registry.ts       # ✅ 注册表
│   │   └── gen-ui-renderer.tsx      # ✅ 渲染器
│   └── index.ts
├── hooks/
│   ├── use-sse.ts                   # ✅ SSE Hooks
│   ├── use-knowledge.ts             # 知识库 Hooks
│   └── use-toast.ts                 # Toast 通知
├── lib/
│   ├── api/
│   │   └── client.ts                # API 客户端
│   ├── sse/
│   │   ├── sse-client.ts            # ✅ SSE 客户端
│   │   └── event-handler.ts         # 事件处理器
│   └── types/
│       ├── sse.ts                   # ✅ SSE 类型定义
│       └── genui.ts                 # ✅ GenUI 类型定义
└── package.json
```

---

## 三、技术选型
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
