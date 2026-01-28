/**
 * 消息服务
 * 负责消息的保存、加载和管理
 *
 * 功能：
 * - 保存用户消息
 * - 保存助手消息（包含 GenUI 组件）
 * - 加载会话消息
 * - 更新会话信息
 */

import { db } from '@/lib/db/database';
import type { GenUIComponent } from '@/lib/types/genui';

/**
 * 消息接口
 * 应用层使用的消息类型
 */
export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  genUIComponents?: GenUIComponent[];
  imageUrl?: string;
}

/**
 * 聊天请求接口
 * 用于重试功能
 */
export interface ChatRequest {
  text: string;
  maskData?: {
    base64: string;
    imageUrl: string;
  };
  preferredModel?: string;
  timestamp: number;
}

/**
 * 消息服务类
 * 提供静态方法操作数据库
 */
export class MessageService {
  /**
   * 保存用户消息
   * @param sessionId 会话 ID
   * @param content 消息内容
   * @returns 消息 ID
   */
  static async saveUserMessage(
    sessionId: string,
    content: string
  ): Promise<string> {
    const messageId = `msg_${Date.now()}`;

    try {
      await db.messages.add({
        id: messageId,
        sessionId,
        role: 'user',
        content,
        timestamp: Date.now(),
      });

      // 更新会话信息（最后消息、消息数量、更新时间）
      await this.updateSessionInfo(sessionId);

      return messageId;
    } catch (error) {
      console.error('[MessageService] Failed to save user message:', error);
      throw error;
    }
  }

  /**
   * 保存助手消息（包含 GenUI 组件）
   * @param sessionId 会话 ID
   * @param content 消息内容
   * @param genUIComponents GenUI 组件列表（可选）
   * @returns 消息 ID
   */
  static async saveAssistantMessage(
    sessionId: string,
    content: string,
    genUIComponents?: GenUIComponent[]
  ): Promise<string> {
    const messageId = `msg_${Date.now()}`;
    const imageUrl = this.extractImageUrl(genUIComponents);

    try {
      await db.messages.add({
        id: messageId,
        sessionId,
        role: 'assistant',
        content,
        timestamp: Date.now(),
        genUIComponents: genUIComponents
          ? JSON.stringify(genUIComponents)
          : undefined,
        imageUrl,
      });

      // 更新会话信息
      await this.updateSessionInfo(sessionId);

      return messageId;
    } catch (error) {
      console.error('[MessageService] Failed to save assistant message:', error);
      throw error;
    }
  }

  /**
   * 加载会话的所有消息
   * @param sessionId 会话 ID
   * @returns 消息列表（按时间戳排序）
   */
  static async loadSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      const records = await db.messages
        .where('sessionId')
        .equals(sessionId)
        .sortBy('timestamp');

      return records.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        role: r.role,
        content: r.content,
        timestamp: r.timestamp,
        genUIComponents: r.genUIComponents
          ? JSON.parse(r.genUIComponents)
          : undefined,
        imageUrl: r.imageUrl,
      }));
    } catch (error) {
      console.error('[MessageService] Failed to load session messages:', error);
      return [];
    }
  }

  /**
   * 删除会话的所有消息
   * @param sessionId 会话 ID
   */
  static async deleteSessionMessages(sessionId: string): Promise<void> {
    try {
      await db.messages.where('sessionId').equals(sessionId).delete();
    } catch (error) {
      console.error('[MessageService] Failed to delete session messages:', error);
      throw error;
    }
  }

  /**
   * 更新会话信息
   * 在保存消息后自动调用，更新会话的元数据
   * @param sessionId 会话 ID
   */
  private static async updateSessionInfo(sessionId: string): Promise<void> {
    try {
      const messages = await db.messages
        .where('sessionId')
        .equals(sessionId)
        .sortBy('timestamp');

      const lastMessage = messages[messages.length - 1];
      const lastMessagePreview = lastMessage?.content.substring(0, 50) || '';

      await db.sessions.update(sessionId, {
        updatedAt: Date.now(),
        messageCount: messages.length,
        lastMessage: lastMessagePreview + (lastMessage?.content.length > 50 ? '...' : ''),
      });
    } catch (error) {
      console.error('[MessageService] Failed to update session info:', error);
      // 不抛出错误，避免影响消息保存
    }
  }

  /**
   * 从 GenUI 组件中提取图片 URL
   * 用于会话列表的预览图
   * @param components GenUI 组件列表
   * @returns 图片 URL（如果有）
   */
  private static extractImageUrl(
    components?: GenUIComponent[]
  ): string | undefined {
    if (!components) return undefined;

    // 查找 ImageView 组件
    const imageView = components.find((c) => c.widgetType === 'ImageView');
    if (imageView && imageView.props && 'imageUrl' in imageView.props) {
      return imageView.props.imageUrl as string;
    }

    // 查找 SmartCanvas 组件
    const smartCanvas = components.find((c) => c.widgetType === 'SmartCanvas');
    if (smartCanvas && smartCanvas.props && 'imageUrl' in smartCanvas.props) {
      return smartCanvas.props.imageUrl as string;
    }

    return undefined;
  }

  /**
   * 保存聊天请求（用于重试功能）
   * @param sessionId 会话 ID
   * @param request 聊天请求
   */
  static async saveChatRequest(
    sessionId: string,
    request: ChatRequest
  ): Promise<void> {
    try {
      // 将请求作为特殊用户消息保存
      await db.messages.add({
        id: `req_${Date.now()}`,
        sessionId,
        role: 'user',
        content: `[REQUEST]${JSON.stringify(request)}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[MessageService] Failed to save chat request:', error);
      throw error;
    }
  }

  /**
   * 获取聊天请求（用于重试功能）
   * @param sessionId 会话 ID
   * @param messageId 消息 ID
   * @returns 聊天请求（如果有）
   */
  static async getChatRequest(
    sessionId: string,
    messageId: string
  ): Promise<ChatRequest | null> {
    try {
      const message = await db.messages.get(messageId);

      if (!message || message.content.startsWith('[REQUEST]')) {
        const requestJson = message.content.replace('[REQUEST]', '');
        return JSON.parse(requestJson) as ChatRequest;
      }

      return null;
    } catch (error) {
      console.error('[MessageService] Failed to get chat request:', error);
      return null;
    }
  }
}
