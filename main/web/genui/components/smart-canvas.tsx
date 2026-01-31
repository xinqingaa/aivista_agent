/**
 * SmartCanvas 组件（简易版，后续完善 draw_mask 蒙版绘制）
 * 用于展示图片，支持 view 与 draw_mask 模式
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SmartCanvasProps } from '@/lib/types/genui';

export function SmartCanvas({
  imageUrl,
  mode = 'view',
  ratio,
}: SmartCanvasProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (mode === 'draw_mask') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-6 text-center">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          蒙版绘制功能即将推出
        </p>
        <img
          src={imageUrl}
          alt="Canvas"
          className="mt-4 max-h-[300px] object-contain mx-auto rounded"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-muted',
        ratio && 'aspect-[1/1] max-w-md'
      )}
      style={ratio ? { aspectRatio: `1/${ratio}` } : undefined}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        </div>
      )}
      <img
        src={imageUrl}
        alt="Canvas"
        className={cn(
          'max-h-[500px] w-full object-contain transition-opacity',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
