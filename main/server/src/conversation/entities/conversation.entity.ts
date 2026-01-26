import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Message } from './message.entity';

/**
 * 会话实体
 * 表示一个完整的对话会话
 */
@Entity('conversations')
export class Conversation {
  @PrimaryColumn('varchar')
  id: string; // conversationId, 格式: conv_{timestamp}_{random}

  @Column('varchar')
  title: string; // 对话标题

  @Column({
    type: 'enum',
    enum: ['active', 'completed', 'failed'],
    default: 'active',
  })
  status: 'active' | 'completed' | 'failed';

  @Column('simple-json', { nullable: true })
  metadata: {
    model?: string;
    totalMessages?: number;
    totalImages?: number;
    legacySessionId?: string; // 迁移时保留的旧 sessionId
    migratedAt?: number;
    [key: string]: any;
  };

  @CreateDateColumn({ type: 'bigint' })
  createdAt: number;

  @UpdateDateColumn({ type: 'bigint' })
  updatedAt: number;

  @DeleteDateColumn({ type: 'bigint' })
  deletedAt?: number; // 软删除

  // 关系映射
  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];
}
