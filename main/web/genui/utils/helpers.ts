/**
 * GenUI 辅助函数
 * 提供通用的辅助函数
 */

import { GenUIComponent } from '@/lib/types/genui';

/**
 * 生成唯一的组件 ID
 */
export function generateComponentId(prefix: string = 'genui'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 合并两个 GenUI 组件数组
 */
export function mergeGenUIComponents(
  existing: GenUIComponent[],
  newComponents: GenUIComponent[],
  mode: 'append' | 'replace' | 'update' = 'append'
): GenUIComponent[] {
  switch (mode) {
    case 'append':
      return [...existing, ...newComponents];
    case 'replace':
      return newComponents;
    case 'update':
      const componentMap = new Map<string, GenUIComponent>();
      existing.forEach(comp => {
        if (comp.id) {
          componentMap.set(comp.id, comp);
        }
      });
      newComponents.forEach(comp => {
        if (comp.id) {
          componentMap.set(comp.id, comp);
        }
      });
      return Array.from(componentMap.values());
    default:
      return [...existing, ...newComponents];
  }
}

/**
 * 从组件数组中查找组件
 */
export function findComponentById(
  components: GenUIComponent[],
  id: string
): GenUIComponent | undefined {
  return components.find(comp => comp.id === id);
}

/**
 * 从组件数组中查找组件
 */
export function findComponentsByType(
  components: GenUIComponent[],
  widgetType: string
): GenUIComponent[] {
  return components.filter(comp => comp.widgetType === widgetType);
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 深度克隆 GenUI 组件
 */
export function cloneGenUIComponent(component: GenUIComponent): GenUIComponent {
  return JSON.parse(JSON.stringify(component));
}
