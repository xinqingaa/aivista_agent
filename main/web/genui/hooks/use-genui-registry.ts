/**
 * useGenUIRegistry Hook
 * 提供对 GenUI 注册表的便捷访问
 */

'use client';

import { useMemo } from 'react';
import { GenUIRegistry } from '../core/gen-ui-registry';
import { GenUIWidgetType } from '@/lib/types/genui';

export function useGenUIRegistry() {
  const registry = useMemo(() => GenUIRegistry.getInstance(), []);

  return {
    registry,
    getRegisteredTypes: () => registry.getRegisteredTypes(),
    hasComponent: (type: GenUIWidgetType) => registry.has(type),
    getComponent: (type: GenUIWidgetType) => registry.get(type),
  };
}
