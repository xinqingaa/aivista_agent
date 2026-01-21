/**
 * IndexedDB 数据库层
 * 使用 Dexie.js 封装 IndexedDB 操作
 */

import Dexie, { Table } from 'dexie';
import { Conversation } from '@/lib/types/conversation';

/**
 * 对话数据库
 */
export class ConversationDatabase extends Dexie {
  conversations!: Table<Conversation, string>;

  constructor() {
    super('AiVistaConversationsDB');
    
    // 定义数据库 schema
    this.version(1).stores({
      conversations: 'id, title, createdAt, updatedAt, status',
    });

    // 错误处理
    this.on('blocked', () => {
      console.error('[IndexedDB] Database blocked');
    });

    this.on('versionchange', () => {
      console.log('[IndexedDB] Database version changed, closing');
      this.close();
    });
  }
}

// 创建数据库实例
export const db = new ConversationDatabase();

/**
 * 对话数据库操作类
 */
export class ConversationDB {
  /**
   * 添加对话
   */
  static async addConversation(conversation: Conversation): Promise<void> {
    try {
      await db.conversations.add(conversation);
    } catch (error) {
      console.error('[IndexedDB] Failed to add conversation:', error);
      
      // 检测 IndexedDB 是否可用
      if (!this.isIndexedDBAvailable()) {
        console.error('[IndexedDB] IndexedDB not available');
        throw new Error('IndexedDB not available');
      }
      
      // 配额超限
      if (error.name === 'QuotaExceededError') {
        console.error('[IndexedDB] Quota exceeded');
        throw new Error('Storage quota exceeded');
      }
      
      throw error;
    }
  }

  /**
   * 获取对话
   */
  static async getConversation(id: string): Promise<Conversation | undefined> {
    try {
      return await db.conversations.get(id);
    } catch (error) {
      console.error('[IndexedDB] Failed to get conversation:', error);
      return undefined;
    }
  }

  /**
   * 获取所有对话（按更新时间倒序）
   */
  static async getAllConversations(): Promise<Conversation[]> {
    try {
      return await db.conversations
        .orderBy('updatedAt')
        .reverse()
        .toArray();
    } catch (error) {
      console.error('[IndexedDB] Failed to get all conversations:', error);
      return [];
    }
  }

  /**
   * 更新对话
   */
  static async updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<number> {
    try {
      return await db.conversations.update(id, {
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to update conversation:', error);
      throw error;
    }
  }

  /**
   * 删除对话
   */
  static async deleteConversation(id: string): Promise<void> {
    try {
      await db.conversations.delete(id);
    } catch (error) {
      console.error('[IndexedDB] Failed to delete conversation:', error);
      throw error;
    }
  }

  /**
   * 批量删除对话
   */
  static async bulkDeleteConversations(ids: string[]): Promise<void> {
    try {
      await db.conversations.bulkDelete(ids);
    } catch (error) {
      console.error('[IndexedDB] Failed to bulk delete conversations:', error);
      throw error;
    }
  }

  /**
   * 清空所有对话
   */
  static async clearAll(): Promise<void> {
    try {
      await db.conversations.clear();
    } catch (error) {
      console.error('[IndexedDB] Failed to clear all conversations:', error);
      throw error;
    }
  }

  /**
   * 检测 IndexedDB 是否可用
   */
  static isIndexedDBAvailable(): boolean {
    try {
      const test = '__indexeddb_test__';
      if (typeof window !== 'undefined' && window.indexedDB) {
        window.indexedDB.deleteDatabase(test);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检测是否在无痕模式
   */
  static isPrivateMode(): boolean {
    return !this.isIndexedDBAvailable();
  }

  /**
   * 获取存储使用情况（如果浏览器支持）
   */
  static async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    percentage: number;
  } | null> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (usage / quota) * 100 : 0;
        
        return {
          usage,
          quota,
          percentage,
        };
      } catch (error) {
        console.error('[IndexedDB] Failed to get storage estimate:', error);
        return null;
      }
    }
    return null;
  }
}
