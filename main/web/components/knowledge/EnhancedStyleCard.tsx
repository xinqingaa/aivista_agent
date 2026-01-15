'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, Eye } from 'lucide-react';
import type { StyleData } from '@/lib/types/knowledge';

interface EnhancedStyleCardProps {
  style: StyleData;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onView?: (style: StyleData) => void;
  onEdit?: (style: StyleData) => void;
  onDelete?: (style: StyleData) => void;
  showActions?: boolean;
  isSystem?: boolean;
}

export function EnhancedStyleCard({ 
  style, 
  isSelected = false,
  onSelect,
  onView,
  onEdit,
  onDelete,
  showActions = false,
  isSystem = false
}: EnhancedStyleCardProps) {
  const handleCardClick = () => {
    if (showActions && onView) {
      onView(style);
    } else if (onView) {
      onView(style);
    }
  };

  const handleSelectChange = (checked: boolean) => {
    if (onSelect) {
      onSelect(style.id, checked);
    }
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
      className={`
        relative transition-all duration-200
        ${onView ? 'cursor-pointer hover:shadow-lg' : ''}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* 选择框 - 仅在批量操作模式下显示 */}
      {showActions && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleSelectChange}
            className="bg-background"
            aria-label={`选择 ${style.style}`}
          />
        </div>
      )}

      {/* 系统内置标识 */}
      {isSystem && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="text-xs">
            系统
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{style.style}</CardTitle>
        {style.description && <CardDescription>{style.description}</CardDescription>}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{style.prompt}</p>
        
        {style.tags && style.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {style.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {style.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{style.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {style.metadata?.popularity && (
          <div className="text-xs text-muted-foreground">
            流行度: {style.metadata.popularity}
          </div>
        )}

        {/* 操作按钮 - 仅在批量操作模式下显示 */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              disabled={isSystem}
              className="h-8 w-8 p-0"
              title={isSystem ? "系统内置样式不能编辑" : "编辑"}
            >
              <Edit className="h-3 w-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isSystem}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              title={isSystem ? "系统内置样式不能删除" : "删除"}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCardClick}
              className="h-8 w-8 p-0"
              title="查看详情"
            >
              <Eye className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}