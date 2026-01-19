'use client';

import { StyleCard } from './style-card';
import { Card, CardContent } from '@/components/ui/card';
import type { StyleData } from '@/lib/types/knowledge';

interface StyleListProps {
  styles: StyleData[];
  loading: boolean;
  selectedIds?: string[];
  onSelect?: (id: string, selected: boolean) => void;
  onView?: (style: StyleData) => void;
  onEdit?: (style: StyleData) => void;
  onDelete?: (style: StyleData) => void;
  showActions?: boolean;
  isSelectMode?: boolean;
}

export function StyleList({ 
  styles,
  loading,
  selectedIds = [],
  onSelect,
  onView,
  onEdit,
  onDelete,
  showActions = false,
  isSelectMode = false
}: StyleListProps) {
  const isSystemStyle = (style: StyleData) => {
    return style.isSystem;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="h-[280px] border-muted/40 overflow-hidden shadow-none">
            <CardContent className="animate-pulse p-6 space-y-4">
              <div className="flex justify-between">
                <div className="h-6 bg-muted rounded-md w-1/3"></div>
                <div className="h-5 bg-muted rounded-full w-16"></div>
              </div>
              <div className="space-y-2 pt-4">
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-5/6"></div>
                <div className="h-3 bg-muted rounded w-4/6"></div>
              </div>
              <div className="flex gap-2 pt-4">
                <div className="h-5 bg-muted rounded w-12"></div>
                <div className="h-5 bg-muted rounded w-12"></div>
              </div>
              <div className="flex justify-end pt-4">
                <div className="h-8 bg-muted rounded-lg w-24"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (styles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border border-dashed border-muted-foreground/20">
        <div className="bg-muted p-4 rounded-full mb-4">
          <div className="h-10 w-10 text-muted-foreground opacity-40">📭</div>
        </div>
        <h3 className="text-xl font-bold text-foreground">暂无数据</h3>
        <p className="text-muted-foreground text-sm max-w-xs text-center mt-2">
          知识库中暂无风格数据，点击上方按钮开始创建您的第一个风格。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {styles.map((style) => {
        const isSelected = selectedIds.includes(style.id);
        
        return (
          <StyleCard
            key={style.id}
            style={style}
            isSelected={isSelected}
            onSelect={onSelect}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            showActions={showActions || isSelectMode}
            isSelectMode={isSelectMode}
          />
        );
      })}
    </div>
  );
}
