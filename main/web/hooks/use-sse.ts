/**
 * useSSE Hook
 * 提供与后端 SSE 连接的 React Hook
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSSEClient, SSEClient } from '@/lib/sse/sse-client';
import { createEventHandler, EventHandlerStrategy } from '@/lib/sse/event-handler';
import {
  SSEOptions,
  SSEEvent,
  SSEConnectionStatus,
  ThoughtLogEventData,
  EnhancedPromptEventData,
  GenUIComponentEventData,
  ErrorEventData,
} from '@/lib/types/sse';

interface UseSSEOptions extends Partial<SSEOptions> {
  /**
   * 是否自动连接
   * @default true
   */
  autoConnect?: boolean;

  /**
   * 事件处理策略
   */
  strategy?: EventHandlerStrategy;

  /**
   * 连接状态变化回调
   */
  onStatusChange?: (status: any, sessionId: string | null) => void;
}

interface UseSSEReturn {
  // 连接状态
  status: SSEConnectionStatus;
  sessionId: string | null;
  error: Error | null;
  isConnected: boolean;

  // 控制方法
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (body: any) => void;

  // 清理
  destroy: () => void;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    url = '/api/agent/chat',
    body,
    autoConnect = true,
    strategy,
    onStatusChange,
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
  } = options;

  // 状态
  const [status, setStatus] = useState<SSEConnectionStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 客户端引用
  const clientRef = useRef<SSEClient | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 创建客户端
  useEffect(() => {
    const client = createSSEClient({
      url,
      body,
      maxRetries,
      retryDelay,
      timeout,
    });

    clientRef.current = client;

    // 设置事件处理器
    const handler = createEventHandler({
      ...strategy,
      onStatusChange: (newStatus: any, newSessionId) => {
        setStatus(newStatus as SSEConnectionStatus);
        setSessionId(newSessionId);
        setError(null);
        onStatusChange?.(newStatus, newSessionId);
      },
    });

    // 监听所有事件
    const unsubscribe = client.on('*', handler);
    unsubscribeRef.current = unsubscribe;

    // 自动连接
    if (autoConnect && body) {
      client.connect().catch(err => {
        console.error('[useSSE] Failed to connect:', err);
      });
    }

    // 清理函数
    return () => {
      unsubscribe();
      client.destroy();
    };
  }, []); // 只在挂载时执行一次

  // 连接方法
  const connect = useCallback(async () => {
    if (!clientRef.current) {
      console.error('[useSSE] Client not initialized');
      return;
    }

    await clientRef.current.connect();
  }, []);

  // 断开连接方法
  const disconnect = useCallback(() => {
    if (!clientRef.current) {
      console.error('[useSSE] Client not initialized');
      return;
    }

    clientRef.current.disconnect();
  }, []);

  // 发送消息方法（创建新连接）
  const send = useCallback((messageBody: any) => {
    // 取消旧的事件订阅
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // 创建新客户端并连接
    const client = createSSEClient({
      url,
      body: messageBody,
      maxRetries,
      retryDelay,
      timeout,
    });

    clientRef.current = client;

    // 设置事件处理器
    const handler = createEventHandler({
      ...strategy,
      onStatusChange: (newStatus: any, newSessionId) => {
        setStatus(newStatus as SSEConnectionStatus);
        setSessionId(newSessionId);
        setError(null);
        onStatusChange?.(newStatus, newSessionId);
      },
    });

    // 监听所有事件并保存取消订阅函数
    const unsubscribe = client.on('*', handler);
    unsubscribeRef.current = unsubscribe;

    // 连接
    client.connect().catch(err => {
      console.error('[useSSE] Failed to connect:', err);
    });
  }, [url, maxRetries, retryDelay, timeout, strategy, disconnect, onStatusChange]);

  // 清理方法
  const destroy = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.destroy();
      clientRef.current = null;
    }
  }, []);

  return {
    status,
    sessionId,
    error,
    isConnected: status === 'connected',
    connect,
    disconnect,
    send,
    destroy,
  };
}

