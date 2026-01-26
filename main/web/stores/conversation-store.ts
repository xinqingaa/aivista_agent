/**
 * 会话状态管理 Store
 * 使用 Zustand 管理全局会话状态，并同步到 IndexedDB
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Conversation,
  Message,
  GenUIComponent,
  ConversationListItem,
  UIState,
  SidebarState,
} from '@/lib/types/conversation';
import { ConversationDB } from '@/lib/db/conversation-db';

interface ConversationStore {
  // 状态
  conversations: Conversation[];
  activeConversationId: string | null;
  ui: UIState;
  isLoading: boolean;

  // 会话操作
  createConversation: (title?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  bulkDeleteConversations: (ids: string[]) => Promise<void>;

  // 消息操作
  addMessage: (conversationId: string, message: Message) => Promise<void>;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => Promise<void>;

  // GenUI 组件操作
  addGenUIComponent: (conversationId: string, component: GenUIComponent) => Promise<void>;
  clearGenUIComponents: (conversationId: string) => Promise<void>;
  updateGenUIComponent: (
    conversationId: string,
    componentId: string,
    updates: Partial<GenUIComponent>
  ) => Promise<void>;

  // UI 操作
  toggleSidebar: () => void;
  setSidebarState: (state: SidebarState) => void;
  setIsMobile: (isMobile: boolean) => void;

  // 数据加载
  loadConversations: () => Promise<void>;
  loadConversationDetail: (id: string) => Promise<void>;

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
      isLoading: false,

      // ========== 会话操作 ==========

      /**
       * 创建新会话
       */
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

        // 更新内存状态
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: id,
        }));

        // 持久化到 IndexedDB
        await ConversationDB.addConversation(newConversation);

        return id;
      },

      /**
       * 选择会话
       */
      selectConversation: async (id) => {
        set({ activeConversationId: id });

        // 从 IndexedDB 加载完整数据（如果需要）
        const conversation = await ConversationDB.getConversation(id);
        if (conversation) {
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === id ? conversation : c
            ),
          }));
        }
      },

      /**
       * 删除会话
       */
      deleteConversation: async (id) => {
        // 从内存删除
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          const newActiveId =
            state.activeConversationId === id
              ? newConversations.length > 0
                ? newConversations[0].id
                : null
              : state.activeConversationId;

          return {
            conversations: newConversations,
            activeConversationId: newActiveId,
          };
        });

        // 从 IndexedDB 删除
        await ConversationDB.deleteConversation(id);
      },

      /**
       * 更新会话
       */
      updateConversation: async (id, updates) => {
        // 更新内存
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: Date.now() }
              : c
          ),
        }));

        // 持久化到 IndexedDB
        await ConversationDB.updateConversation(id, updates);
      },

      /**
       * 批量删除会话
       */
      bulkDeleteConversations: async (ids) => {
        // 从内存删除
        set((state) => {
          const newConversations = state.conversations.filter(
            (c) => !ids.includes(c.id)
          );
          const newActiveId = ids.includes(state.activeConversationId || '')
            ? newConversations.length > 0
              ? newConversations[0].id
              : null
            : state.activeConversationId;

          return {
            conversations: newConversations,
            activeConversationId: newActiveId,
          };
        });

        // 从 IndexedDB 删除
        await ConversationDB.bulkDeleteConversations(ids);
      },

      // ========== 消息操作 ==========

      /**
       * 添加消息
       */
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

        // 持久化到 IndexedDB
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation) {
          await ConversationDB.updateConversation(conversationId, conversation);
        }
      },

      /**
       * 更新消息
       */
      updateMessage: async (conversationId, messageId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, ...updates } : m
                ),
                updatedAt: Date.now(),
              };
            }
            return c;
          }),
        }));

        // 持久化到 IndexedDB
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation) {
          await ConversationDB.updateConversation(conversationId, conversation);
        }
      },

      // ========== GenUI 组件操作 ==========

      /**
       * 添加 GenUI 组件
       */
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

        // 持久化到 IndexedDB
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation) {
          await ConversationDB.updateConversation(conversationId, conversation);
        }
      },

      /**
       * 清空 GenUI 组件
       */
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

        // 持久化到 IndexedDB
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation) {
          await ConversationDB.updateConversation(conversationId, conversation);
        }
      },

      /**
       * 更新 GenUI 组件
       */
      updateGenUIComponent: async (conversationId, componentId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                genUIComponents: c.genUIComponents.map((comp) =>
                  comp.id === componentId ? { ...comp, ...updates } : comp
                ),
                updatedAt: Date.now(),
              };
            }
            return c;
          }),
        }));

        // 持久化到 IndexedDB
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation) {
          await ConversationDB.updateConversation(conversationId, conversation);
        }
      },

      // ========== UI 操作 ==========

      /**
       * 切换侧边栏状态
       */
      toggleSidebar: () => {
        const currentState = useConversationStore.getState().ui.sidebar.state;
        let newState: SidebarState;

        if (currentState === 'expanded') {
          newState = 'collapsed';
        } else if (currentState === 'collapsed') {
          newState = 'hidden';
        } else {
          newState = 'expanded';
        }

        set({
          ui: {
            ...useConversationStore.getState().ui,
            sidebar: {
              ...useConversationStore.getState().ui.sidebar,
              state: newState,
            },
          },
        } as Partial<ConversationStore>);
      },

      /**
       * 设置侧边栏状态
       */
      setSidebarState: (state: SidebarState) => {
        set({
          ui: {
            ...useConversationStore.getState().ui,
            sidebar: {
              ...useConversationStore.getState().ui.sidebar,
              state,
            },
          },
        } as Partial<ConversationStore>);
      },

      /**
       * 设置是否为移动端
       */
      setIsMobile: (isMobile: boolean) => {
        set({
          ui: {
            ...useConversationStore.getState().ui,
            isMobile,
          },
        } as Partial<ConversationStore>);
      },

      // ========== 数据加载 ==========

      /**
       * 加载会话列表
       */
      loadConversations: async () => {
        set({ isLoading: true });
        try {
          const conversations = await ConversationDB.getAllConversations();
          set({ conversations, isLoading: false });
        } catch (error) {
          console.error('[ConversationStore] Failed to load conversations:', error);
          set({ isLoading: false });
        }
      },

      /**
       * 加载会话详情
       */
      loadConversationDetail: async (id: string) => {
        const conversation = await ConversationDB.getConversation(id);
        if (conversation) {
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === id ? conversation : c
            ),
          }));
        }
      },

      // ========== 计算属性 ==========

      /**
       * 获取当前活跃会话
       */
      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) || null;
      },

      /**
       * 获取会话列表项
       */
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
            thumbnail: conv.genUIComponents.find(
              (c) => c.widgetType === 'ImageView'
            )?.props?.imageUrl,
            messageCount: conv.messages.length,
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt);
      },
    }),
    {
      name: 'aivista-conversation-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化 UI 状态和 activeConversationId（会话数据存在 IndexedDB）
      partialize: (state) => ({
        activeConversationId: state.activeConversationId,
        ui: state.ui,
      }),
    }
  )
);
