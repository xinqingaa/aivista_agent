/**
 * AgentMessage 组件
 * 展示 AI 的文本回复，支持 success/loading/failed 状态
 */

'use client';

import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentMessageProps } from '@/lib/types/genui';

export function AgentMessage({ text, state = 'success', isThinking = false }: AgentMessageProps) {
  const isProcessing = state === 'loading' || isThinking;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        state === 'success' && 'border-muted/50 bg-muted/20',
        state === 'loading' && 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30',
        state === 'failed' && 'border-destructive/50 bg-destructive/10'
      )}
    >
      {/* 状态图标 */}
      <div className="flex-shrink-0 mt-0.5">
        {isProcessing && (
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" aria-hidden />
        )}
        {state === 'success' && !isProcessing && (
          <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" aria-hidden />
        )}
        {state === 'failed' && (
          <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
        )}
      </div>

      {/* 消息文本 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
