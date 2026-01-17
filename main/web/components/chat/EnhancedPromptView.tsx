/**
 * EnhancedPrompt 展示组件
 * 显示 RAG 检索结果和增强后的 Prompt
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedPromptEvent } from '@/lib/types/sse';
import { Search, Sparkles } from 'lucide-react';

interface EnhancedPromptViewProps {
  event: EnhancedPromptEvent;
}

export function EnhancedPromptView({ event }: EnhancedPromptViewProps) {
  const { original, retrieved, final } = event.data;

  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 text-purple-500" />
          RAG 风格检索结果
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 原始 Prompt */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            原始 Prompt
          </div>
          <div className="text-sm bg-muted/50 p-2.5 rounded-md border">
            {original}
          </div>
        </div>

        {/* 检索到的风格 */}
        {retrieved && retrieved.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              检索到的风格 ({retrieved.length})
            </div>
            <div className="space-y-2">
              {retrieved.map((item, index) => (
                <div
                  key={index}
                  className="border-l-2 border-purple-400 dark:border-purple-600 pl-3 py-2 bg-purple-50/50 dark:bg-purple-950/30 rounded-r"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{item.style}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(item.similarity * 100).toFixed(0)}% 相似
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {item.prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 增强后的 Prompt */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            增强后的 Prompt
          </div>
          <div className="text-sm bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200/50 dark:border-blue-800/50">
            {final}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
