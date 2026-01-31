/**
 * 会话状态管理 Store
 * 使用 Zustand + persist 中间件管理会话状态
 *
 * 功能：
 * - 会话 CRUD 操作
 * - 侧边栏状态管理
 * - 当前会话管理
 * - 持久化到 localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db/database';
import { MessageService } from '@/lib/services/message-service';

/**
 * 会话接口
 */
export interface Session {
  id: string; // sessionId
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
  isActive?: boolean; // UI 状态，不持久化到数据库
}

/**
 * 会话状态接口
 */
interface SessionState {
  // 状态
  sessions: Session[];
  currentSessionId: string | null;
  sidebarOpen: boolean;
  isLoading: boolean;

  // Actions - 会话管理
  createSession: (title?: string) => Promise<string>;
  selectSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  deleteMultipleSessions: (sessionIds: string[]) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;

  // Actions - 侧边栏
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Actions - 数据加载
  loadSessions: () => Promise<void>;
  refreshCurrentSession: () => Promise<void>;

  // Actions - 批量操作
  clearAllSessions: () => Promise<void>;
}

/**
 * 创建会话 Store
 * 使用 persist 中间件持久化到 localStorage
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // ========== 初始状态 ==========
      sessions: [],
      currentSessionId: null,
      sidebarOpen: true,
      isLoading: false,

      // ========== 会话管理 ==========

      /**
       * 创建新会话
       * @param title 会话标题（可选，默认为"新对话"）
       * @returns 会话 ID
       */
      createSession: async (title?: string) => {
        const sessionId = `session_${Date.now()}`;
        const now = Date.now();

        const session: Session = {
          id: sessionId,
          title: title || '新对话',
          createdAt: now,
          updatedAt: now,
          messageCount: 0,
          isActive: true,
        };

        try {
          // 保存到数据库
          await db.sessions.add({
            id: session.id,
            title: session.title,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messageCount,
            lastMessage: session.lastMessage,
          });

          // 更新状态
          set((state) => ({
            sessions: [
              { ...session, isActive: true },
              ...state.sessions.map((s) => ({ ...s, isActive: false })),
            ],
            currentSessionId: sessionId,
          }));

          console.log('[SessionStore] Created session:', sessionId);
          return sessionId;
        } catch (error) {
          console.error('[SessionStore] Failed to create session:', error);
          throw error;
        }
      },

      /**
       * 选择会话
       * @param sessionId 会话 ID
       */
      selectSession: async (sessionId: string) => {
        try {
          // 更新状态
          set((state) => ({
            sessions: state.sessions.map((s) => ({
              ...s,
              isActive: s.id === sessionId,
            })),
            currentSessionId: sessionId,
          }));

          console.log('[SessionStore] Selected session:', sessionId);
        } catch (error) {
          console.error('[SessionStore] Failed to select session:', error);
          throw error;
        }
      },

      /**
       * 删除会话
       * @param sessionId 会话 ID
       */
      deleteSession: async (sessionId: string) => {
        try {
          // 从数据库删除会话和消息
          await db.sessions.delete(sessionId);
          await MessageService.deleteSessionMessages(sessionId);

          // 更新状态
          set((state) => {
            const newSessions = state.sessions.filter((s) => s.id !== sessionId);
            const newCurrentId =
              state.currentSessionId === sessionId
                ? newSessions[0]?.id || null
                : state.currentSessionId;

            return {
              sessions: newSessions,
              currentSessionId: newCurrentId,
            };
          });

          console.log('[SessionStore] Deleted session:', sessionId);
        } catch (error) {
          console.error('[SessionStore] Failed to delete session:', error);
          throw error;
        }
      },

      /**
       * 批量删除会话
       * @param sessionIds 会话 ID 列表
       */
      deleteMultipleSessions: async (sessionIds: string[]) => {
        try {
          // 批量删除
          for (const sessionId of sessionIds) {
            await db.sessions.delete(sessionId);
            await MessageService.deleteSessionMessages(sessionId);
          }

          // 更新状态
          set((state) => {
            const newSessions = state.sessions.filter(
              (s) => !sessionIds.includes(s.id)
            );
            const newCurrentId = sessionIds.includes(state.currentSessionId || '')
              ? newSessions[0]?.id || null
              : state.currentSessionId;

            return {
              sessions: newSessions,
              currentSessionId: newCurrentId,
            };
          });

          console.log('[SessionStore] Deleted sessions:', sessionIds);
        } catch (error) {
          console.error('[SessionStore] Failed to delete sessions:', error);
          throw error;
        }
      },

      /**
       * 更新会话标题
       * @param sessionId 会话 ID
       * @param title 新标题
       */
      updateSessionTitle: async (sessionId: string, title: string) => {
        try {
          // 更新数据库（不更新 updatedAt，该时间只在与 AI 对话时更新）
          await db.sessions.update(sessionId, {
            title,
          });

          // 更新状态
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId ? { ...s, title } : s
            ),
          }));

          console.log('[SessionStore] Updated session title:', sessionId, title);
        } catch (error) {
          console.error('[SessionStore] Failed to update session title:', error);
          throw error;
        }
      },

      // ========== 侧边栏 ==========

      /**
       * 设置侧边栏开关状态
       * @param open 是否打开
       */
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      /**
       * 切换侧边栏状态
       */
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      // ========== 数据加载 ==========

      /**
       * 从数据库加载所有会话
       */
      loadSessions: async () => {
        set({ isLoading: true });

        try {
          const records = await db.sessions
            .orderBy('updatedAt')
            .reverse()
            .toArray();

          const sessions: Session[] = records.map((r) => ({
            ...r,
            isActive: r.id === get().currentSessionId,
          }));

          set({ sessions, isLoading: false });

          console.log('[SessionStore] Loaded sessions:', sessions.length);
        } catch (error) {
          console.error('[SessionStore] Failed to load sessions:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * 刷新当前会话（重新从数据库加载）
       */
      refreshCurrentSession: async () => {
        const { currentSessionId } = get();

        if (!currentSessionId) {
          return;
        }

        try {
          const sessionRecord = await db.sessions.get(currentSessionId);

          if (sessionRecord) {
            set((state) => ({
              sessions: state.sessions.map((s) =>
                s.id === currentSessionId
                  ? { ...s, ...sessionRecord, isActive: true }
                  : s
              ),
            }));

            console.log('[SessionStore] Refreshed current session:', currentSessionId);
          }
        } catch (error) {
          console.error('[SessionStore] Failed to refresh current session:', error);
          throw error;
        }
      },

      // ========== 批量操作 ==========

      /**
       * 清空所有会话（慎用）
       */
      clearAllSessions: async () => {
        try {
          // 清空数据库
          await db.sessions.clear();
          await db.messages.clear();

          // 重置状态
          set({
            sessions: [],
            currentSessionId: null,
          });

          console.log('[SessionStore] Cleared all sessions');
        } catch (error) {
          console.error('[SessionStore] Failed to clear all sessions:', error);
          throw error;
        }
      },
    }),
    {
      // ========== 持久化配置 ==========
      name: 'aivista-session-storage', // localStorage key

      // 只持久化部分状态
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        sidebarOpen: state.sidebarOpen,
      }),

      // 不持久化 sessions（从 IndexedDB 加载）
      // 不持久化 isLoading
    }
  )
);
