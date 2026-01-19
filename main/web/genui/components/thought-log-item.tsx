/**
 * 思考日志项组件
 * 显示 Agent 节点的思考过程
 * 风格：简约时间轴风格
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Loader2, 
  Brain, 
  Search, 
  Zap, 
  Eye, 
  Terminal 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThoughtLogItemProps } from '@/lib/types/genui';

export function ThoughtLogItem({ node, message, progress, metadata, timestamp, isLast }: ThoughtLogItemProps) {
  // 节点配置 - 统一使用紫色/蓝色作为主色调，灰色作为辅助
  const nodeConfig = {
    planner: {
      label: '意图识别',
      icon: Brain,
    },
    rag: {
      label: '风格检索',
      icon: Search,
    },
    executor: {
      label: '任务执行',
      icon: Zap,
    },
    critic: {
      label: '质量审查',
      icon: Eye,
    },
    genui: {
      label: '界面生成',
      icon: Terminal,
    },
  };

  const config = nodeConfig[node as keyof typeof nodeConfig] || { label: node, icon: Terminal };
  const Icon = config.icon;
  const isProcessing = progress !== undefined && progress < 100;

  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* 连接线 */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border/50" />
      )}

      {/* 节点图标 */}
      <div className={cn(
        "absolute left-0 top-0.5 w-[22px] h-[22px] rounded-full border flex items-center justify-center bg-background z-10",
        isProcessing ? "border-blue-500 text-blue-500" : "border-muted-foreground/30 text-muted-foreground"
      )}>
        {isProcessing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Icon className="w-3 h-3" />
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium",
              isProcessing ? "text-foreground" : "text-muted-foreground"
            )}>
              {config.label}
            </span>
            {metadata?.confidence && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {(metadata.confidence * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground/50 tabular-nums">
            {timestamp ? new Date(timestamp).toLocaleTimeString() : ''}
          </span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>

        {/* 进度条 - 仅在处理中显示 */}
        {isProcessing && progress !== undefined && (
          <div className="w-full bg-secondary h-1 mt-1 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* 元数据展示 */}
        {metadata && Object.keys(metadata).length > 0 && !metadata.confidence && (
           <div className="mt-1 text-xs text-muted-foreground/70 bg-secondary/30 p-2 rounded border border-border/50 font-mono">
             {JSON.stringify(metadata, null, 2)}
           </div>
        )}
      </div>
    </div>
  );
}
