'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2, Code, List, Trash2 } from 'lucide-react';
import type { StyleData } from '@/lib/types/knowledge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface StyleFormProps {
  initialData?: StyleData | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSystem?: boolean;
  submitLabel?: string;
}

interface MetaEntry {
  key: string;
  value: string;
}

export function StyleForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isSystem = false,
  submitLabel = '提交'
}: StyleFormProps) {
  const [formData, setFormData] = useState({
    style: '',
    prompt: '',
    description: '',
    tags: [] as string[],
    metadataRaw: '',
  });
  
  // Metadata edit mode: 'simple' (Key-Value) or 'advanced' (JSON)
  const [metaMode, setMetaMode] = useState<'simple' | 'advanced'>('simple');
  const [metaEntries, setMetaEntries] = useState<MetaEntry[]>([{ key: '', value: '' }]);
  
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      const metadata = initialData.metadata || {};
      const entries = Object.entries(metadata).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      }));
      
      setFormData({
        style: initialData.style || '',
        prompt: initialData.prompt || '',
        description: initialData.description || '',
        tags: initialData.tags || [],
        metadataRaw: JSON.stringify(metadata, null, 2),
      });
      
      setMetaEntries(entries.length > 0 ? entries : [{ key: '', value: '' }]);
    } else {
      setFormData({
        style: '',
        prompt: '',
        description: '',
        tags: [],
        metadataRaw: '',
      });
      setMetaEntries([{ key: '', value: '' }]);
    }
  }, [initialData]);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleAddMetaEntry = () => {
    setMetaEntries([...metaEntries, { key: '', value: '' }]);
  };

  const handleRemoveMetaEntry = (index: number) => {
    const newEntries = [...metaEntries];
    newEntries.splice(index, 1);
    setMetaEntries(newEntries.length > 0 ? newEntries : [{ key: '', value: '' }]);
  };

  const handleUpdateMetaEntry = (index: number, field: keyof MetaEntry, value: string) => {
    const newEntries = [...metaEntries];
    newEntries[index][field] = value;
    setMetaEntries(newEntries);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!formData.style.trim() || !formData.prompt.trim()) {
      setError('请填写必填字段（风格名称和 Prompt）');
      return;
    }

    let finalMetadata = {};
    if (metaMode === 'advanced') {
      if (formData.metadataRaw.trim()) {
        try {
          finalMetadata = JSON.parse(formData.metadataRaw);
        } catch (err) {
          setError('元数据格式错误，请确保是有效的 JSON');
          return;
        }
      }
    } else {
      // Simple mode: Convert entries to object
      metaEntries.forEach(entry => {
        if (entry.key.trim()) {
          let val: any = entry.value;
          // Try to parse number or boolean if possible
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
          
          finalMetadata[entry.key.trim()] = val;
        }
      });
    }

    // Collect tags including current input
    let finalTags = [...formData.tags];
    const currentTag = tagInput.trim();
    if (currentTag && !finalTags.includes(currentTag)) {
      finalTags.push(currentTag);
    }

    try {
      setLoading(true);
      const submitData = {
        // Generate ID if missing (for new styles)
        id: initialData?.id || `style_${Date.now()}`,
        style: formData.style.trim(),
        prompt: formData.prompt.trim(),
        description: formData.description.trim() || undefined,
        tags: finalTags,
        metadata: finalMetadata,
      };
      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Only submit on enter if not in textarea or tag input
      const target = e.target as HTMLElement;
      if (target.tagName !== 'TEXTAREA' && target.id !== 'tag-input') {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5 py-2">
      <div className="grid grid-cols-1 gap-5">
        {/* 风格名称 */}
        <div className="space-y-2">
          <Label htmlFor="style" className="text-sm font-semibold flex items-center gap-1">
            风格名称 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="style"
            value={formData.style}
            onChange={(e) => setFormData({ ...formData, style: e.target.value })}
            placeholder="例如: Cyberpunk"
            disabled={loading || isSystem}
            className={cn(isSystem && "bg-muted cursor-not-allowed")}
          />
          {isSystem && <p className="text-[10px] text-muted-foreground italic">系统内置风格不可修改名称</p>}
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-sm font-semibold flex items-center gap-1">
            Prompt <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="prompt"
            value={formData.prompt}
            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            placeholder="例如: neon lights, high tech, low life..."
            disabled={loading || isSystem}
            rows={4}
            className={cn("resize-none font-mono text-xs leading-relaxed", isSystem && "bg-muted cursor-not-allowed")}
          />
          {isSystem && <p className="text-[10px] text-muted-foreground italic">系统内置风格不可修改 Prompt</p>}
        </div>

        {/* 描述 */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold">描述</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="简要描述风格特点..."
            disabled={loading}
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        {/* 标签 */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">标签</Label>
          <div className="flex flex-wrap gap-2 min-h-8 p-2 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring transition-all">
            {formData.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1 px-2 py-0.5 h-6">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive transition-colors"
                  disabled={loading}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <div className="flex-1 flex items-center min-w-[120px]">
              <input
                id="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="添加标签..."
                className="w-full bg-transparent border-none outline-none text-sm px-1 py-0 h-6 focus:ring-0"
                disabled={loading}
              />
              {tagInput && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={handleAddTag}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 元数据编辑器 */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              元数据
              {metaMode === 'simple' ? <List className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">高级 JSON 模式</span>
              <Switch 
                checked={metaMode === 'advanced'} 
                onCheckedChange={(checked) => setMetaMode(checked ? 'advanced' : 'simple')}
                className="scale-75"
              />
            </div>
          </div>

          {metaMode === 'simple' ? (
            <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-dashed border-muted-foreground/20">
              {metaEntries.map((entry, index) => (
                <div key={index} className="flex gap-2 items-start animate-in fade-in slide-in-from-left-2 duration-200">
                  <Input
                    placeholder="键 (Key)"
                    value={entry.key}
                    onChange={(e) => handleUpdateMetaEntry(index, 'key', e.target.value)}
                    className="h-8 text-xs font-mono"
                    disabled={loading}
                  />
                  <Input
                    placeholder="值 (Value)"
                    value={entry.value}
                    onChange={(e) => handleUpdateMetaEntry(index, 'value', e.target.value)}
                    className="h-8 text-xs font-medium"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMetaEntry(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMetaEntry}
                className="w-full h-8 text-xs border-dashed gap-2 hover:bg-background transition-all"
                disabled={loading}
              >
                <Plus className="h-3.5 w-3.5" />
                添加自定义属性
              </Button>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <Textarea
                id="metadata"
                value={formData.metadataRaw}
                onChange={(e) => setFormData({ ...formData, metadataRaw: e.target.value })}
                placeholder='{ "category": "sci-fi", "artist": "..." }'
                disabled={loading}
                rows={4}
                className="font-mono text-xs resize-none bg-muted/30 p-4 border-muted/40"
              />
              <p className="text-[10px] text-muted-foreground mt-2 italic px-1">
                提示：手动编辑 JSON 需要保证格式正确。
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t mt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={loading}
          className="h-10 px-6 rounded-xl font-bold"
        >
          取消
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
          className="h-10 px-8 rounded-xl font-black bg-primary shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 min-w-[120px]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在保存...
            </>
          ) : (
            <>
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

