'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Shield, Trash2 } from 'lucide-react';
import type { StyleData } from '@/lib/types/knowledge';
import { useToast } from '@/hooks/use-toast';

interface DeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style: StyleData | null;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteConfirm({
  open,
  onOpenChange,
  style,
  onConfirm,
}: DeleteConfirmProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isSystem = style?.isSystem || false;

  const handleConfirm = async () => {
    if (!style) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '未选择要删除的风格',
      });
      return;
    }

    if (isSystem) {
      toast({
        variant: 'destructive',
        title: '无法删除',
        description: '系统内置风格不能删除',
      });
      return;
    }

    try {
      setLoading(true);
      await onConfirm(style.id);

      toast({
        title: '删除成功',
        description: `已删除风格：${style.style}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete style:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!style) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            确认删除风格
          </DialogTitle>
          <DialogDescription>
            您即将删除风格：{style.style}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 风格信息 */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">风格名称</h4>
              {isSystem && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  系统风格
                </Badge>
              )}
            </div>
            <p className="text-lg font-semibold">{style.style}</p>
            {style.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {style.description}
              </p>
            )}
          </div>

          {/* 系统风格警告 */}
          {isSystem && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">无法删除系统内置风格</p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• 系统内置风格是应用的核心资源</li>
                    <li>• 只能编辑部分字段（描述、标签、元数据）</li>
                    <li>• 不能删除或修改核心内容</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 删除警告 */}
          {!isSystem && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-destructive">
                    <strong>此操作不可撤销！</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    删除后风格将永久丢失，无法恢复。请确认是否继续。
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Prompt 预览 */}
          {!isSystem && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">
                Prompt 预览
              </p>
              <p className="text-xs text-muted-foreground line-clamp-3 italic">
                &quot;{style.prompt}&quot;
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={loading || isSystem}
            variant={isSystem ? "secondary" : "destructive"}
            className={isSystem ? "" : "shadow-lg shadow-destructive/20"}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSystem ? '不可删除' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
