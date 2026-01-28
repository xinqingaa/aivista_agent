/**
 * EnhancedPrompt 展示组件
 * 显示 RAG 检索结果和增强后的 Prompt
 * 风格：简约卡片
 */

'use client';

import { useState } from 'react';
import { EnhancedPromptEvent } from '@/lib/types/sse';
import { Search, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EnhancedPromptViewProps } from '@/lib/types/genui';

export function EnhancedPromptView({ original, retrieved, final }: EnhancedPromptViewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden my-4">
      {/* 头部：最终结果 */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="mt-1 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="text-sm font-medium">提示词已增强</div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {final}
            </div>
          </div>
        </div>
      </div>

      {/* 详情：折叠区域 */}
      <div className="border-t">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span>查看优化详情 (RAG 检索结果)</span>
        </button>
        
        {isOpen && (
          <div className="px-4 py-3 space-y-4 bg-background animate-in slide-in-from-top-2 duration-200">
            {/* 原始输入 */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">原始输入</span>
              <div className="text-sm p-3 bg-muted/50 rounded-md text-foreground">
                {original}
              </div>
            </div>

            {/* 检索结果 */}
            {retrieved && retrieved.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Search className="w-3 h-3" />
                  参考风格 ({retrieved.length})
                </span>
                <div className="grid gap-2">
                  {retrieved.map((item, index) => (
                    <div 
                      key={index}
                      className="text-xs p-3 rounded border bg-background hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-foreground">{item.style}</span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          相似度 {(item.similarity * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">
                        {item.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
