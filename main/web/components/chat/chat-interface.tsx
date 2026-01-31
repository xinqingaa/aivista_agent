/**
 * 基础聊天界面组件
 * 使用 GenUI 协议驱动的动态渲染系统
 * 集成会话管理功能
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles, ArrowDown } from 'lucide-react';
import { useAgentChat } from '@/hooks/use-sse';
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
} from '@/genui';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session-store';
import { MessageService } from '@/lib/services/message-service';
import { initDatabase } from '@/lib/db/database';

interface ChatInterfaceProps {
  title?: string;
  placeholder?: string;
  onChatEnd?: () => void;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  genUIComponents?: GenUIComponent[];
}

/**
 * 渲染 GenUI 组件
 * ThoughtLogItem 时间轴 | EnhancedPrompt | ImageView(s) | AgentMessage(s) | ActionPanel(底部)
 * ActionPanel 独立显示在底部，不合并到 ImageView
 */
function GenUIComponentRenderer({
  components,
  isProcessing,
  onImageLoad,
}: {
  components: GenUIComponent[];
  isProcessing: boolean;
  onImageLoad: () => void;
}) {
  useEffect(() => {
    ensureGenUIRegistryInitialized();
  }, []);

  const thoughtLogs = components.filter((c) => c.widgetType === 'ThoughtLogItem');
  const enhancedPrompts = components.filter((c) => c.widgetType === 'EnhancedPromptView');
  const images = components.filter((c) => c.widgetType === 'ImageView');
  const smartCanvases = components.filter((c) => c.widgetType === 'SmartCanvas');
  const agentMessages = components.filter((c) => c.widgetType === 'AgentMessage');
  const actionPanels = components.filter((c) => c.widgetType === 'ActionPanel');
  const lastActionPanel = actionPanels[actionPanels.length - 1];
  const lastImage = images[images.length - 1] ?? smartCanvases[smartCanvases.length - 1];
  const lastImageUrl = lastImage
    ? (lastImage.props as { imageUrl?: string }).imageUrl
    : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. 思考过程 (Timeline) */}
      {(thoughtLogs.length > 0 || isProcessing) && (
        <div className="pl-2">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-muted'
              )}
            />
            AI 思考过程
          </div>
          <div className="ml-1 pl-4 border-l-2 border-muted/50 space-y-0">
            {thoughtLogs.map((component, index) => {
              const isLast = index === thoughtLogs.length - 1;
              const propsWithIsLast = { ...component.props, isLast };
              return (
                <GenUIRenderer
                  key={component.id || `thought-${index}`}
                  component={{ ...component, props: propsWithIsLast }}
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
        <GenUIRenderer key={component.id || `enhanced-${index}`} component={component} />
      ))}

      {/* 3. 图片与 SmartCanvas */}
      {images.length > 0 && (
        <div className="space-y-6">
          {images.map((imageComponent, index) => {
            const imageProps = imageComponent.props as { onLoad?: () => void };
            const imagePropsWithLoad = {
              ...imageComponent.props,
              onLoad: () => {
                imageProps.onLoad?.();
                onImageLoad();
              },
            };
            return (
              <div
                key={imageComponent.id || `image-${index}`}
                className="animate-in zoom-in-50 duration-500"
              >
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
      {smartCanvases.map((component, index) => (
        <div
          key={component.id || `canvas-${index}`}
          className="animate-in zoom-in-50 duration-500"
        >
          <GenUIRenderer component={component} />
        </div>
      ))}

      {/* 4. Agent 消息 */}
      {agentMessages.map((component, index) => (
        <GenUIRenderer key={component.id || `agent-${index}`} component={component} />
      ))}

      {/* 5. ActionPanel 独立底部（注入最新图片 URL） */}
      {lastActionPanel && (
        <GenUIRenderer
          component={{
            ...lastActionPanel,
            props: {
              ...lastActionPanel.props,
              imageUrl: lastImageUrl,
            } as GenUIComponent['props'],
          }}
        />
      )}
    </div>
  );
}

export function ChatInterface({
  title = 'AI 创作助手',
  placeholder = '输入你的创意，让 AI 来实现...',
  onChatEnd,
}: ChatInterfaceProps) {
  // ========== 状态管理 ==========
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [streamingComponents, setStreamingComponents] = useState<GenUIComponent[]>([]);
  const streamingComponentsRef = useRef<GenUIComponent[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const sessionIdWhenSendRef = useRef<string | null>(null);

  // ========== 会话管理 ==========
  const {
    currentSessionId,
    createSession,
    loadSessions,
  } = useSessionStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ========== 初始化数据库 ==========
  useEffect(() => {
    if (!isInitialized) {
      initDatabase()
        .then(() => {
          console.log('[ChatInterface] Database initialized');
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error('[ChatInterface] Failed to initialize database:', error);
        });
    }
  }, [isInitialized]);

  // ========== 加载会话消息 ==========
  useEffect(() => {
    if (!isInitialized) return;

    const sessionIdAtStart = currentSessionId;

    const loadCurrentSession = async () => {
      setTurns([]);
      setStreamingComponents([]);
      streamingComponentsRef.current = [];
      setIsProcessing(false);

      if (sessionIdAtStart) {
        try {
          const sessionMessages = await MessageService.loadSessionMessages(sessionIdAtStart);

          const currentSessionIdNow = useSessionStore.getState().currentSessionId;
          if (currentSessionIdNow !== sessionIdAtStart) {
            return;
          }

          const loadedTurns: ChatTurn[] = sessionMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            genUIComponents: msg.genUIComponents,
          }));

          setTurns(loadedTurns);

          console.log('[ChatInterface] Loaded session:', sessionIdAtStart, {
            turns: loadedTurns.length,
          });
        } catch (error) {
          console.error('[ChatInterface] Failed to load session messages:', error);
        }
      } else {
        // 如果没有当前会话，创建新会话
        try {
          const newSessionId = await createSession();
          console.log('[ChatInterface] Created new session:', newSessionId);
        } catch (error) {
          console.error('[ChatInterface] Failed to create session:', error);
        }
      }
    };

    loadCurrentSession();
  }, [currentSessionId, isInitialized, createSession]);

  const addStreamingComponent = useCallback((component: GenUIComponent) => {
    const next = [...streamingComponentsRef.current, component];
    streamingComponentsRef.current = next;
    setStreamingComponents(next);
  }, []);

  const updateStreamingComponent = useCallback((component: GenUIComponent) => {
    const prev = streamingComponentsRef.current;
    const updateMode = component.updateMode || 'append';
    let next: GenUIComponent[];

    switch (updateMode) {
      case 'replace':
        if (component.id) {
          const index = prev.findIndex((c) => c.id === component.id);
          if (index !== -1) {
            next = [...prev];
            next[index] = component;
          } else {
            next = [...prev, component];
          }
        } else {
          next = [...prev, component];
        }
        break;
      case 'update':
        if (component.id) {
          next = prev.map((c) =>
            c.id === component.id
              ? { ...c, props: { ...c.props, ...component.props } }
              : c
          );
        } else {
          next = [...prev, component];
        }
        break;
      case 'append':
      default:
        next = [...prev, component];
    }
    streamingComponentsRef.current = next;
    setStreamingComponents(next);
  }, []);

  const { sendMessage } = useAgentChat({
    onChatStart: () => {
      setIsProcessing(true);
      streamingComponentsRef.current = [];
      setStreamingComponents([]);
    },
    onThoughtLog: (data: ThoughtLogEventData) => {
      addStreamingComponent({
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
    onEnhancedPrompt: (data: EnhancedPromptEventData) => {
      addStreamingComponent({
        id: generateComponentId('enhanced'),
        widgetType: 'EnhancedPromptView',
        props: {
          original: data.original,
          retrieved: data.retrieved,
          final: data.final,
        },
      });
    },
    onGenUIComponent: (data: GenUIComponentEventData) => {
      const component: GenUIComponent = {
        id: data.id || generateComponentId(data.widgetType.toLowerCase()),
        widgetType: data.widgetType as GenUIComponent['widgetType'],
        props: data.props as GenUIComponent['props'],
        updateMode: data.updateMode,
        targetId: data.targetId,
      };

      if (data.updateMode && data.updateMode !== 'append') {
        updateStreamingComponent(component);
      } else {
        addStreamingComponent(component);
      }
    },
    onChatEnd: () => {
      const componentsToSave = streamingComponentsRef.current;
      const sessionIdToSave = sessionIdWhenSendRef.current;

      setTurns((prev) => [
        ...prev,
        {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: 'AI 响应',
          timestamp: Date.now(),
          genUIComponents: componentsToSave,
        },
      ]);
      setIsProcessing(false);
      streamingComponentsRef.current = [];
      setStreamingComponents([]);

      if (sessionIdToSave && componentsToSave.length > 0) {
        MessageService.saveAssistantMessage(
          sessionIdToSave,
          'AI 响应',
          componentsToSave
        )
          .then(() => {
            console.log('[ChatInterface] Assistant message saved with', componentsToSave.length, 'components');
            loadSessions();
          })
          .catch((error) => {
            console.error('[ChatInterface] Failed to save assistant message:', error);
          });
      }

      onChatEnd?.();
    },
    onStatusChange: (status) => {
      if (status === 'idle' && !isProcessing) {
        // Reset logic if needed
      }
    },
  });

  useEffect(() => {
    const handler = (e: CustomEvent<{ actionId: string }>) => {
      if (e.detail?.actionId !== 'regenerate_btn' || isProcessing) return;
      const userTurns = turns.filter((t) => t.role === 'user');
      const lastUser = userTurns.pop();
      if (lastUser?.content) {
        const previousPrompts = userTurns.map((t) => t.content);
        setTurns((prev) => {
          const next = [...prev];
          if (next[next.length - 1]?.role === 'assistant') {
            next.pop();
          }
          return next;
        });
        sendMessage(lastUser.content, { previousPrompts });
      }
    };
    window.addEventListener('genui-action', handler as EventListener);
    return () => window.removeEventListener('genui-action', handler as EventListener);
  }, [turns, isProcessing, sendMessage]);

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

  useEffect(() => {
    if (!isAutoScroll) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, streamingComponents, isAutoScroll]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !currentSessionId) return;

    sessionIdWhenSendRef.current = currentSessionId;

    const userTurn: ChatTurn = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setTurns((prev) => [...prev, userTurn]);

    MessageService.saveUserMessage(currentSessionId, text)
      .then(() => {
        console.log('[ChatInterface] User message saved');
      })
      .catch((error) => {
        console.error('[ChatInterface] Failed to save user message:', error);
      });

    const previousPrompts = turns
      .filter((t) => t.role === 'user')
      .map((t) => t.content);
    sendMessage(text, { previousPrompts });
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
          {turns.length === 0 && streamingComponents.length === 0 && !isProcessing && (
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

          {/* 按轮次交错展示：问题1 → 回答1 → 问题2 → 回答2 */}
          {turns.map((turn) =>
            turn.role === 'user' ? (
              <div key={turn.id} className="flex justify-end animate-in slide-in-from-bottom-2">
                <div className="max-w-[85%] bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.content}</p>
                </div>
              </div>
            ) : (
              <div key={turn.id}>
                {turn.genUIComponents && turn.genUIComponents.length > 0 && (
                  <GenUIComponentRenderer
                    components={turn.genUIComponents}
                    isProcessing={false}
                    onImageLoad={scrollToBottom}
                  />
                )}
              </div>
            )
          )}

          {/* 当前正在流式输出的 AI 响应 */}
          {(streamingComponents.length > 0 || isProcessing) && (
            <GenUIComponentRenderer
              components={streamingComponents}
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
