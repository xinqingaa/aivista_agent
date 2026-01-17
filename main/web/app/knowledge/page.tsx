'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  KnowledgeStats,
  StyleSearch,
  StyleList
} from '@/components/knowledge';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  StyleEditDialog,
  BatchDeleteConfirm,
  DeleteConfirm,
  StyleActions,
  StyleForm
} from '@/components/knowledge';
import { 
  getStyles,
  createStyle,
  updateStyle,
  deleteStyle,
  deleteStyles
} from '@/lib/api/knowledge';
import type { 
  StyleData,
  CreateStyleRequest,
  UpdateStyleRequest,
  BatchDeleteResponse
} from '@/lib/types/knowledge';
import { useToast } from '@/hooks/use-toast';

export default function KnowledgePage() {
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StyleData | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [styles, setStyles] = useState<StyleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSingleDeleteConfirm, setShowSingleDeleteConfirm] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState<StyleData | null>(null);

  const loadStyles = async () => {
    try {
      setLoading(true);
      const data = await getStyles();
      setStyles(data);
    } catch (error) {
      console.error('Failed to load styles:', error);
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStyles();
  }, []);

  const filteredStyles = useMemo(() => {
    if (!searchQuery.trim()) return styles;
    
    const query = searchQuery.toLowerCase();
    return styles.filter(style => 
      style.style.toLowerCase().includes(query) ||
      style.description?.toLowerCase().includes(query) ||
      style.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      style.prompt.toLowerCase().includes(query)
    );
  }, [styles, searchQuery]);

  const isSystemStyle = (style: StyleData) => {
    return style.isSystem;
  };

  const handleStyleClick = (style: StyleData) => {
    if (isSelectMode) {
      const newSelectedIds = selectedIds.includes(style.id)
        ? selectedIds.filter(id => id !== style.id)
        : [...selectedIds, style.id];
      setSelectedIds(newSelectedIds);
    } else {
      setSelectedStyle(style);
      setDialogMode('view');
      setShowEditDialog(true);
    }
  };

  const handleEdit = (style: StyleData) => {
    setSelectedStyle(style);
    setDialogMode(isSystemStyle(style) ? 'view' : 'edit');
    setShowEditDialog(true);
  };

  const handleDelete = (style: StyleData) => {
    if (isSystemStyle(style)) {
      toast({
        variant: 'destructive',
        title: '无法删除',
        description: '系统内置样式不能删除',
      });
      return;
    }
    setStyleToDelete(style);
    setShowSingleDeleteConfirm(true);
  };

  const handleSingleDeleteConfirm = async () => {
    if (!styleToDelete) return;

    try {
      await deleteStyle(styleToDelete.id);

      toast({
        title: '删除成功',
        description: `已删除风格：${styleToDelete.style}`,
      });

      setShowSingleDeleteConfirm(false);
      setStyleToDelete(null);
      await loadStyles();
    } catch (error) {
      console.error('Failed to delete style:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  const handleSelectAll = () => {
    const allIds = filteredStyles.map(style => style.id);
    setSelectedIds(allIds);
  };

  const handleSelectNone = () => {
    setSelectedIds([]);
  };

  const handleDeleteSelected = () => {
    setShowDeleteConfirm(true);
  };

  const handleBatchDeleteConfirm = async () => {
    const selectedStyles = filteredStyles.filter(style => selectedIds.includes(style.id));
    const result = await deleteStyles(selectedStyles.map(style => style.id));

    if (result.failed.length > 0) {
      toast({
        variant: 'destructive',
        title: '部分删除失败',
        description: `${result.failed.join(', ')} 删除失败`,
      });
    } else {
      toast({
        title: '删除成功',
        description: `成功删除 ${result.deleted} 个风格`,
      });
    }

    setSelectedIds([]);
    setShowDeleteConfirm(false);
    setIsSelectMode(false);
    await loadStyles();
  };

  const handleSave = async (updatedStyle: StyleData) => {
    try {
      // 解构StyleData 移除id
      const { id, ...rest } = updatedStyle;
      await updateStyle(id, rest);
      
      toast({
        title: '更新成功',
        description: `${updatedStyle.style} 已更新`,
      });
      
      setShowEditDialog(false);
      setSelectedStyle(null);
      await loadStyles();
    } catch (error) {
      console.error('Failed to update style:', error);
      throw error;
    }
  };

  const handleCreate = async (data: CreateStyleRequest) => {
    try {
      await createStyle(data);
      
      toast({
        title: '创建成功',
        description: `${data.style} 已添加到知识库`,
      });
      
      setShowForm(false);
      await loadStyles();
    } catch (error) {
      console.error('Failed to create style:', error);
      throw error;
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (!isSelectMode) {
      setSelectedIds([]);
    }
  };

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">知识库管理</h1>
        <KnowledgeStats />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-background/50 p-4 rounded-2xl border border-muted/40 backdrop-blur-sm">
        <div className="flex-1 w-full max-w-md">
          <StyleSearch query={searchQuery} onQueryChange={setSearchQuery} />
        </div>
        
        <Button onClick={() => setShowForm(true)} className="rounded-xl px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <Plus className="mr-2 h-4 w-4" />
          新增视觉风格
        </Button>
      </div>

      <div className="space-y-4">
        {/* <StyleActions
          styles={filteredStyles}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onDeleteSelected={handleDeleteSelected}
          isSelectMode={isSelectMode}
          onToggleSelectMode={toggleSelectMode}
        /> */}

        <StyleList
          styles={filteredStyles}
          loading={loading}
          selectedIds={selectedIds}
          onSelect={(id, selected) => {
            const newSelectedIds = selected
              ? [...selectedIds, id]
              : selectedIds.filter(i => i !== id);
            setSelectedIds(newSelectedIds);
          }}
          onView={handleStyleClick}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={isSelectMode}
          isSelectMode={isSelectMode}
        />
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-0 flex-shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Sparkles className="h-5 w-5" />
              <DialogTitle className="text-2xl font-black tracking-tight">新增视觉风格</DialogTitle>
            </div>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              定义一个新的 AI 生成风格，包含 Prompt 词缀和元数据。
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-2 overflow-y-auto custom-scrollbar flex-1">
            <StyleForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              submitLabel="立即创建风格"
            />
          </div>
        </DialogContent>
      </Dialog>

      <StyleEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        style={selectedStyle}
        mode={dialogMode}
        onSave={handleSave}
        isSystem={selectedStyle ? isSystemStyle(selectedStyle) : false}
      />

      <BatchDeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        selectedStyles={filteredStyles.filter(style => selectedIds.includes(style.id))}
        onConfirm={handleBatchDeleteConfirm}
      />

      <DeleteConfirm
        open={showSingleDeleteConfirm}
        onOpenChange={setShowSingleDeleteConfirm}
        style={styleToDelete}
        onConfirm={handleSingleDeleteConfirm}
      />
    </div>
  );
}