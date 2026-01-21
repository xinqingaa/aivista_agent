# 前端实施补充文档 - 边界情况与最佳实践

> **版本**: v1.0
> **日期**: 2025-01-21
> **状态**: 补充说明

---

## 目录

- [1. 关键问题与解决方案](#1-关键问题与解决方案)
- [2. 现有代码集成策略](#2-现有代码集成策略)
- [3. 错误处理与用户体验](#3-错误处理与用户体验)
- [4. 状态管理优化](#4-状态管理优化)
- [5. 性能优化](#5-性能优化)
- [6. 安全性考虑](#6-安全性考虑)
- [7. 测试策略](#7-测试策略)

---

## 1. 关键问题与解决方案

### 1.1 项目现状分析

**已实现的功能**：
- ✅ SSE 客户端（`use-sse.ts`）
- ✅ GenUI 渲染系统（`genui/`）
- ✅ 聊天界面（`chat-interface.tsx`）
- ✅ 基础 UI 组件库（shadcn/ui）

**缺失的功能**：
- ❌ 状态管理（stores 目录不存在）
- ❌ 数据持久化（无 IndexedDB 实现）
- ❌ 侧边栏导航
- ❌ 对话历史管理
- ❌ 重新生成功能

### 1.2 集成策略

#### 方案 A：渐进式集成（强烈推荐）

```
阶段1: 保持现有代码，添加状态管理（1-2天）
├─ 创建 stores 目录和 conversation-store.ts
├─ 创建 lib/db/conversation-db.ts
├─ 测试 IndexedDB 存储是否正常
└─ 不修改现有 chat-interface.tsx

阶段2: 集成侧边栏（2天）
├─ 创建 components/sidebar/Sidebar.tsx
├─ 修改 app/(main)/page.tsx 使用新布局
└─ 保留原聊天功能

阶段3: 迁移聊天功能到新架构（2-3天）
├─ 修改 chat-interface.tsx 使用 Store
├─ 添加多轮对话支持
└─ 测试数据同步

阶段4: 完善功能（1-2天）
├─ 添加功能按钮
├─ 实现重新生成
└─ 优化用户体验
```

#### 方案 B：一次性重写（不推荐）

```
❌ 风险：
   - 破坏现有功能
   - 需要大量测试
   - 可能引入新 Bug
   - 时间不可控
```

**推荐方案**：方案 A，渐进式集成

---

## 2. 现有代码集成策略

### 2.1 创建 stores 目录结构

```bash
main/web/
├── stores/
│   ├── index.ts                    # 导出所有 store
│   ├── conversation-store.ts        # 会话状态管理
│   ├── ui-store.ts                 # UI 状态管理
│   └── middleware/
│       ├── persistence.ts          # 持久化中间件
│       └── sync.ts                 # 同步中间件
```

### 2.2 创建 conversation-store.ts（兼容现有代码）

```typescript
// stores/conversation-store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Conversation, Message, GenUIComponent } from '@/lib/types/conversation';
import { ConversationDB } from '@/lib/db/conversation-db';

interface ConversationStore {
  // 状态（与现有代码兼容）
  conversations: Conversation[];
  activeConversationId: string | null;

  // 操作
  createConversation: (title?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  addMessage: (conversationId: string, message: Message) => Promise<void>;
  addGenUIComponent: (conversationId: string, component: GenUIComponent) => Promise<void>;

  // 迁移辅助方法
  migrateFromLegacy: (sessionId: string, messages: Message[], components: GenUIComponent[]) => Promise<string>;
}

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,

      createConversation: async (title) => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();

        const newConversation: Conversation = {
          id,
          title: title || '新对话',
          status: 'active',
          createdAt: now,
          updatedAt: now,
          messages: [],
          genUIComponents: [],
          metadata: {},
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: id,
        }));

        await ConversationDB.addConversation(newConversation);
        return id;
      },

      selectConversation: async (id) => {
        set({ activeConversationId: id });
        const conversation = await ConversationDB.getConversation(id);
        if (conversation) {
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === id ? conversation : c
            ),
          }));
        }
      },

      deleteConversation: async (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        }));
        await ConversationDB.deleteConversation(id);
      },

      addMessage: async (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: [...c.messages, message],
                updatedAt: Date.now(),
              };
            }
            return c;
          }),
        }));

        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation) {
          await ConversationDB.updateConversation(conversationId, conversation);
        }
      },

      addGenUIComponent: async (conversationId, component) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                genUIComponents: [...c.genUIComponents, component],
                updatedAt: Date.now(),
              };
            }
            return c;
          }),
        }));

        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation) {
          await ConversationDB.updateConversation(conversationId, conversation);
        }
      },

      // 迁移辅助方法：将现有 sessionId 迁移到新系统
      migrateFromLegacy: async (sessionId, messages, components) => {
        const conversationId = `conv_migrated_${Date.now()}`;
        const now = Date.now();

        const migratedConversation: Conversation = {
          id: conversationId,
          title: messages[0]?.content?.slice(0, 30) || '迁移的对话',
          status: 'active',
          createdAt: now,
          updatedAt: now,
          messages,
          genUIComponents: components,
          metadata: {
            legacySessionId: sessionId,
            migratedAt: now,
          },
        };

        set((state) => ({
          conversations: [migratedConversation, ...state.conversations],
          activeConversationId: conversationId,
        }));

        await ConversationDB.addConversation(migratedConversation);
        return conversationId;
      },
    }),
    {
      name: 'aivista-conversation-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
```

### 2.3 修改 use-sse.ts 支持 conversationId

```typescript
// hooks/use-sse.ts 修改

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  // ... 现有代码 ...

  // 发送消息方法（修改签名）
  const sendMessage = useCallback((
    text: string,
    options: {
      conversationId?: string;  // 新增：支持 conversationId
      maskData?: any;
    } = {}
  ) => {
    const { conversationId, maskData } = options;
    const body = {
      text,
      ...(conversationId && { conversationId }),  // 优先使用 conversationId
      ...(maskData && { maskData }),
    };

    if (callbacksRef.current.onChatStart) {
      callbacksRef.current.onChatStart();
    }

    sse.send(body);
  }, [sse]);

  return {
    ...sse,
    sendMessage,
  };
}
```

### 2.4 修改 chat-interface.tsx 集成 Store

```typescript
// components/chat/chat-interface.tsx 修改

import { useConversationStore } from '@/stores/conversation-store';

export function ChatInterface({
  title = 'AI 创作助手',
  placeholder = '输入你的创意，让 AI 来实现...',
  onChatEnd,
}: ChatInterfaceProps) {
  // === 新增：Store 集成 ===
  const {
    getActiveConversation,
    activeConversationId,
    createConversation,
    addMessage,
    addGenUIComponent,
  } = useConversationStore();

  const activeConversation = getActiveConversation();

  // 初始化：如果没有活跃对话，创建一个
  useEffect(() => {
    if (!activeConversationId) {
      createConversation('新对话');
    }
  }, [activeConversationId, createConversation]);

  // === 现有状态保留（向后兼容） ===
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // === 修改：使用 Store 中的数据 ===
  const messages = activeConversation?.messages || [];
  const genUIComponents = activeConversation?.genUIComponents || [];

  // ... 其他代码保持不变 ...

  // === 修改：handleSend 集成 Store ===
  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    // 确保有活跃对话
    let currentId = activeConversationId;
    if (!currentId) {
      currentId = await createConversation('新对话');
    }

    // 添加用户消息到 Store
    await addMessage(currentId, {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });

    // 如果是第一条消息，更新对话标题
    if (activeConversation && activeConversation.messages.length === 0) {
      const newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
      await useConversationStore.getState().updateConversation(currentId, {
        title: newTitle,
      });
    }

    // 发送到后端（传递 conversationId）
    sendMessage(text, { conversationId: currentId });
    setInput('');
  };

  // ... 其他代码保持不变 ...
}
```

---

## 3. 错误处理与用户体验

### 3.1 SSE 连接错误处理

```typescript
// hooks/use-sse.ts 增强版

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  // ... 现有代码 ...

  const strategy = useMemo(() => ({
    onThoughtLog: (event) => {
      const callback = callbacksRef.current.onThoughtLog;
      if (callback && event.data) {
        callback(event.data as ThoughtLogEventData);
      }
    },
    onEnhancedPrompt: (event) => {
      const callback = callbacksRef.current.onEnhancedPrompt;
      if (callback && event.data) {
        callback(event.data as EnhancedPromptEventData);
      }
    },
    onGenUIComponent: (event) => {
      const callback = callbacksRef.current.onGenUIComponent;
      if (callback && event.data) {
        callback(event.data as GenUIComponentEventData);
      }
    },
    onError: (event) => {
      const callback = callbacksRef.current.onError;
      if (callback && event.data) {
        const errorData = event.data as ErrorEventData;

        // === 新增：错误分类处理 ===
        switch (errorData.code) {
          case 'NETWORK_ERROR':
            toast.error('网络连接失败，请检查网络设置');
            break;
          case 'TIMEOUT':
            toast.error('请求超时，请重试');
            break;
          case 'SERVER_ERROR':
            toast.error('服务器错误，请稍后再试');
            break;
          case 'INTENT_UNKNOWN':
            toast.error('无法识别您的意图，请重新描述');
            break;
          case 'TOO_MANY_REQUESTS':
            toast.warning('请求过于频繁，请稍后再试');
            break;
          default:
            toast.error(errorData.message || '发生未知错误');
        }

        if (callback) {
          callback(errorData);
        }
      }
    },
    onStreamEnd: () => {
      const callback = callbacksRef.current.onChatEnd;
      if (callback) {
        callback();
      }
    },
    onStatusChange: (status) => {
      const callback = callbacksRef.current.onStatusChange;

      // === 新增：连接状态变化提示 ===
      if (status === 'disconnected') {
        toast.warning('连接已断开');
      } else if (status === 'connecting') {
        // 可以显示加载提示
      } else if (status === 'connected') {
        // 连接成功
      }

      if (callback) {
        callback(status);
      }
    },
  }), []); // 注意：依赖项为空，需要通过 callbacksRef 更新

  // ... 其他代码 ...
}
```

### 3.2 IndexedDB 错误处理

```typescript
// lib/db/conversation-db.ts 增强版

import Dexie, { Table } from 'dexie';
import { Conversation } from '@/lib/types/conversation';

export class ConversationDatabase extends Dexie {
  conversations!: Table<Conversation, string>;

  constructor() {
    super('AiVistaConversationsDB');

    this.version(1).stores({
      conversations: 'id, title, createdAt, updatedAt, status',
    });

    // 错误处理
    this.on('blocked', () => {
      console.error('[IndexedDB] Database blocked');
      toast.warning('数据库访问被阻止，请关闭其他标签页后重试');
    });

    this.on('versionchange', () => {
      console.log('[IndexedDB] Database version changed, closing');
      this.close();
    });
  }
}

export const db = new ConversationDatabase();

export class ConversationDB {
  /**
   * 添加对话（带错误处理）
   */
  static async addConversation(conversation: Conversation): Promise<void> {
    try {
      await db.conversations.add(conversation);
    } catch (error) {
      console.error('[IndexedDB] Failed to add conversation:', error);

      // 检测 IndexedDB 是否可用
      if (!this.isIndexedDBAvailable()) {
        toast.error('浏览器不支持本地存储，数据不会被保存');
        throw new Error('IndexedDB not available');
      }

      // 配额超限
      if (error.name === 'QuotaExceededError') {
        toast.error('存储空间不足，请清理旧对话');
        throw new Error('Quota exceeded');
      }

      throw error;
    }
  }

  /**
   * 检测 IndexedDB 是否可用
   */
  static isIndexedDBAvailable(): boolean {
    try {
      const test = '__indexeddb_test__';
      window.indexedDB.deleteDatabase(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检测是否在无痕模式
   */
  static isPrivateMode(): boolean {
    return !this.isIndexedDBAvailable();
  }

  // ... 其他方法 ...
}
```

### 3.3 网络重连策略

```typescript
// hooks/use-sse.ts 增强版（添加重连逻辑）

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  // ... 现有代码 ...

  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 2000;

  const sendMessage = useCallback((text: string, options: { conversationId?: string; maskData?: any } = {}) => {
    const { conversationId, maskData } = options;
    const body = {
      text,
      ...(conversationId && { conversationId }),
      ...(maskData && { maskData }),
    };

    if (callbacksRef.current.onChatStart) {
      callbacksRef.current.onChatStart();
    }

    // === 新增：错误处理和重连 ===
    const attemptSend = async (attempt: number = 0) => {
      try {
        sse.send(body);
        setRetryCount(0); // 重置重试计数
      } catch (error) {
        console.error(`[useAgentChat] Send failed (attempt ${attempt + 1}):`, error);

        if (attempt < maxRetries) {
          toast.warning(`连接失败，正在重试 (${attempt + 1}/${maxRetries})...`);

          // 指数退避
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));

          return attemptSend(attempt + 1);
        } else {
          toast.error('连接失败，请刷新页面后重试');
          setRetryCount(maxRetries);

          // 触发错误回调
          if (callbacksRef.current.onError) {
            callbacksRef.current.onError({
              code: 'NETWORK_ERROR',
              message: 'Failed to connect after multiple retries',
              timestamp: Date.now(),
            });
          }
        }
      }
    };

    attemptSend();
  }, [sse, maxRetries, retryDelay]);

  return {
    ...sse,
    sendMessage,
  };
}
```

---

## 4. 状态管理优化

### 4.1 避免 Store 过大

```typescript
// stores/conversation-store.ts 优化版

// 使用 split 分离数据
export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      // 只在内存中保存活跃对话的详细信息
      activeConversation: null,
      activeConversationId: null,

      // 轻量级的对话列表
      conversationListItems: [],

      // 操作
      loadConversationList: async () => {
        const conversations = await ConversationDB.getAllConversations();
        const listItems = conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          status: conv.status,
          updatedAt: conv.updatedAt,
          messageCount: conv.messages.length,
        }));
        set({ conversationListItems: listItems });
      },

      loadConversationDetail: async (id: string) => {
        const conversation = await ConversationDB.getConversation(id);
        set({ activeConversation: conversation });
      },
    }),
    {
      name: 'aivista-conversation-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
```

### 4.2 使用 React Query 管理服务端状态

```bash
pnpm add @tanstack/react-query
```

```typescript
// hooks/use-conversations.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConversationService } from '@/lib/services/conversation-service';

export function useConversations() {
  const queryClient = useQueryClient();

  // 获取对话列表
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => ConversationService.findAll(),
    staleTime: 5 * 60 * 1000, // 5分钟
  });

  // 创建对话
  const createMutation = useMutation({
    mutationFn: (title?: string) => ConversationService.create({ title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // 删除对话
  const deleteMutation = useMutation({
    mutationFn: (id: string) => ConversationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return {
    conversations,
    isLoading,
    error,
    createConversation: createMutation.mutate,
    deleteConversation: deleteMutation.mutate,
  };
}
```

---

## 5. 性能优化

### 5.1 虚拟滚动长列表

```bash
pnpm add @tanstack/react-virtual
```

```typescript
// components/sidebar/VirtualConversationList.tsx

import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualConversationList({ conversations }: { conversations: ConversationListItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 每项高度
    overscan: 5, // 额外渲染的项数
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const conversation = conversations[virtualRow.index];
          return (
            <div
              key={conversation.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ConversationItem item={conversation} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 5.2 图片懒加载

```typescript
// genui/components/image-view.tsx 优化

import { useState, useRef, useEffect } from 'react';

export function ImageView({ imageUrl, ...props }: ImageViewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer 检测图片是否在视口内
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={cn('rounded-lg overflow-hidden bg-muted', props.className)}>
      {!isLoaded && <div className="aspect-square animate-pulse bg-muted" />}

      {isInView && (
        <img
          src={imageUrl}
          alt={props.alt || 'Generated image'}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            'w-full h-auto transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
    </div>
  );
}
```

### 5.3 防抖和节流

```typescript
// hooks/use-debounce.ts

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 使用示例
function SearchInput() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    // 只在防抖后执行搜索
    if (debouncedSearch) {
      // 执行搜索逻辑
    }
  }, [debouncedSearch]);

  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

---

## 6. 安全性考虑

### 6.1 XSS 防护

```typescript
// lib/utils/xss.ts

import DOMPurify from 'dompurify';

/**
 * 清理 HTML 字符串，防止 XSS 攻击
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
  });
}

/**
 * 清理 GenUI 组件的 props
 */
export function sanitizeGenUIProps(props: Record<string, any>): Record<string, any> {
  const sanitized = { ...props };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      // 移除所有 HTML 标签
      sanitized[key] = sanitized[key].replace(/<[^>]*>/g, '');
    }
  }

  return sanitized;
}
```

### 6.2 输入验证

```typescript
// lib/utils/validation.ts

/**
 * 验证 conversationId 格式
 */
export function isValidConversationId(id: string): boolean {
  const regex = /^conv_\d+_[a-z0-9]+$/;
  return regex.test(id);
}

/**
 * 验证用户输入
 */
export function sanitizeUserInput(input: string): string {
  // 限制长度
  const maxLength = 5000;
  if (input.length > maxLength) {
    input = input.slice(0, maxLength);
  }

  // 移除控制字符
  input = input.replace(/[\x00-\x1F\x7F]/g, '');

  return input.trim();
}
```

---

## 7. 测试策略

### 7.1 单元测试

```typescript
// __tests__/stores/conversation-store.test.ts

import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversationStore } from '@/stores/conversation-store';

describe('ConversationStore', () => {
  beforeEach(() => {
    // 清空状态
    useConversationStore.setState({
      conversations: [],
      activeConversationId: null,
    });
  });

  it('should create a new conversation', async () => {
    const { result } = renderHook(() => useConversationStore());

    await act(async () => {
      const id = await result.current.createConversation('测试对话');
      expect(id).toMatch(/^conv_\d+_[a-z0-9]+$/);
    });

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.conversations[0].title).toBe('测试对话');
    });
  });

  it('should add message to conversation', async () => {
    const { result } = renderHook(() => useConversationStore());

    await act(async () => {
      const id = await result.current.createConversation();
      await result.current.addMessage(id, {
        id: 'msg_1',
        role: 'user',
        content: '测试消息',
        timestamp: Date.now(),
      });
    });

    await waitFor(() => {
      const conversation = result.current.conversations[0];
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].content).toBe('测试消息');
    });
  });
});
```

### 7.2 集成测试

```typescript
// __tests__/integration/chat.integration.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '@/components/chat/chat-interface';

describe('Chat Integration', () => {
  it('should send message and display response', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText(/输入你的创意/i);
    const sendButton = screen.getByRole('button', { name: /发送/i });

    await userEvent.type(input, '生成一张猫的图片');
    await userEvent.click(sendButton);

    // 等待消息显示
    await waitFor(() => {
      expect(screen.getByText('生成一张猫的图片')).toBeInTheDocument();
    });
  });
});
```

---

## 8. 移动端适配

### 8.1 响应式设计

```typescript
// hooks/use-mobile.ts

import { useEffect, useState } from 'react';

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// 使用
function Sidebar() {
  const isMobile = useMobile();

  if (isMobile) {
    return <MobileDrawer />;
  }

  return <DesktopSidebar />;
}
```

### 8.2 触摸事件优化

```typescript
// components/sidebar/Sidebar.tsx 优化

export function ConversationItem({ item, onSelect, onDelete }: ConversationItemProps) {
  const [touchStart, setTouchStart] = useState(0);
  const [showDelete, setShowDelete] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // 左滑显示删除按钮
    if (diff > 50) {
      setShowDelete(true);
    } else if (diff < -50) {
      setShowDelete(false);
    }
  };

  return (
    <div
      onClick={onSelect}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* ... 对话项内容 ... */}

      {showDelete && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-0 top-0 bg-red-500"
        >
          删除
        </Button>
      )}
    </div>
  );
}
```

---

## 9. 渐进式 Web 应用（PWA）

### 9.1 Service Worker

```javascript
// public/sw.js

const CACHE_NAME = 'aivista-v1';
const urlsToCache = [
  '/',
  '/chat',
  '/api/agent/chat',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存命中，返回缓存
        if (response) {
          return response;
        }

        // 否则发起网络请求
        return fetch(event.request).then(
          (response) => {
            // 检查是否是有效响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆响应
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
```

### 9.2 Manifest

```json
// public/manifest.json

{
  "name": "AiVista AI",
  "short_name": "AiVista",
  "description": "AI 创作助手",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

**文档版本**: v1.0
**最后更新**: 2025-01-21
**维护者**: AiVista 开发团队
