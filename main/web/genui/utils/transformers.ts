/**
 * GenUI 组件数据转换器
 * 提供组件属性的数据转换函数
 */

import {
  GenUIComponentProps,
  isImageViewProps,
  isActionPanelProps,
} from '@/lib/types/genui';

/**
 * ImageView 属性转换器
 * 兼容旧版本的 url 属性
 */
export function transformImageViewProps(props: GenUIComponentProps) {
  if (isImageViewProps(props)) {
    // 兼容旧版本的 url 属性
    if (!props.imageUrl && (props as any).url) {
      return {
        ...props,
        imageUrl: (props as any).url,
      };
    }
  }
  return props;
}

/**
 * ActionPanel 属性转换器
 * 确保操作项有正确的默认值
 */
export function transformActionPanelProps(props: GenUIComponentProps) {
  if (isActionPanelProps(props)) {
    return {
      ...props,
      actions: props.actions.map(action => ({
        ...action,
        disabled: action.disabled ?? false,
        buttonType: action.buttonType ?? 'secondary',
      })),
    };
  }
  return props;
}

/**
 * 通用属性转换器
 * 根据组件类型自动选择对应的转换函数
 */
export function transformComponentProps(props: GenUIComponentProps) {
  if (isImageViewProps(props)) {
    return transformImageViewProps(props);
  }
  if (isActionPanelProps(props)) {
    return transformActionPanelProps(props);
  }
  return props;
}
