/**
 * GenUI 组件属性验证器
 * 提供组件属性的验证函数
 */

import {
  SmartCanvasProps,
  ImageViewProps,
  AgentMessageProps,
  ActionPanelProps,
  EnhancedPromptViewProps,
  ThoughtLogItemProps,
  GenUIComponentProps,
  isSmartCanvasProps,
  isImageViewProps,
  isAgentMessageProps,
  isActionPanelProps,
  isEnhancedPromptViewProps,
  isThoughtLogItemProps,
} from '@/lib/types/genui';

/**
 * 验证 SmartCanvas 属性
 */
export function validateSmartCanvasProps(props: SmartCanvasProps): boolean {
  if (!props.imageUrl || typeof props.imageUrl !== 'string') {
    return false;
  }
  if (!props.mode || !['view', 'draw_mask'].includes(props.mode)) {
    return false;
  }
  return true;
}

/**
 * 验证 ImageView 属性
 */
export function validateImageViewProps(props: ImageViewProps): boolean {
  if (!props.imageUrl || typeof props.imageUrl !== 'string') {
    return false;
  }
  return true;
}

/**
 * 验证 AgentMessage 属性
 */
export function validateAgentMessageProps(props: AgentMessageProps): boolean {
  if (!props.text || typeof props.text !== 'string') {
    return false;
  }
  return true;
}

/**
 * 验证 ActionPanel 属性
 */
export function validateActionPanelProps(props: ActionPanelProps): boolean {
  if (!props.actions || !Array.isArray(props.actions)) {
    return false;
  }
  return true;
}

/**
 * 验证 EnhancedPromptView 属性
 */
export function validateEnhancedPromptViewProps(props: EnhancedPromptViewProps): boolean {
  if (!props.original || typeof props.original !== 'string') {
    return false;
  }
  if (!props.retrieved || !Array.isArray(props.retrieved)) {
    return false;
  }
  if (!props.final || typeof props.final !== 'string') {
    return false;
  }
  return true;
}

/**
 * 验证 ThoughtLogItem 属性
 */
export function validateThoughtLogItemProps(props: ThoughtLogItemProps): boolean {
  if (!props.node || typeof props.node !== 'string') {
    return false;
  }
  if (!props.message || typeof props.message !== 'string') {
    return false;
  }
  return true;
}

/**
 * 通用属性验证函数
 * 根据组件类型自动选择对应的验证函数
 */
export function validateComponentProps(props: GenUIComponentProps): boolean {
  if (isSmartCanvasProps(props)) {
    return validateSmartCanvasProps(props);
  }
  if (isImageViewProps(props)) {
    return validateImageViewProps(props);
  }
  if (isAgentMessageProps(props)) {
    return validateAgentMessageProps(props);
  }
  if (isActionPanelProps(props)) {
    return validateActionPanelProps(props);
  }
  if (isEnhancedPromptViewProps(props)) {
    return validateEnhancedPromptViewProps(props);
  }
  if (isThoughtLogItemProps(props)) {
    return validateThoughtLogItemProps(props);
  }
  return false;
}
