'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, Eye, MoreHorizontal, Shield } from 'lucide-react';
import type { StyleData } from '@/lib/types/knowledge';
import { cn } from '@/lib/utils';

interface StyleCardProps {
  style: StyleData;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onView?: (style: StyleData) => void;
  onEdit?: (style: StyleData) => void;
  onDelete?: (style: StyleData) => void;
  showActions?: boolean;
  isSelectMode?: boolean;
}

export function StyleCard({
  style,
  isSelected = false,
  onSelect,
  onView,
  onEdit,
  onDelete,
  showActions = false,
  isSelectMode = false,
}: StyleCardProps) {
  // 从 style 对象读取 isSystem，确保数据一致性
  const isSystem = style.isSystem || false;
  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking checkbox area or buttons, don't trigger view
    if ((e.target as HTMLElement).closest('.card-action-btn')) return;
    
    if (onView) {
      onView(style);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (onSelect) {
      onSelect(style.id, !!checked);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(style);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(style);
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-muted/60",
        onView && "cursor-pointer",
        isSelected && "ring-2 ring-primary border-primary/20 bg-primary/5 shadow-primary/10"
      )}
      onClick={handleCardClick}
    >
      {/* 顶部栏：选择和系统标识 */}
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start z-10">
        {showActions ? (
          <div 
            className="card-action-btn p-1 rounded-md bg-background/90 backdrop-blur-md border shadow-sm transition-transform active:scale-95"
            onClick={handleCheckboxClick}
          >
            <Checkbox
              checked={isSelected}
              onChange={(e) => handleSelectChange(e)}
              className="h-4 w-4 pointer-events-auto"
              aria-label={`选择 ${style.style}`}
            />
          </div>
        ) : <div />}

        {isSystem && (
          <Badge
            variant="secondary"
            className="font-semibold text-[10px] uppercase tracking-tighter px-2 py-0 bg-primary/10 text-primary border-primary/20 backdrop-blur-md shadow-sm flex items-center gap-1"
          >
            <Shield className="w-3 h-3" />
            系统风格
          </Badge>
        )}
      </div>

      <CardHeader className="pt-12 pb-2 px-5">
        <CardTitle className="text-xl font-extrabold truncate tracking-tight group-hover:text-primary transition-colors">
          {style.style}
        </CardTitle>
        {style.description && (
          <CardDescription className="line-clamp-1 text-xs font-medium text-muted-foreground/80 mt-0.5">
            {style.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="px-5 pb-5 space-y-4">
        {/* Prompt 区域 */}
        <div className="relative rounded-xl bg-muted/30 p-3 border border-muted/10 group-hover:bg-muted/50 transition-all duration-300 group-hover:border-primary/10">
          <p className="text-[13px] text-muted-foreground line-clamp-3 italic leading-relaxed font-serif">
            &ldquo;{style.prompt}&rdquo;
          </p>
          <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <MoreHorizontal className="h-3 w-3 text-muted-foreground/40" />
          </div>
        </div>
        
        {/* 标签和底部栏 */}
        <div className="flex flex-col gap-4">
          {style.tags && style.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {style.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] h-5 px-2 bg-background/40 hover:bg-background transition-colors border-muted-foreground/10 text-muted-foreground/90">
                  {tag}
                </Badge>
              ))}
              {style.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground/60 font-bold pl-1 self-center">
                  +{style.tags.length - 3}
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-1">
            {style.metadata?.popularity !== undefined ? (
              <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/70">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </div>
                Trending {style.metadata.popularity}%
              </div>
            ) : <div />}
            
            {/* 操作按钮组 */}
            <div className={cn(
              "flex gap-1.5 items-center transition-all duration-300 card-action-btn transform translate-y-1 opacity-0",
              (showActions || isSelected) ? "opacity-100 translate-y-0" : "group-hover:opacity-100 group-hover:translate-y-0"
            )}>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleEdit}
                className="h-8 w-8 rounded-lg hover:bg-primary hover:text-primary-foreground shadow-sm transition-all active:scale-90"
                title={isSystem ? "系统内置样式，仅可编辑部分字段" : "编辑"}
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              {!isSystem && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleDelete}
                  className="h-8 w-8 rounded-lg hover:bg-destructive hover:text-destructive-foreground shadow-sm transition-all active:scale-90"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-foreground hover:text-background shadow-sm transition-all active:scale-90"
                title="查看详情"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
