# Agent 工作流前端实现 (Agent Workflow Frontend)

## 1. 概述

本文档详细说明如何在前端展示 Agent 工作流的执行过程，包括思考日志、节点状态、进度展示等。

### 1.1 实现状态

**已完成** ✅：
- SSE 客户端和事件处理（`lib/sse/`、`hooks/useSSE.ts`）
- 聊天界面主组件（`components/chat/ChatInterface.tsx`）
- 思考日志展示组件（`components/chat/ThoughtLogItem.tsx`）
- 增强 Prompt 展示组件（`components/chat/EnhancedPromptView.tsx`）
- 图片展示组件（`components/chat/ImageView.tsx`）
- 测试页面和指南（`app/chat/page.tsx`、`components/chat/TestGuideDialog.tsx`）

**详见**: [SSE 实现总结](../sse-implementation-summary.md)

**规划中** 📋：
- 高级工作流可视化组件（`components/features/AgentWorkflow/`）
- 节点状态卡片组件
- 工作流时间线组件
- 更详细的进度展示

## 2. 工作流节点

### 2.1 节点类型

根据后端设计，Agent 工作流包含以下节点：

1. **Planner Node**: 意图识别
2. **RAG Node**: 风格检索
3. **Executor Node**: 任务执行
4. **Critic Node**: 质量审查

### 2.2 节点状态

```typescript
// 节点状态类型
type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

interface NodeState {
  name: string;
  status: NodeStatus;
  message?: string;
  progress?: number;
  startTime?: number;
  endTime?: number;
}
```

## 3. 组件设计

### 3.1 组件结构

**已完成组件**（位于 `components/chat/`）：
```
chat/
├── ChatInterface.tsx         # 聊天界面主组件（已完成）
├── ThoughtLogItem.tsx        # 思考日志展示组件（已完成）
├── EnhancedPromptView.tsx    # 增强 Prompt 展示（已完成）
├── ImageView.tsx             # 图片展示组件（已完成）
├── TestGuideDialog.tsx       # 测试指南对话框（已完成）
└── WorkflowProgress.tsx      # 工作流进度组件（已完成）
```

**规划中的组件**（位于 `components/features/AgentWorkflow/`）：
```
AgentWorkflow/
├── WorkflowViewer.tsx        # 工作流可视化组件
├── NodeStatus.tsx            # 节点状态组件
├── ProgressBar.tsx           # 进度条组件
└── WorkflowTimeline.tsx      # 工作流时间线
```

### 3.2 工作流可视化组件

```typescript
// components/features/AgentWorkflow/WorkflowViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { ThoughtLogEvent, EnhancedPromptEvent, ProgressEvent, ErrorEvent } from '@/lib/types/sse';
import { NodeStatus } from './NodeStatus';
import { ThoughtLog } from './ThoughtLog';
import { ProgressBar } from './ProgressBar';
import { EnhancedPromptView } from './EnhancedPromptView';

export function WorkflowViewer() {
  const [nodes, setNodes] = useState<Map<string, NodeState>>(new Map());
  const [thoughtLogs, setThoughtLogs] = useState<ThoughtLogEvent[]>([]);
  const [enhancedPrompt, setEnhancedPrompt] = useState<EnhancedPromptEvent | null>(null);

  const { isConnected, error } = useSSE({
    url: '/api/agent/chat',
    onMessage: (event) => {
      switch (event.type) {
        case 'thought_log': {
          const log = event as ThoughtLogEvent;
          
          // 更新节点状态
          setNodes((prev) => {
            const newNodes = new Map(prev);
            const nodeName = log.data.node;
            
            if (!newNodes.has(nodeName)) {
              newNodes.set(nodeName, {
                name: nodeName,
                status: 'running',
                startTime: Date.now(),
              });
            }
            
            const node = newNodes.get(nodeName)!;
            node.message = log.data.message;
            node.progress = log.data.progress;
            
            if (node.progress === 100) {
              node.status = 'completed';
              node.endTime = Date.now();
            }
            
            return newNodes;
          });
          
          // 添加思考日志
          setThoughtLogs((prev) => [...prev, log]);
          break;
        }

        case 'enhanced_prompt': {
          // 存储增强 Prompt 信息
          setEnhancedPrompt(event as EnhancedPromptEvent);
          break;
        }

        case 'progress': {
          // 更新进度（可选）
          const progressEvent = event as ProgressEvent;
          // 可以更新对应节点的进度
          break;
        }

        case 'error': {
          // 处理错误
          const errorEvent = event as ErrorEvent;
          setNodes((prev) => {
            const newNodes = new Map(prev);
            if (errorEvent.data.node) {
              const node = newNodes.get(errorEvent.data.node);
              if (node) {
                node.status = 'failed';
                node.message = errorEvent.data.message;
              }
            }
            return newNodes;
          });
          break;
        }
      }
    },
  });

  const nodeOrder = ['planner', 'rag', 'executor', 'critic'];

  return (
    <div className="space-y-4">
      {/* 节点状态 */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {nodeOrder.map((nodeName) => {
          const node = nodes.get(nodeName);
          return (
            <NodeStatus
              key={nodeName}
              name={nodeName}
              status={node?.status || 'pending'}
              message={node?.message}
              progress={node?.progress}
            />
          );
        })}
      </div>

      {/* 进度条 */}
      {nodes.size > 0 && (
        <ProgressBar
          total={nodeOrder.length}
          completed={Array.from(nodes.values()).filter(
            (n) => n.status === 'completed'
          ).length}
        />
      )}

      {/* 增强 Prompt 展示 */}
      {enhancedPrompt && (
        <div className="mb-4">
          <EnhancedPromptView event={enhancedPrompt} />
        </div>
      )}

      {/* 思考日志 */}
      <div className="space-y-2">
        <h3 className="font-semibold">思考日志</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {thoughtLogs.map((log, index) => (
            <ThoughtLog key={index} log={log} />
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3">
          错误: {error.message}
        </div>
      )}
    </div>
  );
}
```

