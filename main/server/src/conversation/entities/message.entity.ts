import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { GenUIComponent } from './genui-component.entity';

/**
 * 消息实体
 * 表示对话中的一条消息（用户或助手）
 */
@Entity('messages')
export class Message {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  conversationId: string;

  @Column({
    type: 'enum',
    enum: ['user', 'assistant', 'system'],
  })
  role: 'user' | 'assistant' | 'system';

  @Column('text')
  content: string;

  @Column('jsonb', { nullable: true })
  metadata: {
    sessionId?: string;
    maskData?: any;
    preferredModel?: string;
    imageUrl?: string;
    componentIds?: string[];
    [key: string]: any;
  };

  @CreateDateColumn({ type: 'bigint' })
  timestamp: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @OneToMany(() => GenUIComponent, component => component.message)
  components: GenUIComponent[];
}
