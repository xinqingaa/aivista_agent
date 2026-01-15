'use client';

import { useState } from 'react';
import { KnowledgeStats } from '@/components/features/KnowledgeBase/KnowledgeStats';
import { StyleList } from '@/components/features/KnowledgeBase/StyleList';
import { StyleSearch } from '@/components/features/KnowledgeBase/StyleSearch';
import { StyleForm } from '@/components/features/KnowledgeBase/StyleForm';
import { StyleDetail } from '@/components/features/KnowledgeBase/StyleDetail';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import type { StyleData } from '@/lib/types/knowledge';

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StyleData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleStyleClick = (style: StyleData) => {
    setSelectedStyle(style);
    setDetailOpen(true);
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加新风格</DialogTitle>
            <DialogDescription>向知识库添加新的风格数据</DialogDescription>
          </DialogHeader>
          <StyleForm
            onSuccess={() => {
              setShowForm(false);
              // 刷新列表（通过改变 searchQuery 触发）
              setSearchQuery((prev) => prev + ' ');
              setTimeout(() => setSearchQuery((prev) => prev.trim()), 100);
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      <StyleList searchQuery={searchQuery} onStyleClick={handleStyleClick} />

      <StyleDetail
        style={selectedStyle}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
