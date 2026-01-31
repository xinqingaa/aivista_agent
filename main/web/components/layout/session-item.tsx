/**
 * 会话项组件
 * 显示单个会话的信息
 */

'use client';

import { MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Session } from '@/stores/session-store';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onUpdateTitle: (sessionId: string, title: string) => void;
  collapsed?: boolean;
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
  collapsed = false,
}: SessionItemProps) {
  // 显示优先级：用户自定义标题 > lastMessage > 默认标题
  // 如果 title 不是默认值"新对话"，说明用户自定义了，优先显示
  const displayTitle = session.title !== '新对话' 
    ? session.title 
    : (session.lastMessage || session.title);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(displayTitle);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== displayTitle) {
      onUpdateTitle(session.id, editedTitle.trim());
    } else {
      setEditedTitle(displayTitle); // 恢复原标题
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(displayTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // 收起状态：只显示图标和时间
  if (collapsed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center p-2 rounded-lg cursor-pointer transition-all hover:bg-accent',
          isActive && 'bg-accent'
        )}
        onClick={() => onSelect(session.id)}
        title={session.lastMessage || session.title}
      >
        <MessageSquare
          className={cn(
            'h-4 w-4',
            isActive ? 'text-primary' : 'text-muted-foreground'
          )}
        />
        <div className="text-[10px] text-muted-foreground mt-1">
          {formatTime(session.updatedAt)}
        </div>
      </div>
    );
  }

  // 展开状态：完整显示
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
          <div
            className={cn(
              'text-sm font-medium truncate',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {/* 显示优先级：将来可扩展为 serverTitle > lastMessage > title */}
            {displayTitle}
          </div>
        )}
      </div>

      {/* 时间标签 - 悬停时隐藏 */}
      {!isEditing && (
        <div className="flex-shrink-0 text-xs text-muted-foreground group-hover:hidden">
          {formatTime(session.updatedAt)}
        </div>
      )}

      {/* 操作按钮 - 悬停时显示，编辑时始终显示 */}
      <div
        className={cn(
          'flex-shrink-0 items-center gap-1',
          isEditing ? 'flex' : 'hidden group-hover:flex'
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
              onClick={() => {
                setEditedTitle(displayTitle);
                setIsEditing(true);
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>

      {/* 删除确认弹框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此会话吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete(session.id);
              }}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
