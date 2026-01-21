/**
 * 功能按钮组件
 * 提供重新生成、预览、下载、复制等操作
 */

'use client';

import { useState } from 'react';
import { RefreshCw, Eye, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ActionButtonsProps {
  onRegenerate?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ActionButtons({
  onRegenerate,
  onPreview,
  onDownload,
  onCopy,
  className,
  disabled = false,
}: ActionButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={disabled}
          className="gap-2 h-8"
          title="重新生成"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="text-xs">重新生成</span>
        </Button>
      )}

      {onPreview && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreview}
          disabled={disabled}
          className="gap-2 h-8"
          title="预览"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="text-xs">预览</span>
        </Button>
      )}

      {onDownload && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          disabled={disabled}
          className="gap-2 h-8"
          title="下载"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">下载</span>
        </Button>
      )}

      {onCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          disabled={disabled}
          className="gap-2 h-8"
          title="复制"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="text-xs">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="text-xs">复制</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * 图片操作按钮组件
 * 专门用于 ImageView 组件的操作
 */
interface ImageActionButtonsProps {
  imageUrl: string;
  conversationId?: string;
  className?: string;
}

export function ImageActionButtons({
  imageUrl,
  conversationId,
  className,
}: ImageActionButtonsProps) {
  const { toast } = useToast();

  const handlePreview = () => {
    window.open(imageUrl, '_blank');
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aivista_image_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: '下载成功',
        description: '图片已保存到本地',
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: '下载失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(imageUrl);
    toast({
      title: '复制成功',
      description: '图片链接已复制到剪贴板',
    });
  };

  const handleRegenerate = async () => {
    if (!conversationId) {
      toast({
        title: '重新生成失败',
        description: '未找到会话ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      // TODO: 实现重新生成逻辑（需要后端支持）
      toast({
        title: '重新生成',
        description: '功能开发中...',
      });
    } catch (error) {
      console.error('Regenerate failed:', error);
      toast({
        title: '重新生成失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  return (
    <ActionButtons
      onRegenerate={handleRegenerate}
      onPreview={handlePreview}
      onDownload={handleDownload}
      onCopy={handleCopyUrl}
      className={className}
    />
  );
}
