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
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { StyleData } from '@/lib/types/knowledge';
import { useToast } from '@/hooks/use-toast';

interface BatchDeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStyles: StyleData[];
  onConfirm: () => void;
}

export function BatchDeleteConfirm({
  open,
  onOpenChange,
  selectedStyles,
  onConfirm
}: BatchDeleteConfirmProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // 统计系统内置样式的数量
  const systemStylesCount = selectedStyles.filter(style => 
    style.isSystem
  ).length;

  const canDeleteCount = selectedStyles.length - systemStylesCount;
  const systemStyles = selectedStyles.filter(style => 
    style.isSystem
  );

  const handleConfirm = async () => {
    if (canDeleteCount === 0) {
      toast({
        variant: 'destructive',
        title: '无法删除',
        description: '选中的所有样式都是系统内置样式，无法删除',
      });
      return;
    }

    try {
      setLoading(true);
      await onConfirm();
      
      toast({
        title: '删除成功',
        description: `成功删除 ${canDeleteCount} 个样式`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete styles:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selectedStyles.length;
  const deletableCount = selectedStyles.length - systemStylesCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            确认批量删除
          </DialogTitle>
          <DialogDescription>
            您即将删除 {selectedCount} 个样式，请确认此操作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 选中的样式列表 */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            <h4 className="text-sm font-medium">选中的样式：</h4>
            <div className="space-y-1">
              {selectedStyles.map((style) => {
                const isSystem = style.isSystem;
                return (
                  <div 
                    key={style.id}
                    className={`
                      flex items-center justify-between p-2 rounded-md border
                      ${isSystem ? 'bg-muted/50' : 'bg-background'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{style.style}</span>
                      {isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          系统
                        </Badge>
                      )}
                    </div>
                    
                    {isSystem ? (
                      <span className="text-xs text-destructive">不可删除</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">可删除</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 警告信息 */}
          {systemStylesCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    <strong>警告：</strong>选中包含 {systemStylesCount} 个系统内置样式
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• 系统内置样式无法删除</li>
                    <li>• 实际将删除 {deletableCount} 个样式</li>
                    <li>• 系统内置样式：{systemStyles.map(s => s.style).join('、')}</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 统计信息 */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-md">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{selectedCount}</div>
              <div className="text-sm text-muted-foreground">选中总数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{deletableCount}</div>
              <div className="text-sm text-muted-foreground">实际删除数</div>
            </div>
          </div>

          {/* 最终确认提示 */}
          {deletableCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>此操作不可撤销！</strong>删除后样式将永久丢失，请确认是否继续。
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          
          <Button
            onClick={handleConfirm}
            disabled={loading || deletableCount === 0}
            variant={deletableCount === 0 ? "secondary" : "destructive"}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deletableCount === 0 ? '无可删除项' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}