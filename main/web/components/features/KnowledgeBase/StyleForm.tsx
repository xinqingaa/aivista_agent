'use client';

import { useState } from 'react';
import { createStyle } from '@/lib/api/knowledge';
import type { CreateStyleRequest } from '@/lib/types/knowledge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface StyleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function StyleForm({ onSuccess, onCancel }: StyleFormProps) {
  const [formData, setFormData] = useState<CreateStyleRequest>({
    style: '',
    prompt: '',
    description: '',
    tags: [],
    metadata: {},
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.style || !formData.prompt) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请填写必填字段（风格名称和 Prompt）',
      });
      return;
    }

    try {
      setLoading(true);
      await createStyle(formData);
      toast({
        title: '成功',
        description: '风格已成功添加',
      });
      onSuccess();
      // 重置表单
      setFormData({
        style: '',
        prompt: '',
        description: '',
        tags: [],
        metadata: {},
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: err instanceof Error ? err.message : '创建失败',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="style">
              风格名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="style"
              value={formData.style}
              onChange={(e) => setFormData({ ...formData, style: e.target.value })}
              placeholder="例如: Cyberpunk"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">
              Prompt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="例如: neon lights, high tech, low life..."
              required
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述（可选）</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="风格描述"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">标签（可选，用逗号分隔）</Label>
            <Input
              id="tags"
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => {
                const tags = e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0);
                setFormData({ ...formData, tags });
              }}
              placeholder="例如: cyberpunk, futuristic, neon"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '提交中...' : '提交'}
            </Button>
          </div>
        </form>
  );
}
