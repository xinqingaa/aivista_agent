/**
 * 基础聊天界面组件
 * 提供文本输入、消息展示和 SSE 连接功能
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { useAgentChat } from '@/hooks/useSSE';
import {
  ThoughtLogEvent,
  EnhancedPromptEvent,
  ThoughtLogEventData,
  EnhancedPromptEventData,
  GenUIComponentEventData,
} from '@/lib/types/sse';
import { ThoughtLogItem } from './ThoughtLogItem';
import { EnhancedPromptView } from './EnhancedPromptView';
import { ImageView } from './ImageView';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  title?: string;
  placeholder?: string;
  onChatEnd?: () => void;
}

interface GeneratedImage {
  url: string;
  prompt?: string;
  actions?: any[];
}

export function ChatInterface({
  title = 'AI 创作助手',
  placeholder = '输入你的创意，让 AI 来实现...',
  onChatEnd,
}: ChatInterfaceProps) {
  // 状态管理
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }>>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Agent 状态流
  const [thoughtLogs, setThoughtLogs] = useState<ThoughtLogEvent[]>([]);
  const [enhancedPrompt, setEnhancedPrompt] = useState<EnhancedPromptEvent | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { sendMessage } = useAgentChat({
    onChatStart: () => {
      setIsProcessing(true);
      setThoughtLogs([]);
      setEnhancedPrompt(null);
      setGeneratedImages([]);
    },
    onThoughtLog: (data: ThoughtLogEventData) => {
      setThoughtLogs(prev => [...prev, {
        type: 'thought_log',
        timestamp: Date.now(),
        data,
      } as ThoughtLogEvent]);
    },
    onEnhancedPrompt: (data: EnhancedPromptEventData) => {
      setEnhancedPrompt({
        type: 'enhanced_prompt',
        timestamp: Date.now(),
        data,
      } as EnhancedPromptEvent);
    },
    onGenUIComponent: (data: GenUIComponentEventData) => {
      if (data.widgetType === 'ImageView') {
        const imageUrl = data.props.imageUrl || data.props.url;
        if (imageUrl) {
          setGeneratedImages(prev => [...prev, {
            url: imageUrl,
            prompt: data.props.prompt,
          }]);
        }
      }

      if (data.widgetType === 'ActionPanel') {
        // 这里的关键修复：将 actions 附加到最后一张图片上
        setGeneratedImages(prev => {
          if (prev.length === 0) return prev;
          const newImages = [...prev];
          const lastIndex = newImages.length - 1;
          newImages[lastIndex] = {
            ...newImages[lastIndex],
            actions: data.props.actions
          };
          return newImages;
        });
      }
    },
    onChatEnd: () => {
      setIsProcessing(false);
      onChatEnd?.();
    },
    onStatusChange: (status) => {
      if (status === 'idle' && !isProcessing) {
        // Reset logic if needed
      }
    },
  });

  // 自动滚动
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughtLogs, enhancedPrompt, generatedImages, messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }]);

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
    <div className="flex flex-col h-full bg-background/50 relative">
      {/* 聊天内容区域 */}
      <div 
        className="flex-1 overflow-y-auto min-h-0 p-4 scroll-smooth" 
        ref={scrollRef}
      >
        <div className="mx-auto space-y-8 pb-4">
          
          {/* 欢迎/空状态 */}
          {messages.length === 0 && thoughtLogs.length === 0 && !isProcessing && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">AI 创作助手</h2>
                <p className="text-muted-foreground max-w-md">
                  输入你的创意，我会帮你完成意图识别、风格检索、任务执行全流程
                </p>
              </div>
            </div>
          )}

          {/* 消息流 */}
          {messages.map((message) => (
            <div key={message.id} className="flex justify-end animate-in slide-in-from-bottom-2">
              <div className="max-w-[85%] bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {/* Agent 响应区域 */}
          {(thoughtLogs.length > 0 || isProcessing) && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* 1. 思考过程 (Timeline) */}
              <div className="pl-2">
                 <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                   <div className={cn("w-2 h-2 rounded-full", isProcessing ? "bg-blue-500 animate-pulse" : "bg-muted")} />
                   AI 思考过程
                 </div>
                 <div className="ml-1 pl-4 border-l-2 border-muted/50 space-y-0">
                    {thoughtLogs.map((log, index) => (
                      <ThoughtLogItem 
                        key={index} 
                        log={log} 
                        isLast={index === thoughtLogs.length - 1} 
                      />
                    ))}
                    {isProcessing && thoughtLogs.length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 pl-6">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        正在分析意图...
                      </div>
                    )}
                 </div>
              </div>

              {/* 2. 增强 Prompt */}
              {enhancedPrompt && (
                <EnhancedPromptView event={enhancedPrompt} />
              )}

              {/* 3. 生成结果 */}
              {generatedImages.length > 0 && (
                <div className="space-y-6">
                  {generatedImages.map((image, index) => (
                    <div key={index} className="animate-in zoom-in-50 duration-500">
                      <ImageView
                        url={image.url}
                        prompt={image.prompt}
                        actions={image.actions}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* 底部输入框 - 固定定位 */}
      <div className="flex-shrink-0 bg-background/80 backdrop-blur-md border-t p-4 pb-6 z-20">
        <div className="mx-auto relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isProcessing}
            className="min-h-[52px] max-h-[200px] resize-none pr-14 py-3.5 rounded-xl shadow-sm border-muted-foreground/20 focus-visible:ring-blue-500/20"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            size="icon"
            className={cn(
              "absolute right-1.5 top-1.5 h-10 w-10 rounded-lg transition-all",
              input.trim() ? "bg-blue-600 hover:bg-blue-700" : "bg-muted text-muted-foreground hover:bg-muted"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
          <div className="text-[10px] text-muted-foreground mt-2 text-center opacity-70">
            AiVista Agent • 由大型语言模型驱动
          </div>
        </div>
      </div>
    </div>
  );
}
