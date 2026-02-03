/**
 * 会话列表组件
 * 供 Sidebar（桌面端）与移动端 Sheet 复用
 */

'use client';

import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SessionItem } from './session-item';
import { cn } from '@/lib/utils';
import type { Session } from '@/stores/session-store';

export interface SessionListProps {
  sessions: Session[];
  currentSessionId: string | null;
  isLoading: boolean;
  /** 桌面侧边栏折叠时为 true，移动端 Sheet 内为 false */
  collapsed: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onUpdateTitle: (sessionId: string, title: string) => void;
  /** 为 true 时编辑/删除按钮常驻显示（移动端 Sheet） */
  alwaysShowActions?: boolean;
  className?: string;
  /** 内边距，与 Sidebar 展开/折叠一致，如 'p-2' | 'p-1' */
  contentClassName?: string;
}

export function SessionList({
  sessions,
  currentSessionId,
  isLoading,
  collapsed,
  onSelect,
  onDelete,
  onUpdateTitle,
  alwaysShowActions = false,
  className,
  contentClassName,
}: SessionListProps) {
  return (
    <ScrollArea className={cn('flex-1', className)}>
      <div className={cn(collapsed ? 'p-1' : 'p-2', contentClassName)}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            {!collapsed && <div className="text-sm text-muted-foreground">加载中...</div>}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare
              className={cn('text-muted-foreground/50 mb-3', collapsed ? 'h-6 w-6' : 'h-12 w-12')}
            />
            {!collapsed && (
              <>
                <p className="text-sm text-muted-foreground mb-1">暂无对话</p>
                <p className="text-xs text-muted-foreground">点击上方按钮创建新对话</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onSelect={onSelect}
                onDelete={onDelete}
                onUpdateTitle={onUpdateTitle}
                collapsed={collapsed}
                alwaysShowActions={alwaysShowActions}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
