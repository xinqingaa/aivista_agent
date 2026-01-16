'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Eye, 
  Quote, 
  Tag, 
  Info, 
  Settings,
  Calendar,
  Layers
} from 'lucide-react';
import type { StyleData } from '@/lib/types/knowledge';
import { StyleForm } from './StyleForm';
import { cn } from '@/lib/utils';

interface StyleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style?: StyleData | null;
  mode?: 'view' | 'edit';
  onSave?: (style: StyleData) => void;
  isSystem?: boolean;
}

export function StyleEditDialog({
  open,
  onOpenChange,
  style,
  mode: initialMode = 'view',
  onSave,
  isSystem = false
}: StyleEditDialogProps) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);

  // Synchronize internal mode with prop when dialog opens
  useState(() => {
    if (open) setMode(initialMode);
  });

  if (!style) return null;

  const handleSave = async (formData: any) => {
    if (onSave) {
      await onSave({
        ...style,
        ...formData
      });
    }
    // Mode will be reset by parent when dialog closes or handled here
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">
        {/* Header Section */}
        <div className="p-6 pb-4 bg-muted/30 border-b relative">
          <div className="flex justify-between items-start pr-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {mode === 'view' ? <Eye className="h-5 w-5 text-primary" /> : <Edit className="h-5 w-5 text-primary" />}
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {mode === 'view' ? style.style : `编辑: ${style.style}`}
                </DialogTitle>
                {isSystem && (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold px-2">
                    System
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {mode === 'view' ? '查看详情与 Prompt 配置' : '修改风格配置信息'}
              </p>
            </div>
            
            {mode === 'view' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMode('edit')}
                className="gap-2 h-8 font-bold border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
              >
                <Edit className="h-3.5 w-3.5" />
                进入编辑
              </Button>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {mode === 'view' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Description */}
              {style.description && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                    <Info className="h-3.5 w-3.5" />
                    描述
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 bg-muted/20 p-3 rounded-lg border border-muted/10">
                    {style.description}
                  </p>
                </div>
              )}

              {/* Prompt - High Contrast Box */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                  <Quote className="h-3.5 w-3.5" />
                  Prompt 配置
                </div>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                  <div className="relative bg-background border border-primary/10 rounded-xl p-5 shadow-inner">
                    <p className="text-sm font-mono leading-loose text-foreground/80 italic">
                      {style.prompt}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {style.tags && style.tags.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                    <Tag className="h-3.5 w-3.5" />
                    标签
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {style.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="px-3 py-1 bg-muted/50 hover:bg-muted text-xs transition-colors">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata & Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                    <Settings className="h-3.5 w-3.5" />
                    元数据
                  </div>
                  <pre className="text-[11px] font-mono p-4 rounded-xl bg-muted/40 border border-muted/10 overflow-x-auto leading-relaxed">
                    {JSON.stringify(style.metadata || {}, null, 2)}
                  </pre>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                    <Layers className="h-3.5 w-3.5" />
                    系统信息
                  </div>
                  <div className="space-y-2 rounded-xl border border-muted/10 p-4 bg-muted/20">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> ID
                      </span>
                      <span className="font-mono font-medium">{style.id}</span>
                    </div>
                    {/* Add more info here if available in style object */}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <StyleForm
                initialData={style}
                onSubmit={handleSave}
                onCancel={() => setMode('view')}
                isSystem={isSystem}
                submitLabel="保存更改"
              />
            </div>
          )}
        </div>

        {/* Footer info for system styles */}
        {mode === 'edit' && isSystem && (
          <div className="px-6 py-3 bg-orange-50 border-t border-orange-100 flex items-center gap-3">
            <div className="p-1 rounded-full bg-orange-100 text-orange-600">
              <Info className="h-3.5 w-3.5" />
            </div>
            <p className="text-[11px] text-orange-700 font-medium leading-tight">
              注意：系统内置风格的核心属性（名称和 Prompt）受保护无法修改，但您可以优化描述和标签。
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
