/**
 * 基础聊天界面组件
 * 提供文本输入、消息展示和 SSE 连接功能
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, User } from 'lucide-react';
import { useAgentChat } from '@/hooks/useSSE';
import {
  ThoughtLogEvent,
  EnhancedPromptEvent,
  GenUIComponentEvent,
  ThoughtLogEventData,
  EnhancedPromptEventData,
  GenUIComponentEventData,
} from '@/lib/types/sse';
import { ThoughtLogItem } from './ThoughtLogItem';
import { EnhancedPromptView } from './EnhancedPromptView';
import { ImageView } from './ImageView';
import { WorkflowProgress, type WorkflowNode } from './WorkflowProgress';

interface ChatInterfaceProps {
  /**
   * 标题
   */
  title?: string;

  /**
   * 占位符文本
   */
  placeholder?: string;

  /**
   * 聊天结束回调
   */
  onChatEnd?: () => void;
}

export function ChatInterface({
  title = 'AI 创作助手',
  placeholder = '输入你的创意，让 AI 来实现...',
  onChatEnd,
}: ChatInterfaceProps) {
  // 用户消息
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 思考日志
  const [thoughtLogs, setThoughtLogs] = useState<ThoughtLogEvent[]>([]);

  // Enhanced Prompt 数据
  const [enhancedPrompt, setEnhancedPrompt] = useState<EnhancedPromptEvent | null>(null);

  // 生成的图片 URL
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; prompt?: string }>>([]);

  // ActionPanel 数据
  const [actionPanels, setActionPanels] = useState<Map<number, any>>(new Map());

  // 工作流节点状态
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([
    { name: 'planner', label: '意图识别', status: 'pending' },
    { name: 'rag', label: '风格检索', status: 'pending' },
    { name: 'executor', label: '任务执行', status: 'pending' },
    { name: 'critic', label: '质量审查', status: 'pending' },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    status,
    sendMessage,
  } = useAgentChat({
    onChatStart: () => {
      setIsProcessing(true);
      setThoughtLogs([]);
      setEnhancedPrompt(null);
      setGeneratedImages([]);
      setWorkflowNodes([
        { name: 'planner', label: '意图识别', status: 'running' },
        { name: 'rag', label: '风格检索', status: 'pending' },
        { name: 'executor', label: '任务执行', status: 'pending' },
        { name: 'critic', label: '质量审查', status: 'pending' },
      ]);
    },
    onThoughtLog: (data: ThoughtLogEventData) => {
      setThoughtLogs(prev => {
        const newLogs = [...prev, {
          type: 'thought_log',
          timestamp: Date.now(),
          data,
        } as ThoughtLogEvent];
        return newLogs;
      });

      // 更新节点状态
      setWorkflowNodes(prev => {
        const newNode = [...prev];
        const nodeIndex = newNode.findIndex(n => n.name === data.node);
        if (nodeIndex !== -1) {
          newNode[nodeIndex] = {
            ...newNode[nodeIndex],
            status: 'completed',
          };

          // 下一个节点开始运行
          if (nodeIndex < newNode.length - 1) {
            newNode[nodeIndex + 1].status = 'running';
          }
        }
        return newNode;
      });
    },
    onEnhancedPrompt: (data: EnhancedPromptEventData) => {
      setEnhancedPrompt({
        type: 'enhanced_prompt',
        timestamp: Date.now(),
        data,
      } as EnhancedPromptEvent);
    },
    onGenUIComponent: (data: GenUIComponentEventData) => {
      // 处理 ImageView 组件
      if (data.widgetType === 'ImageView') {
        const imageUrl = data.props.imageUrl || data.props.url;
        if (imageUrl) {
          setGeneratedImages(prev => [...prev, {
            url: imageUrl,
            prompt: data.props.prompt,
          }]);
        }
      }

      // 处理 ActionPanel 组件
      if (data.widgetType === 'ActionPanel') {
        setActionPanels(prev => {
          const newMap = new Map(prev);
          newMap.set(generatedImages.length - 1, data.props.actions);
          return newMap;
        });
      }
    },
    onChatEnd: () => {
      setIsProcessing(false);
      if (onChatEnd) {
        onChatEnd();
      }
    },
    onStatusChange: (status) => {
      if (status === 'idle' && !isProcessing) {
        setThoughtLogs([]);
        setEnhancedPrompt(null);
        setGeneratedImages([]);
      }
    },
  });

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughtLogs, enhancedPrompt, generatedImages, messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    // 添加用户消息
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    sendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 聊天标题 */}
      <CardHeader className="border-b flex-shrink-0">
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>

      {/* 聊天内容区域 - 可滚动 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div ref={scrollRef} className="p-4 space-y-4">
            {/* 空状态 - 增强引导 */}
            {messages.length === 0 && thoughtLogs.length === 0 && !isProcessing && (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center animate-fade-in">
                <div className="relative mb-6">
                  <div className="text-6xl animate-bounce">✨</div>
                  <div className="absolute -top-2 -right-2 text-2xl animate-pulse">🎨</div>
                </div>
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  开始你的 AI 创作之旅
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  在下方输入框描述你的创意，AI 将为你生成独特的艺术作品
                </p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    <span>输入你的想法，按 Enter 发送</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>AI 将实时展示创作过程</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                    <span>几秒内即可生成精美图片</span>
                  </div>
                </div>
                {/* 向下箭头指示输入框 */}
                <div className="mt-8 animate-bounce">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
            )}

            {/* 用户消息 */}
            {messages.map((message) => (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5" />
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* 处理中提示 */}
            {isProcessing && thoughtLogs.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在思考中...
              </div>
            )}

            {/* 工作流进度 */}
            {isProcessing && thoughtLogs.length > 0 && (
              <WorkflowProgress nodes={workflowNodes} />
            )}

            {/* Enhanced Prompt 展示 */}
            {enhancedPrompt && (
              <div className="my-4">
                <EnhancedPromptView event={enhancedPrompt} />
              </div>
            )}

            {/* 思考日志 */}
            {thoughtLogs.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-2">
                  AI 思考过程
                </div>
                {thoughtLogs.map((log, index) => (
                  <ThoughtLogItem key={index} log={log} />
                ))}
              </div>
            )}

            {/* 生成的图片 */}
            {generatedImages.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  生成的图片
                </div>
                {generatedImages.map((image, index) => (
                  <ImageView
                    key={index}
                    url={image.url}
                    prompt={image.prompt}
                    alt={`Generated image ${index + 1}`}
                    actions={actionPanels.get(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 输入区域 - 固定底部 */}
      <div className="border-t bg-background flex-shrink-0">
        <div className="p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isProcessing}
              className="min-h-[60px] max-h-[200px] resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </div>
    </div>
  );
}
