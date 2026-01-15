'use client';

import { EnhancedStyleCard } from '@/components/knowledge';
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

export function EnhancedStyleList({ 
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
    return style.id.startsWith('style_00');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="h-48">
            <CardContent className="animate-pulse p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (styles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">暂无数据</div>
        <div className="text-muted-foreground text-sm">
          知识库中暂无风格数据，请先添加一些风格
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {styles.map((style) => {
        const isSelected = selectedIds.includes(style.id);
        
        return (
          <EnhancedStyleCard
            key={style.id}
            style={style}
            isSelected={isSelected}
            onSelect={onSelect}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            showActions={showActions}
            isSystem={isSystemStyle(style)}
          />
        );
      })}
    </div>
  );
}