/**
 * IndexedDB 数据库定义
 * 使用 Dexie.js 管理本地数据存储
 *
 * 功能：
 * - 会话（Session）存储：管理所有对话会话
 * - 消息（Message）存储：管理每个会话的消息历史
 * - GenUI 组件存储：保存消息关联的动态组件
 */

import Dexie, { Table } from 'dexie';

/**
 * 会话记录接口
 * 对应数据库中的 sessions 表
 */
export interface SessionRecord {
  id: string;                    // 会话 ID (sessionId)
  title: string;                 // 会话标题（自动生成或用户编辑）
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 最后更新时间戳
  messageCount: number;          // 消息数量
  lastMessage?: string;          // 最后一条消息预览（可选）
}

/**
 * 消息记录接口
 * 对应数据库中的 messages 表
 */
export interface MessageRecord {
  id: string;                    // 消息 ID
  sessionId: string;             // 所属会话 ID
  role: 'user' | 'assistant';    // 角色
  content: string;               // 文本内容
  timestamp: number;             // 时间戳
  genUIComponents?: string;      // GenUI 组件（JSON 字符串）
  imageUrl?: string;             // 关联的图片 URL（可选）
}

/**
 * AiVista 数据库类
 * 继承自 Dexie，定义数据库结构
 */
class AiVistaDB extends Dexie {
  // 会话表
  sessions!: Table<SessionRecord, string>;

  // 消息表
  messages!: Table<MessageRecord, string>;

  constructor() {
    // 数据库名称：AiVistaDB
    super('AiVistaDB');

    // 定义数据库版本和表结构
    this.version(1).stores({
      // sessions 表索引
      sessions: 'id, createdAt, updatedAt',

      // messages 表索引
      messages: 'id, sessionId, timestamp',
    });
  }
}

/**
 * 导出数据库实例（单例）
 */
export const db = new AiVistaDB();

/**
 * 数据库工具函数
 */

/**
 * 初始化数据库
 * 在应用启动时调用，确保数据库已准备好
 */
export async function initDatabase(): Promise<void> {
  try {
    await db.open();
    console.log('[AiVistaDB] Database initialized successfully');
  } catch (error) {
    console.error('[AiVistaDB] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * 清空所有数据（慎用）
 * 用于测试或重置应用状态
 */
export async function clearAllData(): Promise<void> {
  try {
    await db.transaction('rw', [db.sessions, db.messages], async () => {
      await db.sessions.clear();
      await db.messages.clear();
    });
    console.log('[AiVistaDB] All data cleared');
  } catch (error) {
    console.error('[AiVistaDB] Failed to clear data:', error);
    throw error;
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  sessionCount: number;
  messageCount: number;
  totalSize: number;
}> {
  try {
    const sessionCount = await db.sessions.count();
    const messageCount = await db.messages.count();

    // 估算数据大小（粗略计算）
    const sessions = await db.sessions.toArray();
    const messages = await db.messages.toArray();
    const totalSize =
      JSON.stringify(sessions).length + JSON.stringify(messages).length;

    return {
      sessionCount,
      messageCount,
      totalSize,
    };
  } catch (error) {
    console.error('[AiVistaDB] Failed to get stats:', error);
    return {
      sessionCount: 0,
      messageCount: 0,
      totalSize: 0,
    };
  }
}
