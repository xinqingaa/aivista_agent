/**
 * 会话管理相关类型定义
 */

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 对话状态
 */
export type ConversationStatus = 'active' | 'completed' | 'failed';

/**
 * 对话消息
 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  metadata?: {
    sessionId?: string;
    maskData?: any;
    preferredModel?: string;
    imageUrl?: string;
    componentIds?: string[];
    [key: string]: any;
  };
}

/**
 * GenUI组件
 */
export interface GenUIComponent {
  id: string;
  widgetType: string;
  props: Record<string, any>;
  updateMode?: 'append' | 'replace' | 'update';
  targetId?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

/**
 * 对话
 */
export interface Conversation {
  id: string; // conversationId
  title: string;
  status: ConversationStatus;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  genUIComponents: GenUIComponent[];
  metadata?: {
    model?: string;
    totalMessages?: number;
    totalImages?: number;
    [key: string]: any;
  };
}

/**
 * 对话列表项（用于侧边栏）
 */
export interface ConversationListItem {
  id: string;
  title: string;
  status: ConversationStatus;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  thumbnail?: string;
  messageCount: number;
}

/**
 * 侧边栏状态
 */
export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

/**
 * UI状态
 */
export interface UIState {
  sidebar: {
    state: SidebarState;
    width: number;
  };
  isMobile: boolean;
}
