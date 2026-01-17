'use client';

import { CheckSquare, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { StyleData } from '@/lib/types/knowledge';

interface StyleActionsProps {
  styles: StyleData[];
  selectedIds: string[];
  onSelectAll: () => void;
  onSelectNone: () => void;
  onDeleteSelected: () => void;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
}

export function StyleActions({
  styles,
  selectedIds,
  onSelectAll,
  onSelectNone,
  onDeleteSelected,
  isSelectMode,
  onToggleSelectMode
}: StyleActionsProps) {
  const totalCount = styles.length;
  const selectedCount = selectedIds.length;
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const hasSystemStyles = styles.some(style => style.isSystem);

  const deletableCount = selectedIds.filter(id => !styles.find(style => style.id === id)?.isSystem).length;
  const canDelete = deletableCount > 0;

  return (
    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
      {/* 左侧：选择模式和全选 */}
      <div className="flex items-center gap-3">
        <Button
          variant={isSelectMode ? "default" : "outline"}
          size="sm"
          onClick={onToggleSelectMode}
          className="flex items-center gap-2"
        >
          {isSelectMode ? (
            <>
              <CheckSquare className="h-4 w-4" />
              选择模式
            </>
          ) : (
            <>
              <Square className="h-4 w-4" />
              批量操作
            </>
          )}
        </Button>

        {isSelectMode && totalCount > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={isAllSelected ? onSelectNone : onSelectAll}
              disabled={totalCount === 0}
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  取消全选
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-1" />
                  全选
                </>
              )}
            </Button>
            
            <Badge variant="secondary" className="text-xs">
              {selectedCount} / {totalCount}
            </Badge>
          </div>
        )}
      </div>

      {/* 右侧：批量删除 */}
      {isSelectMode && selectedCount > 0 && (
        <div className="flex items-center gap-3">
          {/* 系统样式警告 */}
          {hasSystemStyles && selectedIds.some(id => styles.find(style => style.id === id)?.isSystem) && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>包含系统样式</span>
            </div>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            disabled={!canDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            删除选中项
            {canDelete && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {deletableCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {!isSelectMode && (
        <div className="text-sm text-muted-foreground">
          共 {totalCount} 个样式
        </div>
      )}
    </div>
  );
}