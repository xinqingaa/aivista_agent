/**
 * 聊天错误提示组件
 */

'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ChatError({ message, onRetry }: ChatErrorProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-sm">出错了</p>
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <RefreshCw className="h-4 w-4" />
          重试
        </Button>
      )}
    </div>
  );
}
