/**
 * 侧边栏组件
 * 显示会话列表和操作按钮
 */

'use client';

import { useEffect } from 'react';
import { Plus, Menu } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/button';
import { SessionList } from './session-list';
import { cn } from '@/lib/utils';

/**
 * 侧边栏组件
 * 提供会话管理功能
 */
export function Sidebar() {
  const {
    sessions,
    currentSessionId,
    sidebarOpen,
    isLoading,
    createSession,
    selectSession,
    deleteSession,
    updateSessionTitle,
    setSidebarOpen,
    loadSessions,
  } = useSessionStore();

  // 初始化：加载会话列表
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 创建新会话
  const handleCreateSession = async () => {
    try {
      const sessionId = await createSession();
      await selectSession(sessionId);
    } catch (error) {
      console.error('[Sidebar] Failed to create session:', error);
    }
  };

  // 选择会话
  const handleSelectSession = async (sessionId: string) => {
    try {
      await selectSession(sessionId);
    } catch (error) {
      console.error('[Sidebar] Failed to select session:', error);
    }
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
    } catch (error) {
      console.error('[Sidebar] Failed to delete session:', error);
    }
  };

  // 更新会话标题
  const handleUpdateTitle = async (sessionId: string, title: string) => {
    try {
      await updateSessionTitle(sessionId, title);
    } catch (error) {
      console.error('[Sidebar] Failed to update session title:', error);
    }
  };

  return (
    <div
      className={cn(
        'hidden md:flex border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-full flex-col transition-all duration-300',
        sidebarOpen ? 'w-72' : 'w-16'
      )}
    >
      {/* 头部：新建会话按钮 */}
      <div className={cn('border-b', sidebarOpen ? 'px-2 py-2' : 'px-2 py-2')}>
        <div className={cn('flex items-center', sidebarOpen ? 'justify-between' : 'flex-col gap-2')}>
          {/* 新建对话按钮 */}
          <div
            className={cn(
              'flex items-center hover:bg-accent cursor-pointer rounded-md',
              sidebarOpen ? 'px-2 py-2 flex-1 gap-2' : 'p-2 justify-center'
            )}
            onClick={handleCreateSession}
          >
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Plus className="h-4 w-4 text-white" />
            </div>
            {sidebarOpen && <div className="text-sm font-semibold">发起新对话</div>}
          </div>
          {/* 折叠/展开按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 会话列表 */}
      <SessionList
        sessions={sessions}
        currentSessionId={currentSessionId}
        isLoading={isLoading}
        collapsed={!sidebarOpen}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
        onUpdateTitle={handleUpdateTitle}
        alwaysShowActions={false}
      />

      {/* 底部：统计信息（仅展开时显示） */}
      {sidebarOpen && sessions.length > 0 && (
        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          共 {sessions.length} 个对话
        </div>
      )}
    </div>
  );
}
