/**
 * 侧边栏组件（PC端）
 * 展示对话列表，支持搜索、创建、删除等操作
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConversationStore } from '@/stores/conversation-store';
import { ConversationListItem } from '@/lib/types/conversation';
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  } = useConversationStore();

  const [filter, setFilter] = useState('');
  const [isClient, setIsClient] = useState(false);

  // 客户端渲染标记
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 加载对话列表
  useEffect(() => {
    if (isClient) {
      loadConversations();
    }
  }, [isClient, loadConversations]);

  // 获取过滤后的对话列表项
  const conversationListItems = getConversationListItems()
    .filter((item) => {
      if (!filter) return true;
      return item.title.toLowerCase().includes(filter.toLowerCase());
    })
    .slice(0, 100); // 最多显示100个

  const handleCreateConversation = useCallback(async () => {
    await createConversation('新对话');
  }, [createConversation]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      if (id === activeConversationId) return;
      await selectConversation(id);
    },
    [activeConversationId, selectConversation]
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

  const isExpanded = ui.sidebar.state === 'expanded';
  const isCollapsed = ui.sidebar.state === 'collapsed';
  const isHidden = ui.sidebar.state === 'hidden';

  if (!isClient) {
    return null;
  }

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
        {isExpanded && (
          <h2 className="text-lg font-semibold">对话历史</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(isExpanded ? 'ml-auto' : 'mx-auto')}
          title={isExpanded ? '收起' : '展开'}
        >
          {isExpanded && <ChevronLeft className="h-4 w-4" />}
          {isCollapsed && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* 搜索框（仅展开时显示） */}
      {isExpanded && (
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索对话..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>
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
          title="新建对话"
        >
          <Plus className={cn(isExpanded ? 'h-4 w-4' : 'h-5 w-5')} />
          {isExpanded && <span>新建对话</span>}
        </Button>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversationListItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              {filter ? '未找到匹配的对话' : '暂无对话'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 pb-4">
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
        item.isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted',
        isExpanded ? 'px-4' : 'px-3 justify-center'
      )}
      title={isExpanded ? undefined : item.title}
    >
      {/* 缩略图或图标 */}
      {item.thumbnail ? (
        <div
          className={cn(
            'flex-shrink-0 rounded-lg overflow-hidden bg-muted',
            isExpanded ? 'w-12 h-12' : 'w-8 h-8'
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
            'flex-shrink-0 rounded-lg flex items-center justify-center',
            isExpanded ? 'w-12 h-12' : 'w-8 h-8',
            item.isActive ? 'bg-primary-foreground/20' : 'bg-muted'
          )}
        >
          <MessageSquare
            className={cn(
              isExpanded ? 'h-6 w-6' : 'h-5 w-5',
              item.isActive ? 'text-current' : 'text-muted-foreground'
            )}
          />
        </div>
      )}

      {/* 标题和时间（仅展开时显示） */}
      {isExpanded && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p
            className={cn(
              'text-xs truncate',
              item.isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {formatRelativeTime(item.updatedAt)}
          </p>
        </div>
      )}

      {/* 删除按钮（悬停时显示，仅展开模式） */}
      {isExpanded && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8',
            item.isActive
              ? 'hover:bg-primary-foreground/20 text-primary-foreground'
              : 'hover:bg-destructive/10 text-destructive'
          )}
          title="删除对话"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(timestamp: number): string {
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
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  }
}