/**
 * useAgentChat Hook
 * 专门用于 Agent 聊天的 Hook
 */
export interface UseAgentChatOptions {
  /**
   * 连接建立回调
   */
  onConnection?: (data: { status: string; sessionId: string; conversationId: string }) => void;

  /**
   * 聊天开始回调
   */
  onChatStart?: () => void;

  /**
   * 思考日志回调
   */
  onThoughtLog?: (data: ThoughtLogEventData) => void;

  /**
   * 增强 Prompt 回调
   */
  onEnhancedPrompt?: (data: EnhancedPromptEventData) => void;

  /**
   * GenUI 组件回调
   */
  onGenUIComponent?: (data: GenUIComponentEventData) => void;

  /**
   * 错误回调
   */
  onError?: (data: ErrorEventData) => void;

  /**
   * 聊天结束回调
   */
  onChatEnd?: () => void;

  /**
   * 连接状态变化回调
   */
  onStatusChange?: (status: any) => void;
}

interface UseAgentChatReturn extends UseSSEReturn {
  // 发送消息
  sendMessage: (
    text: string,
    options?: {
      conversationId?: string;
      maskData?: any;
    }
  ) => void;
}

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const {
    onConnection,
    onChatStart,
    onThoughtLog,
    onEnhancedPrompt,
    onGenUIComponent,
    onError,
    onChatEnd,
    onStatusChange,
  } = options;

  // 使用 ref 存储最新的回调函数，避免闭包陷阱
  const callbacksRef = useRef({
    onConnection,
    onChatStart,
    onThoughtLog,
    onEnhancedPrompt,
    onGenUIComponent,
    onError,
    onChatEnd,
    onStatusChange,
  });

  // 更新 ref 当回调函数变化时
  useEffect(() => {
    callbacksRef.current = {
      onConnection,
      onChatStart,
      onThoughtLog,
      onEnhancedPrompt,
      onGenUIComponent,
      onError,
      onChatEnd,
      onStatusChange,
    };
  }, [onConnection, onChatStart, onThoughtLog, onEnhancedPrompt, onGenUIComponent, onError, onChatEnd, onStatusChange]);

  const sse = useSSE({
    url: '/api/agent/chat',
    autoConnect: false, // 不自动连接，手动发送消息时连接
    strategy: {
      onConnection: (event) => {
        const callback = callbacksRef.current.onConnection;
        if (callback && event.data) {
          callback(event.data);
        }
      },
      onThoughtLog: (event) => {
        const callback = callbacksRef.current.onThoughtLog;
        if (callback && event.data) {
          callback(event.data as ThoughtLogEventData);
        }
      },
      onEnhancedPrompt: (event) => {
        const callback = callbacksRef.current.onEnhancedPrompt;
        if (callback && event.data) {
          callback(event.data as EnhancedPromptEventData);
        }
      },
      onGenUIComponent: (event) => {
        const callback = callbacksRef.current.onGenUIComponent;
        if (callback && event.data) {
          callback(event.data as GenUIComponentEventData);
        }
      },
      onError: (event) => {
        const callback = callbacksRef.current.onError;
        if (callback && event.data) {
          callback(event.data as ErrorEventData);
        }
      },
      onStreamEnd: () => {
        const callback = callbacksRef.current.onChatEnd;
        if (callback) {
          callback();
        }
      },
      onStatusChange: (status) => {
        const callback = callbacksRef.current.onStatusChange;
        if (callback) {
          callback(status);
        }
      },
    },
  });

  // 发送消息方法
  const sendMessage = useCallback((
    text: string,
    options?: {
      conversationId?: string;
      maskData?: any;
    }
  ) => {
    const body = {
      text,
      ...(options?.conversationId && { conversationId: options.conversationId }),
      ...(options?.maskData && { maskData: options.maskData }),
    };

    if (callbacksRef.current.onChatStart) {
      callbacksRef.current.onChatStart();
    }

    sse.send(body);
  }, [sse]);

  return {
    ...sse,
    sendMessage,
  };
}
