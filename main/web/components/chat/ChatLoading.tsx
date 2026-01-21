/**
 * 聊天加载状态组件
 */

'use client';

import { Loader2 } from 'lucide-react';

export function ChatLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">AI 正在思考中...</span>
      </div>
    </div>
  );
}
