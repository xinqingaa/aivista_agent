/**
 * 会话项组件
 * 显示单个会话的信息
 */

'use client';

import { MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Session } from '@/stores/session-store';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onUpdateTitle: (sessionId: string, title: string) => void;
}

/**
 * 格式化时间显示
 * @param timestamp 时间戳
 * @returns 格式化后的时间字符串
 */
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}

export function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onUpdateTitle,
}: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(session.title);

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== session.title) {
      onUpdateTitle(session.id, editedTitle.trim());
    } else {
      setEditedTitle(session.title); // 恢复原标题
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(session.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent',
        isActive && 'bg-accent'
      )}
      onClick={() => !isEditing && onSelect(session.id)}
    >
      {/* 图标 */}
      <div className="flex-shrink-0">
        <MessageSquare
          className={cn(
            'h-4 w-4',
            isActive ? 'text-primary' : 'text-muted-foreground'
          )}
        />
      </div>

      {/* 标题和预览 */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveTitle}
            className="h-6 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div
              className={cn(
                'text-sm font-medium truncate',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {session.title}
            </div>
            {session.lastMessage && (
              <div className="text-xs text-muted-foreground truncate">
                {session.lastMessage}
              </div>
            )}
          </>
        )}
      </div>

      {/* 时间标签 */}
      {!isEditing && (
        <div className="flex-shrink-0 text-xs text-muted-foreground">
          {formatTime(session.updatedAt)}
        </div>
      )}

      {/* 操作按钮 */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
          isEditing && 'opacity-100'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleSaveTitle}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleCancelEdit}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(session.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