### 3.3 节点状态组件

```typescript
// components/features/AgentWorkflow/NodeStatus.tsx
'use client';

import { NodeStatus as NodeStatusType } from '@/lib/types';

const NODE_LABELS: Record<string, string> = {
  planner: '意图识别',
  rag: '风格检索',
  executor: '任务执行',
  critic: '质量审查',
  genui: '生成界面',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-200 text-gray-600',
  running: 'bg-blue-500 text-white animate-pulse',
  completed: 'bg-green-500 text-white',
  failed: 'bg-red-500 text-white',
};

interface NodeStatusProps {
  name: string;
  status: NodeStatusType;
  message?: string;
  progress?: number;
}

export function NodeStatus({
  name,
  status,
  message,
  progress,
}: NodeStatusProps) {
  return (
    <div className="flex-shrink-0 w-32 border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-3 h-3 rounded-full ${
            STATUS_COLORS[status] || STATUS_COLORS.pending
          }`}
        />
        <span className="text-sm font-medium">
          {NODE_LABELS[name] || name}
        </span>
      </div>
      
      {message && (
        <div className="text-xs text-gray-600 mb-2 line-clamp-2">
          {message}
        </div>
      )}
      
      {progress !== undefined && status === 'running' && (
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-500 h-1 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

### 3.4 思考日志组件

```typescript
// components/features/AgentWorkflow/ThoughtLog.tsx
'use client';

import { ThoughtLogEvent } from '@/lib/types/sse';

interface ThoughtLogProps {
  log: ThoughtLogEvent;
}

const NODE_LABELS: Record<string, string> = {
  planner: '意图识别',
  rag: '风格检索',
  executor: '任务执行',
  critic: '质量审查',
  genui: '生成界面',
};

export function ThoughtLog({ log }: ThoughtLogProps) {
  const { node, message, progress, metadata } = log.data;

  return (
    <div className="flex items-start gap-2 text-sm border-l-2 border-blue-500 pl-3 py-1">
      <div className="flex-shrink-0">
        <span className="font-medium text-blue-600">
          [{NODE_LABELS[node] || node}]
        </span>
      </div>
      <div className="flex-1">
        <div>{message}</div>
        {progress !== undefined && (
          <div className="mt-1">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{progress}%</div>
          </div>
        )}
        {metadata && (
          <div className="mt-1 text-xs text-gray-500">
            {metadata.action && <span>动作: {metadata.action}</span>}
            {metadata.confidence !== undefined && (
              <span className="ml-2">置信度: {(metadata.confidence * 100).toFixed(0)}%</span>
            )}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-400">
        {new Date(log.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
```

### 3.5 进度条组件

```typescript
// components/features/AgentWorkflow/ProgressBar.tsx
'use client';

interface ProgressBarProps {
  total: number;
  completed: number;
}

export function ProgressBar({ total, completed }: ProgressBarProps) {
  const percentage = (completed / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>总体进度</span>
        <span>{completed}/{total} 节点完成</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### 3.6 工作流时间线

```typescript
// components/features/AgentWorkflow/WorkflowTimeline.tsx
'use client';

import { NodeState } from './WorkflowViewer';

interface WorkflowTimelineProps {
  nodes: Map<string, NodeState>;
}

const NODE_ORDER = ['planner', 'rag', 'executor', 'critic'];
const NODE_LABELS: Record<string, string> = {
  planner: '意图识别',
  rag: '风格检索',
  executor: '任务执行',
  critic: '质量审查',
};

export function WorkflowTimeline({ nodes }: WorkflowTimelineProps) {
  return (
    <div className="relative">
      {/* 时间线 */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      
      {/* 节点 */}
      <div className="space-y-6">
        {NODE_ORDER.map((nodeName, index) => {
          const node = nodes.get(nodeName);
          const status = node?.status || 'pending';
          
          return (
            <div key={nodeName} className="relative flex items-start gap-4">
              {/* 节点图标 */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                  status === 'completed'
                    ? 'bg-green-500'
                    : status === 'running'
                    ? 'bg-blue-500 animate-pulse'
                    : status === 'failed'
                    ? 'bg-red-500'
                    : 'bg-gray-300'
                }`}
              >
                {status === 'completed' && '✓'}
                {status === 'running' && '⟳'}
                {status === 'failed' && '✗'}
                {status === 'pending' && index + 1}
              </div>
              
              {/* 节点内容 */}
              <div className="flex-1">
                <div className="font-medium">{NODE_LABELS[nodeName]}</div>
                {node?.message && (
                  <div className="text-sm text-gray-600 mt-1">
                    {node.message}
                  </div>
                )}
                {node?.startTime && node?.endTime && (
                  <div className="text-xs text-gray-400 mt-1">
                    耗时: {((node.endTime - node.startTime) / 1000).toFixed(2)}s
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## 4. 集成到聊天界面

### 4.1 在聊天界面中展示

```typescript
// components/features/TextToImage/TextToImagePage.tsx
import { WorkflowViewer } from '@/components/features/AgentWorkflow/WorkflowViewer';

export function TextToImagePage() {
  const [showWorkflow, setShowWorkflow] = useState(false);

  return (
    <div>
      {/* 工作流查看器（可折叠） */}
      <div className="border-b p-2">
        <button
          onClick={() => setShowWorkflow(!showWorkflow)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {showWorkflow ? '隐藏' : '显示'}工作流详情
        </button>
      </div>

      {showWorkflow && (
        <div className="border-b p-4 bg-gray-50">
          <WorkflowViewer />
        </div>
      )}

      {/* 聊天内容 */}
      {/* ... */}
    </div>
  );
}
```

## 5. 增强 Prompt 展示

### 5.1 展示检索到的风格

```typescript
// components/features/AgentWorkflow/EnhancedPromptView.tsx
'use client';

import { EnhancedPromptEvent } from '@/lib/types/sse';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface EnhancedPromptViewProps {
  event: EnhancedPromptEvent;
}

export function EnhancedPromptView({ event }: EnhancedPromptViewProps) {
  const { original, retrieved, final } = event.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">RAG 检索结果</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">原始 Prompt</div>
          <div className="text-sm">{original}</div>
        </div>

        {retrieved.length > 0 && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              检索到的风格 ({retrieved.length})
            </div>
            <div className="space-y-2">
              {retrieved.map((item, index) => (
                <div
                  key={index}
                  className="border-l-2 border-green-400 dark:border-green-600 pl-3 py-2 bg-muted/50 rounded-r"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.style}</span>
                    <span className="text-xs text-muted-foreground">
                      相似度: {(item.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">增强后的 Prompt</div>
          <div className="text-sm bg-muted p-3 rounded border border-blue-400/30 dark:border-blue-600/30">
            {final}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.2 在消息列表中展示

```typescript
// 在 MessageList 中处理 enhanced_prompt
{messages.map((message) => (
  <div key={message.id}>
    {message.enhancedPrompt && (
      <EnhancedPromptView 
        event={{
          type: 'enhanced_prompt',
          timestamp: message.timestamp,
          data: message.enhancedPrompt,
        }}
      />
    )}
    {/* 其他消息内容 */}
  </div>
))}
```

## 6. 错误处理

### 6.1 节点错误展示

```typescript
// 在 NodeStatus 中展示错误
{status === 'failed' && (
  <div className="text-xs text-red-600 mt-1">
    执行失败
  </div>
)}
```

### 6.2 工作流错误恢复

```typescript
// 提供重试按钮
{error && (
  <button
    onClick={() => {
      // 重新发送请求
    }}
    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
  >
    重试工作流
  </button>
)}
```

## 7. 性能优化

### 7.1 思考日志虚拟滚动

对于大量思考日志，使用虚拟滚动：

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={300}
  itemCount={thoughtLogs.length}
  itemSize={60}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ThoughtLog log={thoughtLogs[index]} />
    </div>
  )}
</FixedSizeList>
```

## 8. 事件处理完整性

### 8.1 所有 SSE 事件处理

确保所有后端推送的事件都有对应的处理：

- ✅ `connection` - 连接确认，获取 sessionId
- ✅ `thought_log` - 思考日志，更新节点状态
- ✅ `enhanced_prompt` - 增强 Prompt，展示 RAG 检索结果
- ✅ `gen_ui_component` - GenUI 组件，动态渲染
- ✅ `progress` - 进度更新（可选）
- ✅ `error` - 错误处理，更新节点状态为 failed
- ✅ `stream_end` - 流结束
- ✅ `heartbeat` - 心跳事件（可选）

### 8.2 事件时序

严格按照后端事件时序处理：

```
connection → thought_log (planner) → thought_log (rag) → 
enhanced_prompt → thought_log (executor) → gen_ui_component → 
thought_log (critic) → stream_end
```

## 9. 相关文档

- [SSE 客户端实现](../api/SSE_CLIENT.md)
- [文生图功能](./TEXT_TO_IMAGE.md)
- [边界条件](./BOUNDARY_CONDITIONS.md)
- [配置文档](../development/CONFIGURATION.md)
- [后端工作流设计](../../../main/server/docs/workflow/AGENT_WORKFLOW_DESIGN.md)
