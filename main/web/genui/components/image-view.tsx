/**
 * ImageView 组件
 * 显示生成的图片
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { ImageViewProps } from '@/lib/types/genui';

export function ImageView({ imageUrl, prompt, alt = 'Generated Image', onLoad, onError }: ImageViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setError('图片加载失败');
    onError?.(new Error('图片加载失败'));
  };

  return (
    <Card className="overflow-hidden mx-auto">
      <CardContent className="p-0">
        {/* 图片容器 - 最大高度 200px */}
        <div className="relative bg-muted max-h-[200px] overflow-hidden flex items-center justify-start">
          {/* 加载状态 */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center min-h-[120px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="flex items-center justify-center min-h-[120px] bg-destructive/10 p-4">
              <div className="text-center">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* 图片 - block 避免 inline 导致 max-height 失效 */}
          {!error && (
            <img
              src={imageUrl}
              alt={alt}
              onLoad={handleLoad}
              onError={handleError}
              className={`block max-w-full max-h-[200px] w-auto h-auto object-contain transition-opacity ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />
          )}
        </div>

        {/* 底部：仅在有 prompt 时展示 */}
        {!isLoading && !error && prompt && (
          <div className="border-t bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {prompt}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
