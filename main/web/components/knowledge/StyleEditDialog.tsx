'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Eye } from 'lucide-react';
import type { StyleData } from '@/lib/types/knowledge';
import { useToast } from '@/hooks/use-toast';

interface StyleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  style?: StyleData | null;
  mode?: 'view' | 'edit';
  onSave?: (style: StyleData) => void;
  isSystem?: boolean;
}

interface FormData {
  style: string;
  prompt: string;
  description: string;
  tags: string;
  metadata: string;
}

export function StyleEditDialog({
  open,
  onOpenChange,
  style,
  mode = 'view',
  onSave,
  isSystem = false
}: StyleEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    style: '',
    prompt: '',
    description: '',
    tags: '',
    metadata: '',
  });

  // 当style改变时更新表单数据
  useEffect(() => {
    if (style) {
      setFormData({
        style: style.style || '',
        prompt: style.prompt || '',
        description: style.description || '',
        tags: style.tags?.join(', ') || '',
        metadata: style.metadata ? JSON.stringify(style.metadata, null, 2) : '',
      });
    } else {
      setFormData({
        style: '',
        prompt: '',
        description: '',
        tags: '',
        metadata: '',
      });
    }
  }, [style]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!style || mode !== 'edit') return;

    // 验证必填字段
    if (!formData.style.trim() || !formData.prompt.trim()) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '风格名称和提示词为必填项',
      });
      return;
    }

    try {
      setLoading(true);

      // 准备更新数据
      const updateData: any = {
        style: formData.style.trim(),
        prompt: formData.prompt.trim(),
        description: formData.description.trim() || undefined,
      };

      // 处理标签
      if (formData.tags.trim()) {
        updateData.tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }

      // 处理元数据
      if (formData.metadata.trim()) {
        try {
          updateData.metadata = JSON.parse(formData.metadata);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: '元数据格式错误',
            description: '请输入有效的JSON格式',
          });
          return;
        }
      }

      // 系统内置样式只能更新部分字段
      if (isSystem) {
        const allowedFields = ['description', 'tags', 'metadata'];
        const systemUpdateData: any = {};
        Object.keys(updateData).forEach(key => {
          if (allowedFields.includes(key)) {
            systemUpdateData[key] = updateData[key];
          }
        });
        
        if (onSave) {
          await onSave({
            ...style,
            ...systemUpdateData
          });
        }
      } else {
        if (onSave) {
          await onSave({
            ...style,
            ...updateData
          });
        }
      }

      toast({
        title: '保存成功',
        description: `${style.style} 已更新`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save style:', error);
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = mode === 'view';
  const canEdit = mode === 'edit';
  const isSystemStyle = isSystem && mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'view' ? (
              <>
                <Eye className="h-5 w-5" />
                查看风格详情
              </>
            ) : (
              <>
                <Edit className="h-5 w-5" />
                编辑风格
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'view' ? '查看风格的详细信息' : '编辑风格的属性（系统内置样式只能修改描述、标签和元数据）'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 风格名称 */}
          <div className="space-y-2">
            <Label htmlFor="style">风格名称 *</Label>
            <Input
              id="style"
              value={formData.style}
              onChange={(e) => handleInputChange('style', e.target.value)}
              disabled={isReadOnly || isSystemStyle || loading}
              placeholder="请输入风格名称"
              className={(isReadOnly || isSystemStyle) ? 'bg-muted' : ''}
            />
            {isSystemStyle && (
              <p className="text-xs text-muted-foreground">系统样式名称不可修改</p>
            )}
          </div>

          {/* 提示词 */}
          <div className="space-y-2">
            <Label htmlFor="prompt">提示词 *</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => handleInputChange('prompt', e.target.value)}
              disabled={isReadOnly || isSystemStyle || loading}
              placeholder="请输入风格提示词"
              rows={4}
              className={(isReadOnly || isSystemStyle) ? 'resize-none bg-muted' : 'resize-none'}
            />
            {isSystemStyle && (
              <p className="text-xs text-muted-foreground">系统样式提示词不可修改</p>
            )}
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isReadOnly || loading}
              placeholder="请输入风格描述"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label htmlFor="tags">标签</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              disabled={isReadOnly || loading}
              placeholder="请输入标签，多个标签用逗号分隔"
            />
            {formData.tags.trim() && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.split(',').map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 元数据 */}
          <div className="space-y-2">
            <Label htmlFor="metadata">元数据 (JSON格式)</Label>
            <Textarea
              id="metadata"
              value={formData.metadata}
              onChange={(e) => handleInputChange('metadata', e.target.value)}
              disabled={isReadOnly || loading}
              placeholder='{"category": "digital", "popularity": 85}'
              rows={4}
              className="font-mono text-sm resize-none"
            />
            {formData.metadata.trim() && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <div className="text-xs font-mono">
                  <pre className="whitespace-pre-wrap">{formData.metadata}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          
          {mode === 'edit' && (
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          )}
          
          {mode === 'view' && isSystem && (
            <div className="text-sm text-muted-foreground">
              系统内置样式，部分字段不可编辑
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}