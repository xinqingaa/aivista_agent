'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  KnowledgeStats,
  StyleSearch,
  EnhancedStyleList
} from '@/components/knowledge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
  StyleActions
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
    return style.id.startsWith('style_00');
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
    setSelectedStyle(style);
    deleteStyleConfirm([style]);
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
    }
    
    setSelectedIds([]);
    setShowDeleteConfirm(false);
    setIsSelectMode(false);
    await loadStyles();
  };

  const deleteStyleConfirm = async (stylesToDelete: StyleData[]) => {
    if (stylesToDelete.length === 1) {
      await deleteStyle(stylesToDelete[0].id);
      setSelectedIds(prev => prev.filter(id => id !== stylesToDelete[0].id));
    } else {
      const idsToDelete = stylesToDelete.map(style => style.id);
      const result = await deleteStyles(idsToDelete);
      
      if (result.failed.length > 0) {
        toast({
          variant: 'destructive',
          title: '部分删除失败',
          description: `${result.failed.join(', ')} 删除失败`,
        });
      }
      
      setSelectedIds(prev => prev.filter(id => !result.failed.includes(id)));
    }
    
    await loadStyles();
  };

  const handleSave = async (updatedStyle: StyleData) => {
    try {
      await updateStyle(selectedStyle!.id, updatedStyle);
      
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

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <StyleSearch query={searchQuery} onQueryChange={setSearchQuery} />
        </div>
        
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          添加风格
        </Button>
      </div>

      <StyleActions
        styles={filteredStyles}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectNone={handleSelectNone}
        onDeleteSelected={handleDeleteSelected}
        isSelectMode={isSelectMode}
        onToggleSelectMode={toggleSelectMode}
      />

      <div className="relative">
        <EnhancedStyleList
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加新风格</DialogTitle>
            <DialogDescription>向知识库添加新的风格数据</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center text-muted-foreground">
              添加表单功能开发中...
            </div>
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
    </div>
  );
}