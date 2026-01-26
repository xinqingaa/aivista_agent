/**
 * 基础聊天界面组件
 * 使用 GenUI 协议驱动的动态渲染系统
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles, ArrowDown } from 'lucide-react';
import { useAgentChat } from '@/hooks/use-sse';
import { useConversationStore } from '@/stores/conversation-store';
import {
  ThoughtLogEventData,
  EnhancedPromptEventData,
  GenUIComponentEventData,
} from '@/lib/types/sse';
import {
  GenUIComponent,
  GenUIRenderer,
  generateComponentId,
  ensureGenUIRegistryInitialized,
  ActionItem,
} from '@/genui';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  title?: string;
  placeholder?: string;
  onChatEnd?: () => void;
}

/**
 * 渲染 GenUI 组件
 * 支持 ThoughtLogItem 的时间轴布局和 ActionPanel 与 ImageView 的关联
 */
function GenUIComponentRenderer({ 
  components, 
  isProcessing,
  onImageLoad
}: { 
  components: GenUIComponent[];
  isProcessing: boolean;
  onImageLoad: () => void;
}) {
  // 确保注册表已初始化
  useEffect(() => {
    ensureGenUIRegistryInitialized();
  }, []);

  // 分离不同类型的组件用于特殊布局处理
  const thoughtLogs = components.filter(c => c.widgetType === 'ThoughtLogItem');
  const enhancedPrompts = components.filter(c => c.widgetType === 'EnhancedPromptView');
  const images = components.filter(c => c.widgetType === 'ImageView');
  
  // 获取最后一个 ImageView 的 ID，用于 ActionPanel 关联
  const lastImageId = images.length > 0 ? images[images.length - 1].id : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. 思考过程 (Timeline) */}
      {(thoughtLogs.length > 0 || isProcessing) && (
        <div className="pl-2">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full", isProcessing ? "bg-blue-500 animate-pulse" : "bg-muted")} />
            AI 思考过程
          </div>
          <div className="ml-1 pl-4 border-l-2 border-muted/50 space-y-0">
            {thoughtLogs.map((component, index) => {
              // 为 ThoughtLogItem 注入 isLast 属性
              const isLast = index === thoughtLogs.length - 1;
              const propsWithIsLast = {
                ...component.props,
                isLast,
              };
              
              return (
                <GenUIRenderer
                  key={component.id || `thought-${index}`}
                  component={{
                    ...component,
                    props: propsWithIsLast,
                  }}
                />
              );
            })}
            {isProcessing && thoughtLogs.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 pl-6">
                <Loader2 className="w-3 h-3 animate-spin" />
                正在分析意图...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. 增强 Prompt */}
      {enhancedPrompts.map((component, index) => (
        <GenUIRenderer
          key={component.id || `enhanced-${index}`}
          component={component}
        />
      ))}

      {/* 3. 生成结果（图片 + 关联的 ActionPanel） */}
      {images.length > 0 && (
        <div className="space-y-6">
          {images.map((imageComponent, index) => {
            // 查找是否有关联的 ActionPanel
            const relatedActionPanel = components.find(
              c => c.widgetType === 'ActionPanel' && 
                   (c.targetId === imageComponent.id || 
                    (index === images.length - 1 && !c.targetId))
            );
            
            // 如果有关联的 ActionPanel，将 actions 合并到 ImageView
            // 使用类型断言处理联合类型
            const actionPanelProps = relatedActionPanel?.props as { actions?: ActionItem[] } | undefined;
            const imageProps = actionPanelProps?.actions 
              ? { ...imageComponent.props, actions: actionPanelProps.actions }
              : imageComponent.props;
            const originalOnLoad = (imageProps as { onLoad?: () => void }).onLoad;
            const imagePropsWithLoad = {
              ...imageProps,
              onLoad: () => {
                originalOnLoad?.();
                onImageLoad();
              },
            };
            
            return (
              <div key={imageComponent.id || `image-${index}`} className="animate-in zoom-in-50 duration-500">
                <GenUIRenderer
                  component={{
                    ...imageComponent,
                    props: imagePropsWithLoad as GenUIComponent['props'],
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChatInterface({
  title = 'AI 创作助手',
  placeholder = '输入你的创意，让 AI 来实现...',
  onChatEnd,
}: ChatInterfaceProps) {
  // === Store 集成 ===
  const {
    getActiveConversation,
    activeConversationId,
    createConversation,
    addMessage,
    addGenUIComponent: addGenUIComponentToStore,
    updateGenUIComponent: updateGenUIComponentInStore,
    clearGenUIComponents,
    updateConversation,
  } = useConversationStore();

  // 获取当前活跃会话
  const activeConversation = getActiveConversation();
  
  // 使用 Store 中的数据
  const messages = activeConversation?.messages || [];
  const genUIComponents = activeConversation?.genUIComponents || [];

  // 本地 UI 状态
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 初始化：如果没有活跃对话，创建一个
  useEffect(() => {
    if (!activeConversationId) {
      createConversation('新对话');
    }
  }, [activeConversationId, createConversation]);

  // 添加 GenUI 组件的回调
  const addGenUIComponent = useCallback(async (component: GenUIComponent) => {
    if (activeConversationId) {
      await addGenUIComponentToStore(activeConversationId, component);
    }
  }, [activeConversationId, addGenUIComponentToStore]);

  // 更新 GenUI 组件的回调（根据 updateMode）
  const updateGenUIComponent = useCallback(async (component: GenUIComponent) => {
    if (!activeConversationId) return;

    const updateMode = component.updateMode || 'append';
    
    switch (updateMode) {
      case 'replace':
      case 'update':
        if (component.id) {
          await updateGenUIComponentInStore(activeConversationId, component.id, component);
        } else {
          await addGenUIComponentToStore(activeConversationId, component);
        }
        break;
      case 'append':
      default:
        await addGenUIComponentToStore(activeConversationId, component);
    }
  }, [activeConversationId, addGenUIComponentToStore, updateGenUIComponentInStore]);

  const { sendMessage } = useAgentChat({
    onConnection: async (data) => {
      // 更新 activeConversationId 为后端返回的 ID
      if (data.conversationId && data.conversationId !== activeConversationId) {
        // 需要更新 store 中的 activeConversationId
        useConversationStore.setState({
          activeConversationId: data.conversationId,
        });
      }
    },
    onChatStart: async () => {
      setIsProcessing(true);

      // 确保有活跃对话
      let currentId = activeConversationId;
      if (!currentId) {
        currentId = await createConversation('新对话');
      }

      // 清空当前对话的 GenUI 组件（保留历史消息）
      if (currentId) {
        await clearGenUIComponents(currentId);
      }
    },
    onThoughtLog: async (data: ThoughtLogEventData) => {
      // 将 thought_log 事件转换为 ThoughtLogItem 组件并保存到 Store
      await addGenUIComponent({
        id: generateComponentId('thought'),
        widgetType: 'ThoughtLogItem',
        props: {
          node: data.node,
          message: data.message,
          progress: data.progress,
          metadata: data.metadata,
          timestamp: Date.now(),
        },
      });
    },
    onEnhancedPrompt: async (data: EnhancedPromptEventData) => {
      // 将 enhanced_prompt 事件转换为 EnhancedPromptView 组件并保存到 Store
      await addGenUIComponent({
        id: generateComponentId('enhanced'),
        widgetType: 'EnhancedPromptView',
        props: {
          original: data.original,
          retrieved: data.retrieved,
          final: data.final,
        },
      });
    },
    onGenUIComponent: async (data: GenUIComponentEventData) => {
      // 直接添加 GenUI 组件到 Store
      const component: GenUIComponent = {
        id: data.id || generateComponentId(data.widgetType.toLowerCase()),
        widgetType: data.widgetType as GenUIComponent['widgetType'],
        props: data.props as GenUIComponent['props'],
        updateMode: data.updateMode,
        targetId: data.targetId,
      };
      
      if (data.updateMode && data.updateMode !== 'append') {
        await updateGenUIComponent(component);
      } else {
        await addGenUIComponent(component);
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

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom < 20;
    setIsAutoScroll(isNearBottom);
    setShowScrollToBottom(distanceToBottom > 300);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAutoScroll(true);
    setShowScrollToBottom(false);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (isAutoScroll) {
        scrollToBottom();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isAutoScroll, scrollToBottom]);

  // 自动滚动（仅在开启自动置底时）
  useEffect(() => {
    if (!isAutoScroll) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [genUIComponents, messages, isAutoScroll]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    // 确保有活跃对话
    let currentId = activeConversationId;
    if (!currentId) {
      currentId = await createConversation('新对话');
    }

    // 添加用户消息到 Store
    if (currentId) {
      await addMessage(currentId, {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });

      // 如果是第一条消息，更新对话标题
      if (activeConversation && activeConversation.messages.length === 0) {
        const newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
        await updateConversation(currentId, { title: newTitle });
      }
    }

    // 发送消息到后端（传递 conversationId）
    sendMessage(text, { conversationId: currentId });
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
        onScroll={handleScroll}
      >
        <div className="mx-auto space-y-8 pb-4">
          
          {/* 欢迎/空状态 */}
          {messages.length === 0 && genUIComponents.length === 0 && !isProcessing && (
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

          {/* Agent 响应区域 - 使用 GenUI 渲染器 */}
          {(genUIComponents.length > 0 || isProcessing) && (
            <GenUIComponentRenderer 
              components={genUIComponents}
              isProcessing={isProcessing}
              onImageLoad={scrollToBottom}
            />
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {showScrollToBottom && (
        <div className="absolute bottom-32 right-6 z-30">
          <Button
            size="icon"
            variant="secondary"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
            className="h-8 w-8  shadow-lg"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        </div>
      )}

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
