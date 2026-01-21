# 前端多轮对话优化实施指南

> **版本**: v1.0
> **日期**: 2025-01-21
> **状态**: 实施阶段
> **预估工作量**: 5-7天

---

## 目录

- [1. 总体目标](#1-总体目标)
- [2. 技术方案](#2-技术方案)
- [3. 实施步骤](#3-实施步骤)
  - [Phase 1: 状态管理架构](#phase-1-状态管理架构-1-2天)
  - [Phase 2: 侧边栏UI](#phase-2-侧边栏ui-2天)
  - [Phase 3: 集成聊天功能](#phase-3-集成聊天功能-1-2天)
  - [Phase 4: 功能按钮增强](#phase-4-功能按钮增强-1天)
  - [Phase 5: 优化和完善](#phase-5-优化和完善-1天)
- [4. 数据结构设计](#4-数据结构设计)
- [5. 组件设计](#5-组件设计)
- [6. 代码示例](#6-代码示例)

---

## 1. 总体目标

### 1.1 核心需求

1. ✅ **状态持久化** - 页面刷新不丢失对话数据
2. ✅ **会话管理** - 支持创建、切换、删除对话
3. ✅ **侧边栏导航** - 实现可展开/收缩的侧边栏
4. ✅ **功能按钮** - 重新生成、预览、下载等
5. ✅ **多轮对话优化** - 同一对话内多轮消息展示优化

### 1.2 技术选型

| 组件 | 技术栈 | 说明 |
|------|--------|------|
| 状态管理 | Zustand | 轻量级，已安装 |
| 本地存储 | IndexedDB | 大容量存储，配合Dexie.js |
| UI组件库 | shadcn/ui | 已有基础 |
| 日期处理 | date-fns | 可选，用于时间格式化 |

---

## 2. 技术方案

### 2.1 存储架构

```
前端
    ↓
Zustand Store (内存缓存)
    ↓ 自动同步
IndexedDB (持久化)
    ↓ API调用
后端 (PostgreSQL)
```

### 2.2 数据流设计

```
用户操作
    ↓
前端组件
    ↓
Zustand Store
    ├→ 立即更新UI (内存)
    └→ 异步持久化 (IndexedDB)
    ↓ (可选)
后端API (同步到服务器)
```

### 2.3 conversationId 设计

```typescript
// 格式: conv_{timestamp}_{random}
const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 示例: conv_1737451200000_a3f8k2m9
```

---

## 3. 实施步骤

### Phase 1: 状态管理架构 (1-2天)

**目标**: 建立Zustand Store和存储层

#### 任务清单

- [ ] **Task 1.1**: 安装必要依赖
  ```bash
  cd main/web
  pnpm add dexie date-fns
  pnpm add -D @types/dexie
  ```

- [ ] **Task 1.2**: 创建类型定义文件
  ```typescript
  // lib/types/conversation.ts

  /**
   * 消息角色
   */
  export type MessageRole = 'user' | 'assistant' | 'system';

  /**
   * 对话消息
   */
  export interface Message {
     id: string;
     role: MessageRole;
     content: string;
     timestamp: number;
     metadata?: {
       sessionId?: string;
       maskData?: any;
       preferredModel?: string;
       imageUrl?: string;
       componentIds?: string[];
       [key: string]: any;
     };
  }

  /**
   * GenUI组件
   */
  export interface GenUIComponent {
    id: string;
    widgetType: string;
    props: Record<string, any>;
    updateMode?: 'append' | 'replace' | 'update';
    targetId?: string;
    timestamp?: number;
  }

  /**
   * 对话状态
   */
  export type ConversationStatus = 'active' | 'completed' | 'failed';

  /**
   * 对话
   */
  export interface Conversation {
    id: string; // conversationId
    title: string;
    status: ConversationStatus;
    createdAt: number;
    updatedAt: number;
    messages: Message[];
    genUIComponents: GenUIComponent[];
    metadata?: {
      model?: string;
      totalMessages?: number;
      totalImages?: number;
      [key: string]: any;
    };
  }

  /**
   * 对话列表项（用于侧边栏）
   */
  export interface ConversationListItem {
    id: string;
    title: string;
    status: ConversationStatus;
    createdAt: number;
    updatedAt: number;
    isActive: boolean;
    thumbnail?: string;
    messageCount: number;
  }

  /**
   * 侧边栏状态
   */
  export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

  /**
   * UI状态
   */
  export interface UIState {
    sidebar: {
      state: SidebarState;
      width: number;
    };
    isMobile: boolean;
  }
  ```

- [ ] **Task 1.3**: 实现IndexedDB数据库
  ```typescript
  // lib/db/conversation-db.ts
  import Dexie, { Table } from 'dexie';
  import { Conversation, Message, GenUIComponent } from '@/lib/types/conversation';

  /**
   * 对话数据库
   */
  export class ConversationDatabase extends Dexie {
    conversations!: Table<Conversation, string>;

    constructor() {
      super('AiVistaConversationsDB');
      this.version(1).stores({
        conversations: 'id, title, createdAt, updatedAt, status',
      });
    }
  }

  export const db = new ConversationDatabase();

  /**
   * 数据库操作类
   */
  export class ConversationDB {
    /**
     * 添加对话
     */
    static async addConversation(conversation: Conversation): Promise<void> {
      await db.conversations.add(conversation);
    }

    /**
     * 获取对话
     */
    static async getConversation(id: string): Promise<Conversation | undefined> {
      return await db.conversations.get(id);
    }

    /**
     * 获取所有对话
     */
    static async getAllConversations(): Promise<Conversation[]> {
      return await db.conversations.toArray();
    }

    /**
     * 更新对话
     */
    static async updateConversation(id: string, updates: Partial<Conversation>): Promise<number> {
      return await db.conversations.update(id, updates);
    }

    /**
     * 删除对话
     */
    static async deleteConversation(id: string): Promise<void> {
      await db.conversations.delete(id);
    }

    /**
     * 清空所有对话
     */
    static async clearAll(): Promise<void> {
      await db.conversations.clear();
    }
  }
  ```

- [ ] **Task 1.4**: 实现Zustand Store
  ```typescript
  // stores/conversation-store.ts
  import { create } from 'zustand';
  import { persist, createJSONStorage } from 'zustand/middleware';
  import { Conversation, Message, GenUIComponent, ConversationListItem, UIState } from '@/lib/types/conversation';
  import { ConversationDB } from '@/lib/db/conversation-db';

  interface ConversationStore {
    // 状态
    conversations: Conversation[];
    activeConversationId: string | null;
    ui: UIState;

    // 操作
    createConversation: (title?: string) => Promise<string>;
    selectConversation: (id: string) => Promise<void>;
    deleteConversation: (id: string) => Promise<void>;
    updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;

    // 消息操作
    addMessage: (conversationId: string, message: Message) => Promise<void>;

    // GenUI组件操作
    addGenUIComponent: (conversationId: string, component: GenUIComponent) => Promise<void>;
    clearGenUIComponents: (conversationId: string) => Promise<void>;

    // UI操作
    toggleSidebar: () => void;
    setSidebarState: (state: UIState['sidebar']['state']) => void;

    // 数据加载
    loadConversations: () => Promise<void>;

    // 计算属性
    getActiveConversation: () => Conversation | null;
    getConversationListItems: () => ConversationListItem[];
  }

  export const useConversationStore = create<ConversationStore>()(
    persist(
      (set, get) => ({
        // 初始状态
        conversations: [],
        activeConversationId: null,
        ui: {
          sidebar: {
            state: 'expanded',
            width: 280,
          },
          isMobile: false,
        },

        // 创建对话
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
            metadata: {
              totalMessages: 0,
              totalImages: 0,
            },
          };

          // 更新内存
          set((state) => ({
            conversations: [newConversation, ...state.conversations],
            activeConversationId: id,
          }));

          // 持久化到IndexedDB
          await ConversationDB.addConversation(newConversation);

          return id;
        },

        // 选择对话
        selectConversation: async (id) => {
          set({ activeConversationId: id });

          // 从IndexedDB加载完整数据
          const conversation = await ConversationDB.getConversation(id);
          if (conversation) {
            set((state) => ({
              conversations: state.conversations.map((c) =>
                c.id === id ? conversation : c
              ),
            }));
          }
        },

        // 删除对话
        deleteConversation: async (id) => {
          // 从内存删除
          set((state) => {
            const newConversations = state.conversations.filter((c) => c.id !== id);
            const newActiveId = state.activeConversationId === id ? null : state.activeConversationId;
            return {
              conversations: newConversations,
              activeConversationId: newActiveId,
            };
          });

          // 从IndexedDB删除
          await ConversationDB.deleteConversation(id);
        },

        // 更新对话
        updateConversation: async (id, updates) => {
          // 更新内存
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
            ),
          }));

          // 持久化到IndexedDB
          await ConversationDB.updateConversation(id, updates);
        },

        // 添加消息
        addMessage: async (conversationId, message) => {
          set((state) => ({
            conversations: state.conversations.map((c) => {
              if (c.id === conversationId) {
                return {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: Date.now(),
                  metadata: {
                    ...c.metadata,
                    totalMessages: (c.metadata?.totalMessages || 0) + 1,
                  },
                };
              }
              return c;
            }),
          }));

          // 持久化到IndexedDB
          const conversation = get().conversations.find((c) => c.id === conversationId);
          if (conversation) {
            await ConversationDB.updateConversation(conversationId, conversation);
          }
        },

        // 添加GenUI组件
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

          // 持久化到IndexedDB
          const conversation = get().conversations.find((c) => c.id === conversationId);
          if (conversation) {
            await ConversationDB.updateConversation(conversationId, conversation);
          }
        },

        // 清空GenUI组件
        clearGenUIComponents: async (conversationId) => {
          set((state) => ({
            conversations: state.conversations.map((c) => {
              if (c.id === conversationId) {
                return {
                  ...c,
                  genUIComponents: [],
                  updatedAt: Date.now(),
                };
              }
              return c;
            }),
          }));

          // 持久化到IndexedDB
          const conversation = get().conversations.find((c) => c.id === conversationId);
          if (conversation) {
            await ConversationDB.updateConversation(conversationId, conversation);
          }
        },

        // 切换侧边栏
        toggleSidebar: () => {
          set((state) => {
            const currentState = state.ui.sidebar.state;
            let newState: UIState['sidebar']['state'];

            if (currentState === 'expanded') {
              newState = 'collapsed';
            } else if (currentState === 'collapsed') {
              newState = 'hidden';
            } else {
              newState = 'expanded';
            }

            return {
              ui: {
                ...state.ui,
                sidebar: {
                  ...state.ui.sidebar,
                  state: newState,
                },
              },
            };
          });
        },

        // 设置侧边栏状态
        setSidebarState: (state) => {
          set((state) => ({
            ui: {
              ...state.ui,
              sidebar: {
                ...state.ui.sidebar,
                state,
              },
            },
          }));
        },

        // 加载对话列表
        loadConversations: async () => {
          const conversations = await ConversationDB.getAllConversations();
          set({ conversations });
        },

        // 获取当前活跃对话
        getActiveConversation: () => {
          const { conversations, activeConversationId } = get();
          return conversations.find((c) => c.id === activeConversationId) || null;
        },

        // 获取对话列表项
        getConversationListItems: () => {
          const { conversations, activeConversationId } = get();
          return conversations
            .map((conv) => ({
              id: conv.id,
              title: conv.title,
              status: conv.status,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
              isActive: conv.id === activeConversationId,
              thumbnail: conv.genUIComponents.find((c) => c.widgetType === 'ImageView')?.props?.imageUrl,
              messageCount: conv.messages.length,
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt);
        },
      }),
      {
        name: 'aivista-conversation-storage',
        storage: createJSONStorage(() => localStorage),
        // 只持久化UI状态和activeConversationId
        partialize: (state) => ({
          activeConversationId: state.activeConversationId,
          ui: state.ui,
        }),
      }
    )
  );
  ```

- [ ] **Task 1.5**: 编写测试
  ```typescript
  // __tests__/stores/conversation-store.test.ts
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
      const id = await useConversationStore.getState().createConversation('测试对话');
      expect(id).toMatch(/^conv_\d+_[a-z0-9]+$/);

      const conversations = useConversationStore.getState().conversations;
      expect(conversations).toHaveLength(1);
      expect(conversations[0].title).toBe('测试对话');
    });

    it('should add message to conversation', async () => {
      const id = await useConversationStore.getState().createConversation();
      await useConversationStore.getState().addMessage(id, {
        id: 'msg_1',
        role: 'user',
        content: '测试消息',
        timestamp: Date.now(),
      });

      const conversation = useConversationStore.getState().conversations[0];
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].content).toBe('测试消息');
    });
  });
  ```

**验收标准**:
- ✅ Zustand Store创建成功
- ✅ IndexedDB数据库正常工作
- ✅ 数据持久化成功
- ✅ 单元测试通过

---

### Phase 2: 侧边栏UI (2天)

**目标**: 实现侧边栏组件

#### 任务清单

- [ ] **Task 2.1**: 创建侧边栏组件
  ```typescript
  // components/sidebar/Sidebar.tsx
  'use client';

  import { useEffect, useState, useCallback } from 'react';
   import { useConversationStore } from '@/stores/conversation-store';
  import { ConversationListItem } from '@/lib/types/conversation';
  import { MessageSquare, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { cn } from '@/lib/utils';

  export function Sidebar() {
    const {
      getConversationListItems,
      activeConversationId,
      ui,
      createConversation,
      selectConversation,
      deleteConversation,
      loadConversations,
      toggleSidebar,
      setSidebarState,
    } = useConversationStore();

    const [filter, setFilter] = useState('');

    // 加载对话列表
    useEffect(() => {
      loadConversations();
    }, [loadConversations]);

    // 获取对话列表项
    const conversationListItems = getConversationListItems()
      .filter((item) => {
        if (!filter) return true;
        return item.title.toLowerCase().includes(filter.toLowerCase());
      })
      .slice(0, 50); // 最多显示50个

    const handleCreateConversation = useCallback(async () => {
      await createConversation('新对话');
    }, [createConversation]);

    const handleSelectConversation = useCallback(
      async (id: string) => {
        if (id === activeConversationId) return;
        await selectConversation(id);

        // 移动端：选择对话后自动收起侧边栏
        if (ui.isMobile) {
          setSidebarState('hidden');
        }
      },
      [activeConversationId, ui.isMobile, selectConversation, setSidebarState]
    );

    const handleDeleteConversation = useCallback(
      async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (confirm('确定要删除这个对话吗？')) {
          await deleteConversation(id);
        }
      },
      [deleteConversation]
    );

    const handleToggleSidebar = useCallback(() => {
      toggleSidebar();
    }, [toggleSidebar]);

    const isExpanded = ui.sidebar.state === 'expanded';
    const isCollapsed = ui.sidebar.state === 'collapsed';
    const isHidden = ui.sidebar.state === 'hidden';

    return (
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-background border-r transition-all duration-300 z-40',
          isHidden && '-translate-x-full',
          isCollapsed && 'w-16',
          isExpanded && 'w-[280px]'
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          {isExpanded && <h2 className="text-lg font-semibold">对话历史</h2>}
          <Button variant="ghost" size="icon" onClick={handleToggleSidebar} className="ml-auto">
            {isExpanded && <X className="h-4 w-4" />}
            {isCollapsed && <ChevronRight className="h-4 w-4" />}
            {isHidden && <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* 搜索框（仅展开时显示） */}
        {isExpanded && (
          <div className="p-3">
            <input
              type="text"
              placeholder="搜索对话..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 创建新对话按钮 */}
        <div className="p-3">
          <Button
            onClick={handleCreateConversation}
            className={cn(
              'w-full',
              isExpanded && 'justify-start gap-2',
              isCollapsed && 'justify-center p-2'
            )}
          >
            <Plus className={cn(isExpanded ? 'h-4 w-4' : 'h-5 w-5')} />
            {isExpanded && <span>新建对话</span>}
          </Button>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto">
          {conversationListItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {filter ? '未找到匹配的对话' : '暂无对话'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversationListItems.map((item) => (
                <ConversationItem
                  key={item.id}
                  item={item}
                  isExpanded={isExpanded}
                  onSelect={() => handleSelectConversation(item.id)}
                  onDelete={(e) => handleDeleteConversation(item.id, e)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    );
  }

  interface ConversationItemProps {
    item: ConversationListItem;
    isExpanded: boolean;
    onSelect: () => void;
    onDelete: (e: React.MouseEvent) => void;
  }

  function ConversationItem({ item, isExpanded, onSelect, onDelete }: ConversationItemProps) {
    return (
      <div
        onClick={onSelect}
        className={cn(
          'group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
          item.isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
          isExpanded ? 'px-4' : 'px-3'
        )}
      >
        {/* 缩略图（如果有） */}
        {item.thumbnail ? (
          <div
            className={cn(
              'flex-shrink-0 rounded-lg overflow-hidden bg-muted',
              isExpanded ? 'w-16 h-16' : 'w-8 h-8'
            )}
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className={cn(
              'flex-shrink-0 rounded-lg bg-muted flex items-center justify-center',
              isExpanded ? 'w-16 h-16' : 'w-8 h-8'
            )}
          >
            <MessageSquare
              className={cn(
                isExpanded ? 'h-8 w-8' : 'h-5 w-5',
                item.isActive ? 'text-current' : 'text-muted-foreground'
              )}
            />
          </div>
        )}

        {/* 标题（仅展开时显示） */}
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {new Date(item.updatedAt).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}

        {/* 删除按钮（悬停时显示） */}
        {isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    );
  }
  ```

- [ ] **Task 2.2**: 创建移动端抽屉组件
  ```typescript
  // components/sidebar/MobileDrawer.tsx
  'use client';

  import { useState } from 'react';
  import { MessageSquare, Plus, X } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { useConversationStore } from '@/stores/conversation-store';

  export function MobileDrawer() {
    const { ui, setSidebarState, createConversation, getConversationListItems } = useConversationStore();
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
      setIsOpen(!isOpen);
    };

    const handleCreateConversation = async () => {
      await createConversation('新对话');
      setIsOpen(false);
    };

    const conversationListItems = getConversationListItems().slice(0, 20);

    return (
      <>
        {/* 触发按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-primary"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        {/* 抽屉 */}
        {isOpen && (
          <>
            {/* 遮罩 */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={handleToggle} />

            {/* 抽屉内容 */}
            <div className="fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-3xl transition-transform duration-300 max-h-[80vh] overflow-hidden flex flex-col">
              {/* 头部 */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">对话历史</h2>
                <Button variant="ghost" size="icon" onClick={handleToggle}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* 创建新对话 */}
              <div className="p-4">
                <Button onClick={handleCreateConversation} className="w-full justify-start gap-2">
                  <Plus className="h-5 w-5" />
                  <span>新建对话</span>
                </Button>
              </div>

              {/* 对话列表 */}
              <div className="flex-1 overflow-y-auto p-4">
                {conversationListItems.length === 0 ? (
                  <div className="text-center text-muted-foreground">暂无对话</div>
                ) : (
                  <div className="space-y-2">
                    {conversationListItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => {
                          // TODO: 选择对话
                          setIsOpen(false);
                        }}
                      >
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.updatedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </>
    );
  }
  ```

- [ ] **Task 2.3**: 创建响应式布局
  ```typescript
  // components/layout/MainLayout.tsx
  'use client';

  import { useEffect, useState } from 'react';
  import { useConversationStore } from '@/stores/conversation-store';
  import { Sidebar } from '@/components/sidebar/Sidebar';
  import { MobileDrawer } from '@/components/sidebar/MobileDrawer';
  import { ChatInterface } from '@/components/chat/chat-interface';
  import { cn } from '@/lib/utils';

  export function MainLayout() {
    const { ui, setIsMobile } = useConversationStore();
    const [isClient, setIsClient] = useState(false);

    // 检测移动端
    useEffect(() => {
      setIsClient(true);
      const checkMobile = () => {
        const isMobileView = window.innerWidth < 768;
        setIsMobile(isMobileView);

        // 移动端默认隐藏侧边栏
        if (isMobileView && ui.sidebar.state === 'expanded') {
          useConversationStore.setState({
            ui: {
              ...ui,
              sidebar: {
                ...ui.sidebar,
                state: 'hidden',
              },
            },
          });
        }
      };

      checkMobile();
      window.addEventListener('resize', checkMobile);

      return () => {
        window.removeEventListener('resize', checkMobile);
      };
    }, []);

    if (!isClient) {
      return null; // 避免服务端渲染不匹配
    }

    const isMobile = ui.isMobile;
    const isHidden = ui.sidebar.state === 'hidden';
    const isCollapsed = ui.sidebar.state === 'collapsed';
    const isExpanded = ui.sidebar.state === 'expanded';

    return (
      <div className="flex h-screen">
        {/* PC端：侧边栏 */}
        {!isMobile && <Sidebar />}

        {/* 移动端：抽屉 */}
        {isMobile && <MobileDrawer />}

        {/* 主内容区 */}
        <main
          className={cn(
            'flex-1 overflow-hidden transition-all duration-300',
            !isMobile && !isHidden && 'ml-[280px]',
            !isMobile && isCollapsed && 'ml-16'
          )}
        >
          <ChatInterface />
        </main>
      </div>
    );
  }
  ```

**验收标准**:
- ✅ 侧边栏组件正常显示
- ✅ 展开/收缩功能正常
- ✅ 移动端抽屉正常
- ✅ 响应式布局正常
- ✅ 样式符合设计

---

### Phase 3: 集成聊天功能 (1-2天)

**目标**: 将聊天功能迁移到新架构

#### 任务清单

- [ ] **Task 3.1**: 修改 ChatInterface 使用 Store
  ```typescript
  // components/chat/chat-interface.tsx (关键修改)

  import { useConversationStore } from '@/stores/conversation-store';
  import { useEffect, useCallback } from 'react';

  export function ChatInterface({ title, placeholder, onChatEnd }: ChatInterfaceProps) {
    const {
      getActiveConversation,
      activeConversationId,
      createConversation,
      addMessage,
      addGenUIComponent,
      clearGenUIComponents,
    } = useConversationStore();

    // 获取当前活跃对话
    const activeConversation = getActiveConversation();

    // 使用对话中的数据替代本地状态
    const messages = activeConversation?.messages || [];
    const genUIComponents = activeConversation?.genUIComponents || [];

    // 初始化：如果没有活跃对话，创建一个
    useEffect(() => {
      if (!activeConversationId) {
        createConversation('新对话');
      }
    }, [activeConversationId, createConversation]);

    // 修改 useAgentChat 的回调
    const { sendMessage } = useAgentChat({
      onChatStart: async () => {
        // 确保有活跃对话
        let currentId = activeConversationId;
        if (!currentId) {
          currentId = await createConversation('新对话');
        }

        // 清空当前对话的 GenUI 组件（保留历史消息）
        if (currentId) {
          await clearGenUIComponents(currentId);
        }
      },

      onThoughtLog: async (data) => {
        if (!activeConversationId) return;

        // 添加思考日志为 GenUI 组件
        await addGenUIComponent(activeConversationId, {
          id: `thought_${Date.now()}`,
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

      onEnhancedPrompt: async (data) => {
        if (!activeConversationId) return;

        await addGenUIComponent(activeConversationId, {
          id: `enhanced_${Date.now()}`,
          widgetType: 'EnhancedPromptView',
          props: {
            original: data.original,
            retrieved: data.retrieved,
            final: data.final,
          },
        });
      },

      onGenUIComponent: async (data) => {
        if (!activeConversationId) return;

        await addGenUIComponent(activeConversationId, {
          id: data.id || `${data.widgetType.toLowerCase()}_${Date.now()}`,
          widgetType: data.widgetType,
          props: data.props,
          updateMode: data.updateMode,
          targetId: data.targetId,
        });
      },

      onChatEnd: () => {
        onChatEnd?.();
      },
    });

    const handleSend = async () => {
      const text = input.trim();
      if (!text) return;

      // 确保有活跃对话
      let currentId = activeConversationId;
      if (!currentId) {
        currentId = await createConversation('新对话');
      }

      // 添加用户消息到对话
      if (currentId) {
        await addMessage(currentId, {
          id: `msg_${Date.now()}`,
          role: 'user',
          content: text,
          timestamp: Date.now(),
        });
      }

      // 如果是第一条消息，更新对话标题
      if (activeConversation && activeConversation.messages.length === 0) {
        const newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
        await useConversationStore.getState().updateConversation(currentId!, {
          title: newTitle,
        });
      }

      // 发送消息到后端（带conversationId）
      sendMessage(text, currentId);
      setInput('');
    };

    // ... 其他代码保持不变
  }
  ```

- [ ] **Task 3.2**: 修改 useAgentChat Hook
  ```typescript
  // hooks/use-agent-chat.ts (关键修改)

  export function useAgentChat({ onChatStart, onThoughtLog, onEnhancedPrompt, onGenUIComponent, onChatEnd }: Callbacks = {}) {
    const sendMessage = useCallback(async (text: string, conversationId?: string) => {
      onChatStart?.();

      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId, // ← 新增：传递conversationId
            text,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to connect to chat service');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              const eventType = line.slice(6).trim();
              const dataLine = lines[lines.indexOf(line) + 1];
              if (dataLine?.startsWith('data:')) {
                const data = JSON.parse(dataLine.slice(5));

                switch (eventType) {
                  case 'connection':
                    console.log('Connected:', data);
                    break;
                  case 'thought_log':
                    onThoughtLog?.(data);
                    break;
                  case 'enhanced_prompt':
                    onEnhancedPrompt?.(data);
                    break;
                  case 'gen_ui_component':
                    onGenUIComponent?.(data);
                    break;
                  case 'stream_end':
                    onChatEnd?.();
                    break;
                  case 'error':
                    console.error('Stream error:', data);
                    break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Chat error:', error);
      }
    }, [onChatStart, onThoughtLog, onEnhancedPrompt, onGenUIComponent, onChatEnd]);

    return { sendMessage };
  }
  ```

- [ ] **Task 3.3**: 更新路由使用新布局
  ```typescript
  // app/page.tsx
  import { MainLayout } from '@/components/layout/MainLayout';

  export default function Home() {
    return <MainLayout />;
  }
  ```

**验收标准**:
- ✅ 聊天功能正常
- ✅ 对话自动创建
- ✅ 数据持久化正常
- ✅ 页面刷新数据不丢失

---

### Phase 4: 功能按钮增强 (1天)

**目标**: 实现重新生成、预览、下载等功能

#### 任务清单

- [ ] **Task 4.1**: 添加功能按钮组件
  ```typescript
  // components/chat/ActionButtons.tsx
  'use client';

  import { RefreshCw, Eye, Download, Copy, Trash2 } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { cn } from '@/lib/utils';

  interface ActionButtonsProps {
    onRegenerate?: () => void;
    onPreview?: () => void;
    onDownload?: () => void;
    onCopy?: () => void;
    onDelete?: () => void;
    className?: string;
  }

  export function ActionButtons({
    onRegenerate,
    onPreview,
    onDownload,
    onCopy,
    onDelete,
    className,
  }: ActionButtonsProps) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>重新生成</span>
          </Button>
        )}

        {onPreview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreview}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            <span>预览</span>
          </Button>
        )}

        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span>下载</span>
          </Button>
        )}

        {onCopy && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            <span>复制</span>
          </Button>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>删除</span>
          </Button>
        )}
      </div>
    );
  }
  ```

- [ ] **Task 4.2**: 实现功能逻辑
  ```typescript
  // components/chat/GenUIComponentWrapper.tsx (增强版)

  import { ActionButtons } from './ActionButtons';
  import { useConversationStore } from '@/stores/conversation-store';
  import { toast } from 'sonner';

  export function GenUIComponentWrapper({ component, conversationId }: Props) {
    const { addGenUIComponent } = useConversationStore();

    const handleRegenerate = async () => {
      // TODO: 调用后端重新生成API
      toast.info('重新生成功能开发中...');
    };

    const handlePreview = () => {
      if (component.widgetType === 'ImageView') {
        const imageUrl = component.props.imageUrl;
        window.open(imageUrl, '_blank');
      } else {
        toast.info('预览功能开发中...');
      }
    };

    const handleDownload = async () => {
      if (component.widgetType === 'ImageView') {
        const imageUrl = component.props.imageUrl;
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `image_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          toast.success('下载成功');
        } catch (error) {
          toast.error('下载失败');
        }
      } else {
        toast.info('下载功能开发中...');
      }
    };

    const handleCopy = () => {
      if (component.widgetType === 'ThoughtLogItem' || component.widgetType === 'EnhancedPromptView') {
        const text = JSON.stringify(component.props, null, 2);
        navigator.clipboard.writeText(text);
        toast.success('复制成功');
      } else {
        toast.info('复制功能开发中...');
      }
    };

    const handleDelete = async () => {
      if (confirm('确定要删除这个组件吗？')) {
        // TODO: 实现删除逻辑
        toast.info('删除功能开发中...');
      }
    };

    return (
      <div className="relative group">
        {/* GenUI组件内容 */}
        <GenUIComponentRenderer component={component} />

        {/* 功能按钮（悬停时显示） */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButtons
            onRegenerate={handleRegenerate}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onCopy={handleCopy}
            onDelete={handleDelete}
            className="bg-background/90 backdrop-blur-sm rounded-lg shadow-lg p-1"
          />
        </div>
      </div>
    );
  }
  ```

- [ ] **Task 4.3**: 实现后端重新生成API（需要后端配合）
  ```typescript
  // 后端需要实现的接口（frontend端只调用）

  // 前端调用示例
  const handleRegenerate = async () => {
    try {
      const response = await fetch('/api/agent/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          messageId: component.metadata?.messageId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate');
      }

      // 处理SSE流（与聊天接口类似）
      // ...
    } catch (error) {
      toast.error('重新生成失败');
    }
  };
  ```

**验收标准**:
- ✅ 功能按钮正常显示
- ✅ 预览功能正常
- ✅ 下载功能正常
- ✅ 复制功能正常
- ✅ 重新生成功能（需要后端配合）

---

### Phase 5: 优化和完善 (1天)

**目标**: 优化多轮对话展示和用户体验

#### 任务清单

- [ ] **Task 5.1**: 优化多轮对话展示
  ```typescript
  // components/chat/ConversationView.tsx

  export function ConversationView() {
    const { getActiveConversation } = useConversationStore();
    const conversation = getActiveConversation();

    // 按消息分组展示
    const messageGroups = useMemo(() => {
      if (!conversation) return [];

      const groups: Array<{
        userMessage: Message;
        assistantComponents: GenUIComponent[];
      }> = [];

      conversation.messages.forEach((message) => {
        if (message.role === 'user') {
          // 找到该用户消息对应的所有GenUI组件
          const assistantComponents = conversation.genUIComponents.filter(
            (c) => c.metadata?.messageId === message.id
          );

          groups.push({
            userMessage: message,
            assistantComponents,
          });
        }
      });

      return groups;
    }, [conversation]);

    return (
      <div className="space-y-6">
        {messageGroups.map((group, index) => (
          <div key={index} className="border-b pb-6">
            {/* 用户消息 */}
            <div className="flex justify-end mb-4">
              <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                {group.userMessage.content}
              </div>
            </div>

            {/* AI响应（GenUI组件） */}
            {group.assistantComponents.length > 0 && (
              <div className="space-y-4">
                {group.assistantComponents.map((component) => (
                  <GenUIComponentWrapper
                    key={component.id}
                    component={component}
                    conversationId={conversation!.id}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  ```

- [ ] **Task 5.2**: 添加加载状态
  ```typescript
  // components/chat/ChatLoading.tsx
  import { Loader2 } from 'lucide-react';

  export function ChatLoading() {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>AI正在思考中...</span>
        </div>
      </div>
    );
  }
  ```

- [ ] **Task 5.3**: 添加错误处理
  ```typescript
  // components/chat/ChatError.tsx
  import { AlertCircle } from 'lucide-react';

  export function ChatError({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
      <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">出错了</p>
          <p className="text-sm">{message}</p>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="text-sm underline">
            重试
          </button>
        )}
      </div>
    );
  }
  ```

- [ ] **Task 5.4**: 性能优化
  ```typescript
  // 添加虚拟滚动（如果对话列表很长）
  import { FixedSizeList as List } from 'react-window';

  export function VirtualConversationList({ items }: { items: ConversationListItem[] }) {
    return (
      <List
        height={600}
        itemCount={items.length}
        itemSize={80}
        width="100%"
      >
        {({ index, style }) => (
          <div style={style}>
            <ConversationItem item={items[index]} />
          </div>
        )}
      </List>
    );
  }
  ```

**验收标准**:
- ✅ 多轮对话展示正常
- ✅ 加载状态正常
- ✅ 错误处理正常
- ✅ 性能优化完成

---

## 4. 数据结构设计

### 4.1 Conversation（完整定义）

```typescript
interface Conversation {
  // 基础信息
  id: string; // conversationId, 格式: conv_{timestamp}_{random}
  title: string; // 对话标题
  status: 'active' | 'completed' | 'failed'; // 对话状态
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳

  // 数据
  messages: Message[]; // 消息列表
  genUIComponents: GenUIComponent[]; // GenUI组件列表

  // 元数据
  metadata?: {
    model?: string; // 使用的模型
    totalMessages?: number; // 总消息数
    totalImages?: number; // 总图片数
    [key: string]: any;
  };
}
```

### 4.2 Message（完整定义）

```typescript
interface Message {
  id: string; // 消息ID
  role: 'user' | 'assistant' | 'system'; // 消息角色
  content: string; // 消息内容
  timestamp: number; // 时间戳

  // 元数据
  metadata?: {
    sessionId?: string; // 后端会话ID
    maskData?: any; // 遮罩数据
    preferredModel?: string; // 首选模型
    imageUrl?: string; // 图片URL（assistant消息）
    componentIds?: string[]; // 关联的GenUI组件ID列表
    [key: string]: any;
  };
}
```

### 4.3 GenUIComponent（完整定义）

```typescript
interface GenUIComponent {
  id: string; // 组件ID
  widgetType: string; // 组件类型
  props: Record<string, any>; // 组件属性
  updateMode?: 'append' | 'replace' | 'update'; // 更新模式
  targetId?: string; // 目标组件ID
  timestamp?: number; // 时间戳
}
```

---

## 5. 组件设计

### 5.1 组件层次结构

```
MainLayout
├── Sidebar (PC端)
│   ├── SidebarHeader
│   ├── SearchInput
│   ├── NewChatButton
│   └── ConversationList
│       └── ConversationItem
├── MobileDrawer (移动端)
│   └── (类似Sidebar)
└── ChatInterface
    ├── ConversationView
    │   └── MessageGroup
    │       ├── UserMessage
    │       └── AssistantResponse
    │           └── GenUIComponentWrapper
    │               ├── GenUIComponentRenderer
    │               └── ActionButtons
    ├── ChatInput
    └── ChatLoading / ChatError
```

### 5.2 状态管理

```typescript
// 使用示例
const {
  // 状态
  conversations,
  activeConversationId,
  ui,

  // 操作
  createConversation,
  selectConversation,
  deleteConversation,
  addMessage,
  addGenUIComponent,

  // 计算属性
  getActiveConversation,
  getConversationListItems,
} = useConversationStore();
```

---

## 6. 代码示例

### 6.1 完整的 ChatInterface 集成

```typescript
// components/chat/chat-interface.tsx (完整版)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConversationStore } from '@/stores/conversation-store';
import { useAgentChat } from '@/hooks/use-agent-chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConversationView } from './ConversationView';
import { ChatLoading } from './ChatLoading';
import { ChatError } from './ChatError';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    getActiveConversation,
    activeConversationId,
    createConversation,
    addMessage,
    addGenUIComponent,
    clearGenUIComponents,
  } = useConversationStore();

  const activeConversation = getActiveConversation();

  // 初始化
  useEffect(() => {
    if (!activeConversationId) {
      createConversation('新对话');
    }
  }, [activeConversationId, createConversation]);

  // Agent Chat回调
  const { sendMessage } = useAgentChat({
    onChatStart: async () => {
      setIsProcessing(true);
      setError(null);

      let currentId = activeConversationId;
      if (!currentId) {
        currentId = await createConversation('新对话');
      }

      if (currentId) {
        await clearGenUIComponents(currentId);
      }
    },

    onThoughtLog: async (data) => {
      if (!activeConversationId) return;
      await addGenUIComponent(activeConversationId, {
        id: `thought_${Date.now()}`,
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

    onEnhancedPrompt: async (data) => {
      if (!activeConversationId) return;
      await addGenUIComponent(activeConversationId, {
        id: `enhanced_${Date.now()}`,
        widgetType: 'EnhancedPromptView',
        props: {
          original: data.original,
          retrieved: data.retrieved,
          final: data.final,
        },
      });
    },

    onGenUIComponent: async (data) => {
      if (!activeConversationId) return;
      await addGenUIComponent(activeConversationId, {
        id: data.id || `${data.widgetType.toLowerCase()}_${Date.now()}`,
        widgetType: data.widgetType,
        props: data.props,
        updateMode: data.updateMode,
        targetId: data.targetId,
      });
    },

    onChatEnd: () => {
      setIsProcessing(false);
    },
  });

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    let currentId = activeConversationId;
    if (!currentId) {
      currentId = await createConversation('新对话');
    }

    // 添加用户消息
    if (currentId) {
      await addMessage(currentId, {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });
    }

    // 更新标题（如果是第一条消息）
    if (activeConversation && activeConversation.messages.length === 0) {
      const newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
      await useConversationStore.getState().updateConversation(currentId!, {
        title: newTitle,
      });
    }

    // 发送到后端
    sendMessage(text, currentId);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeConversation ? (
          <ConversationView />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            创建新对话开始聊天...
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {isProcessing && <ChatLoading />}

      {/* 错误提示 */}
      {error && <ChatError message={error} />}

      {/* 输入区域 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            disabled={isProcessing}
            className="flex-1 min-h-[60px] resize-none"
          />
          <Button onClick={handleSend} disabled={isProcessing || !input.trim()}>
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. 验收标准

### Phase 1 验收
- [ ] Zustand Store创建成功
- [ ] IndexedDB数据库正常
- [ ] 数据持久化成功
- [ ] 单元测试通过

### Phase 2 验收
- [ ] 侧边栏组件正常
- [ ] 移动端抽屉正常
- [ ] 响应式布局正常
- [ ] 样式符合设计

### Phase 3 验收
- [ ] 聊天功能正常
- [ ] 对话自动创建
- [ ] 数据持久化正常
- [ ] 页面刷新数据不丢失

### Phase 4 验收
- [ ] 功能按钮正常
- [ ] 预览功能正常
- [ ] 下载功能正常
- [ ] 复制功能正常

### Phase 5 验收
- [ ] 多轮对话展示正常
- [ ] 加载状态正常
- [ ] 错误处理正常
- [ ] 性能优化完成

---

## 8. 后续优化

### 性能优化 (可选)
- [ ] 实现虚拟滚动
- [ ] 添加图片懒加载
- [ ] 优化大列表性能

### 功能增强 (可选)
- [ ] 添加对话搜索
- [ ] 实现对话导出
- [ ] 添加对话标签

### 用户体验
- [ ] 添加动画效果
- [ ] 优化移动端体验
- [ ] 添加快捷键支持

---

**文档版本**: v1.0
**最后更新**: 2025-01-21
**维护者**: AiVista 开发团队
