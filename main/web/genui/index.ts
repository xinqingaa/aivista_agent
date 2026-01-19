/**
 * GenUI 组件库统一导出
 * 
 * 这是 GenUI 组件库的主入口，提供：
 * - 核心系统（Registry、Renderer、Context）
 * - 所有 GenUI 组件
 * - Hooks 和工具函数
 * - 类型定义
 */

// 导出核心系统
export { GenUIRegistry } from './core/gen-ui-registry';
export type { ComponentDefinition } from './core/gen-ui-registry';

export { GenUIRenderer, GenUIListRenderer } from './core/gen-ui-renderer';
export type { GenUIRendererProps, GenUIListRendererProps } from './core/gen-ui-renderer';

export { GenUIProvider, useGenUIContext } from './core/gen-ui-context';
export type { GenUIContextValue } from './core/gen-ui-context';

// 导出 Hooks
export { useGenUIRenderer } from './hooks/use-genui-renderer';
export type { UseGenUIRendererOptions } from './hooks/use-genui-renderer';

export { useGenUIRegistry } from './hooks/use-genui-registry';

// 导出工具函数
export {
  validateSmartCanvasProps,
  validateImageViewProps,
  validateAgentMessageProps,
  validateActionPanelProps,
  validateEnhancedPromptViewProps,
  validateThoughtLogItemProps,
  validateComponentProps,
} from './utils/validators';

export {
  transformImageViewProps,
  transformActionPanelProps,
  transformComponentProps,
} from './utils/transformers';

export {
  generateComponentId,
  mergeGenUIComponents,
  findComponentById,
  findComponentsByType,
  formatTimestamp,
  cloneGenUIComponent,
} from './utils/helpers';

// 导出类型（从 lib/types/genui 重新导出）
export type {
  GenUIWidgetType,
  GenUIUpdateMode,
  GenUIComponent,
  GenUIComponentProps,
  SmartCanvasProps,
  ImageViewProps,
  AgentMessageProps,
  ActionPanelProps,
  EnhancedPromptViewProps,
  ThoughtLogItemProps,
  ActionItem,
  MaskData,
  CanvasAction,
} from '@/lib/types/genui';

export {
  isSmartCanvasProps,
  isImageViewProps,
  isAgentMessageProps,
  isActionPanelProps,
  isEnhancedPromptViewProps,
  isThoughtLogItemProps,
} from '@/lib/types/genui';

// ============================================================================
// GenUI 组件导出
// ============================================================================

export { ImageView } from './components/image-view';
export { ThoughtLogItem } from './components/thought-log-item';
export { EnhancedPromptView } from './components/enhanced-prompt-view';

// ============================================================================
// 组件注册
// ============================================================================

import { GenUIRegistry, ComponentDefinition } from './core/gen-ui-registry';
import { ImageView } from './components/image-view';
import { ThoughtLogItem } from './components/thought-log-item';
import { EnhancedPromptView } from './components/enhanced-prompt-view';
import {
  validateImageViewProps,
  validateThoughtLogItemProps,
  validateEnhancedPromptViewProps,
} from './utils/validators';
import { transformImageViewProps } from './utils/transformers';

/**
 * 默认组件定义列表
 */
const defaultComponentDefinitions: ComponentDefinition[] = [
  {
    type: 'ImageView',
    component: ImageView,
    validate: validateImageViewProps,
    transform: transformImageViewProps,
  },
  {
    type: 'ThoughtLogItem',
    component: ThoughtLogItem,
    validate: validateThoughtLogItemProps,
  },
  {
    type: 'EnhancedPromptView',
    component: EnhancedPromptView,
    validate: validateEnhancedPromptViewProps,
  },
];

/**
 * 初始化 GenUI 注册表
 * 注册所有默认组件
 * 
 * @returns GenUIRegistry 实例
 */
export function initGenUIRegistry(): GenUIRegistry {
  const registry = GenUIRegistry.getInstance();
  registry.registerAll(defaultComponentDefinitions);
  return registry;
}

/**
 * 确保 GenUI 注册表已初始化
 * 如果未初始化，则自动初始化
 */
export function ensureGenUIRegistryInitialized(): GenUIRegistry {
  const registry = GenUIRegistry.getInstance();
  
  // 检查是否已注册组件
  if (registry.size() === 0) {
    registry.registerAll(defaultComponentDefinitions);
  }
  
  return registry;
}

// 自动初始化注册表（模块加载时执行）
if (typeof window !== 'undefined') {
  // 只在客户端执行
  ensureGenUIRegistryInitialized();
}
