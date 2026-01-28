/**
 * 侧边栏组件
 * 显示会话列表和操作按钮
 */

'use client';

import { useEffect, useState } from 'react';
import { Plus, MessageSquare, Menu, X } from 'lucide-react';
import { useSessionStore } from '@/stores/session-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SessionItem } from './session-item';
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

  const [isHovered, setIsHovered] = useState(false);

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

  // 侧边栏关闭时的最小化按钮
  if (!sidebarOpen) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className={cn(
          'fixed left-0 top-4 z-50 p-2 bg-background border border-border rounded-r-lg shadow-md transition-all hover:pl-3',
          'group'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Menu
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform',
            isHovered && 'scale-110'
          )}
        />
      </button>
    );
  }

  return (
    <div className="w-72 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-full flex flex-col">
      {/* 头部：新建会话按钮 */}
      <div className="px-4 py-2 border-b">
        <div className="flex items-center justify-between ">
          <div className="flex px-2 py-2 items-center gap-2 hover:bg-accent rounded-md" onClick={handleCreateSession}>
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500  rounded-lg flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div className="text-sm font-semibold">发起新对话</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">加载中...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">暂无对话</p>
              <p className="text-xs text-muted-foreground">点击上方按钮创建新对话</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={handleSelectSession}
                  onDelete={handleDeleteSession}
                  onUpdateTitle={handleUpdateTitle}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 底部：统计信息 */}
      {sessions.length > 0 && (
        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          共 {sessions.length} 个对话
        </div>
      )}
    </div>
  );
}
