/**
 * ImageView 组件
 * 显示生成的图片
 */

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Download, ExternalLink, Loader2 } from 'lucide-react';

interface ImageViewProps {
  url: string;
  prompt?: string;
  alt?: string;
  actions?: Array<{
    id: string;
    label: string;
    type: 'button' | 'link';
    buttonType?: 'primary' | 'secondary' | 'outline';
  }>;
}

export function ImageView({ url, prompt, alt = 'Generated Image', actions }: ImageViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    // 创建一个临时链接来下载图片
    const link = document.createElement('a');
    link.href = url;
    link.download = `aivista-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('图片加载失败');
  };

  const handleAction = (actionId: string) => {
    if (actionId === 'regenerate_btn') {
      // 触发重新生成逻辑
      console.log('Regenerate clicked');
    }
  };

  return (
    <Card className="overflow-hidden mx-auto">
      <CardContent className="p-0">
        {/* 图片容器 - 限制最大高度 */}
        <div className="relative bg-muted">
          {/* 加载状态 */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="flex items-center justify-center min-h-[200px] bg-destructive/10">
              <div className="text-center p-4">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* 图片 */}
          {!error && (
            <img
              src={url}
              alt={alt}
              onLoad={handleLoad}
              onError={handleError}
              className={`w-full h-auto max-h-[500px] object-contain transition-opacity ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />
          )}
        </div>

        {/* 底部操作栏 - 始终可见 */}
        {!isLoading && !error && (
          <div className="border-t bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              {/* 左侧：Prompt */}
              {prompt && (
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                  {prompt}
                </p>
              )}
              
              {/* 右侧：操作按钮 */}
              <div className="flex gap-2 flex-shrink-0">
                {actions && actions.length > 0 ? (
                  actions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.buttonType === 'primary' ? 'default' : 'outline'}
                      onClick={() => handleAction(action.id)}
                    >
                      {action.label}
                    </Button>
                  ))
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownload}
                      className="gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      下载
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(url, '_blank')}
                      className="gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      查看
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
