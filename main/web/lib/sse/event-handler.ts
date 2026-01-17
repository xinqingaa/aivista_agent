/**
 * SSE 事件处理器工具
 * 提供常用的事件处理逻辑
 */

import { SSEEvent } from '@/lib/types/sse';

/**
 * 事件处理策略
 */
export interface EventHandlerStrategy {
  onEvent?(event: SSEEvent): void;
  onThoughtLog?: (event: SSEEvent) => void;
  onEnhancedPrompt?: (event: SSEEvent) => void;
  onGenUIComponent?: (event: SSEEvent) => void;
  onError?: (event: SSEEvent) => void;
  onStreamEnd?: (event: SSEEvent) => void;
  onStatusChange?: (status: any, sessionId: string | null) => void;
}

/**
 * 创建事件处理器
 */
export function createEventHandler(strategy: EventHandlerStrategy): (event: SSEEvent) => void {
  return (event: SSEEvent) => {
    // 调用通用处理器
    if (strategy.onEvent) {
      strategy.onEvent(event);
    }

    // 根据事件类型调用特定处理器
    switch (event.type) {
      case 'thought_log':
        if (strategy.onThoughtLog) {
          strategy.onThoughtLog(event);
        }
        break;

      case 'enhanced_prompt':
        if (strategy.onEnhancedPrompt) {
          strategy.onEnhancedPrompt(event);
        }
        break;

      case 'gen_ui_component':
        if (strategy.onGenUIComponent) {
          strategy.onGenUIComponent(event);
        }
        break;

      case 'error':
        if (strategy.onError) {
          strategy.onError(event);
        } else {
          console.error('[EventHandler] Error event received:', event.data);
        }
        break;

      case 'stream_end':
        if (strategy.onStreamEnd) {
          strategy.onStreamEnd(event);
        }
        break;

      case 'status-change':
        if (strategy.onStatusChange) {
          strategy.onStatusChange(
            event.data.status,
            event.data.sessionId
          );
        }
        break;

      default:
        // 其他事件类型（connection、heartbeat 等）
        break;
    }
  };
}

/**
 * 默认事件处理器（用于调试）
 */
export function createDefaultEventHandler(): EventHandlerStrategy {
  return {
    onEvent: (event: SSEEvent) => {
      console.log(`[SSE] Event received: ${event.type}`, event);
    },
    onThoughtLog: (event: SSEEvent) => {
      const { node, message } = event.data;
      console.log(`[SSE] 💭 ${node}: ${message}`);
    },
    onEnhancedPrompt: (event: SSEEvent) => {
      const { original, retrieved, final } = event.data;
      console.log(`[SSE] ✨ Enhanced Prompt:`, {
        original,
        retrievedCount: retrieved.length,
        final: final.substring(0, 100) + '...',
      });
    },
    onGenUIComponent: (event: SSEEvent) => {
      const { widgetType } = event.data;
      console.log(`[SSE] 🎨 GenUI Component: ${widgetType}`);
    },
    onError: (event: SSEEvent) => {
      const { code, message, details } = event.data;
      console.error(`[SSE] ❌ Error [${code}]: ${message}`, details || '');
    },
    onStreamEnd: (event: SSEEvent) => {
      const { summary } = event.data;
      console.log(`[SSE] ✅ Stream End: ${summary}`);
    },
    onStatusChange: (status: string, sessionId: string | null) => {
      console.log(`[SSE] 📡 Status: ${status}`, sessionId ? `(session: ${sessionId})` : '');
    },
  };
}

/**
 * 事件聚合器
 * 用于聚合多个事件处理器
 */
export class EventAggregator {
  private handlers: Set<(event: SSEEvent) => void> = new Set();

  subscribe(handler: (event: SSEEvent) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  notify(event: SSEEvent): void {
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (err) {
        console.error('[EventAggregator] Error in handler:', err);
      }
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}

/**
 * 事件过滤器
 * 根据条件过滤事件
 */
export function createEventFilter(
  predicate: (event: SSEEvent) => boolean,
  handler: (event: SSEEvent) => void
): (event: SSEEvent) => void {
  return (event: SSEEvent) => {
    if (predicate(event)) {
      handler(event);
    }
  };
}

/**
 * 事件转换器
 * 转换事件数据
 */
export function createEventTransformer<T>(
  transformer: (event: SSEEvent) => T | null,
  handler: (transformed: T) => void
): (event: SSEEvent) => void {
  return (event: SSEEvent) => {
    const transformed = transformer(event);
    if (transformed !== null) {
      handler(transformed);
    }
  };
}

/**
 * 创建事件日志记录器
 */
export function createEventLogger(
  prefix: string = '[SSE]'
): EventHandlerStrategy {
  return {
    onEvent: (event: SSEEvent) => {
      console.log(`${prefix} Event:`, event.type, event.data);
    },
  };
}
