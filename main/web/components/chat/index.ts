/**
 * Chat 业务组件导出
 * 
 * 注意：GenUI 组件（ThoughtLogItem、EnhancedPromptView、ImageView）
 * 已迁移到 @/components/genui，请从那里导入
 */
export { ChatInterface } from './chat-interface';
export { WorkflowProgress } from './workflow-progress';
export { TestGuideDialog } from './test-guide-dialog';

// 为了向后兼容，重新导出 GenUI 组件（建议直接从 @/components/genui 导入）
export { ThoughtLogItem, EnhancedPromptView, ImageView } from '@/genui';