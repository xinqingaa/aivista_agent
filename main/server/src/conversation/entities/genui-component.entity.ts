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
 * GenUI 组件实体
 * 存储前端渲染的动态组件数据
 */
@Entity('genui_components')
export class GenUIComponent {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  conversationId: string;

  @Column('varchar', { nullable: true })
  messageId: string;

  @Column('varchar')
  widgetType: string;

  @Column('simple-json')
  props: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['append', 'replace', 'update'],
    default: 'append',
  })
  updateMode: 'append' | 'replace' | 'update';

  @Column('varchar', { nullable: true })
  targetId: string;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'bigint' })
  timestamp: number;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;
}
