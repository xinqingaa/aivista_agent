/**
 * 工作流进度条组件
 * 显示 Agent 工作流的执行进度
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface WorkflowNode {
  name: string;
  label: string;
  status: NodeStatus;
  progress?: number;
}

interface WorkflowProgressProps {
  nodes: WorkflowNode[];
}

const NODE_CONFIG: Record<string, { label: string; color: string }> = {
  planner: { label: '意图识别', color: 'text-blue-500' },
  rag: { label: '风格检索', color: 'text-purple-500' },
  executor: { label: '任务执行', color: 'text-green-500' },
  critic: { label: '质量审查', color: 'text-orange-500' },
  genui: { label: '生成界面', color: 'text-cyan-500' },
};

export function WorkflowProgress({ nodes }: WorkflowProgressProps) {
  const completedCount = nodes.filter((n) => n.status === 'completed').length;
  const totalCount = nodes.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* 总体进度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">工作流执行进度</span>
          <Badge variant="secondary">
            {completedCount}/{totalCount}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* 节点状态 */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {nodes.map((node) => {
          const config = NODE_CONFIG[node.name] || {
            label: node.name,
            color: 'text-gray-500',
          };

          return (
            <div
              key={node.name}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border bg-card min-w-[120px]',
                node.status === 'running' && 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30',
                node.status === 'completed' && 'border-green-500 bg-green-50/50 dark:bg-green-950/30',
                node.status === 'failed' && 'border-red-500 bg-red-50/50 dark:bg-red-950/30'
              )}
            >
              {/* 状态图标 */}
              {node.status === 'pending' && (
                <Circle className="h-4 w-4 text-gray-400" />
              )}
              {node.status === 'running' && (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              )}
              {node.status === 'completed' && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {node.status === 'failed' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}

              {/* 节点名称 */}
              <span className={cn('text-xs font-medium', config.color)}>
                {config.label}
              </span>

              {/* 进度 */}
              {node.status === 'running' && node.progress !== undefined && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {node.progress}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
