import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Message } from './message.entity';

/**
 * RAG 检索上下文实体
 * 存储 RAG 检索的详细信息和增强后的 Prompt
 */
@Entity('rag_contexts')
export class RAGContext {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  conversationId: string;

  @Column('varchar', { nullable: true })
  messageId: string;

  @Column('text')
  originalPrompt: string;

  @Column('simple-json')
  retrievedContext: any;

  @Column('text')
  finalPrompt: string;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'bigint' })
  timestamp: number;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;
}
