/**
 * 思考日志项组件
 * 显示 Agent 节点的思考过程
 */

'use client';

import { ThoughtLogEvent } from '@/lib/types/sse';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle, Sparkles, Search, Cog, Eye } from 'lucide-react';

interface ThoughtLogItemProps {
  log: ThoughtLogEvent;
}

export function ThoughtLogItem({ log }: ThoughtLogItemProps) {
  const { node, message, progress, metadata } = log.data;

  // 节点配置
  const nodeConfig = {
    planner: {
      label: '意图识别',
      icon: Sparkles,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    rag: {
      label: '风格检索',
      icon: Search,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
    executor: {
      label: '任务执行',
      icon: Cog,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    critic: {
      label: '质量审查',
      icon: Eye,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
    genui: {
      label: '生成界面',
      icon: CheckCircle,
      color: 'text-teal-500',
      bgColor: 'bg-teal-50 dark:bg-teal-950',
      borderColor: 'border-teal-200 dark:border-teal-800',
    },
  };

  const config = nodeConfig[node as keyof typeof nodeConfig] || nodeConfig.executor;
  const Icon = config.icon;

  // 判断是否正在处理
  const isProcessing = progress !== undefined && progress < 100;

  return (
    <Card className={`border ${config.borderColor} ${config.bgColor} transition-all`}>
      <div className="flex items-start gap-3 p-3">
        {/* 图标 */}
        <div className={`flex-shrink-0 p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
          {isProcessing ? (
            <Loader2 className={`h-4 w-4 ${config.color} animate-spin`} />
          ) : (
            <Icon className={`h-4 w-4 ${config.color}`} />
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 节点名称和进度 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{config.label}</span>
            <Badge variant="outline" className="text-xs">
              {node}
            </Badge>
          </div>

          {/* 消息 */}
          <p className="text-sm text-muted-foreground mb-2">{message}</p>

          {/* 进度条 */}
          {progress !== undefined && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${config.color} transition-all duration-300`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {progress}%
              </div>
            </div>
          )}

          {/* 元数据 */}
          {metadata && (
            <div className="mt-2 space-y-1">
              {metadata.action && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">动作：</span>
                  <span className="ml-1">{metadata.action}</span>
                </div>
              )}
              {metadata.confidence !== undefined && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">置信度：</span>
                  <span className="ml-1">{(metadata.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(log.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
}

/**
 * 思考日志列表组件
 */
interface ThoughtLogListProps {
  logs: ThoughtLogEvent[];
}

export function ThoughtLogList({ logs }: ThoughtLogListProps) {
  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>AI 思考过程</span>
      </div>
      {logs.map((log, index) => (
        <ThoughtLogItem key={index} log={log} />
      ))}
    </div>
  );
}
