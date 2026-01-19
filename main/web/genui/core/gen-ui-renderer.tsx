/**
 * GenUI 动态渲染器
 * 根据组件类型动态渲染对应的 React 组件
 */

'use client';

import React, { useMemo } from 'react';
import { GenUIComponent } from '@/lib/types/genui';
import { GenUIRegistry } from './gen-ui-registry';

export interface GenUIRendererProps {
  component: GenUIComponent;
  onError?: (error: Error, component: GenUIComponent) => void;
  fallback?: React.ReactNode;
}

/**
 * GenUI 动态渲染器
 * 根据组件类型动态渲染对应的 React 组件
 */
export function GenUIRenderer({
  component,
  onError,
  fallback,
}: GenUIRendererProps) {
  const registry = useMemo(() => GenUIRegistry.getInstance(), []);

  // 获取组件定义
  const definition = registry.get(component.widgetType);

  // 组件未注册
  if (!definition) {
    const error = new Error(
      `Unknown GenUI component type: ${component.widgetType}. ` +
      `Make sure the component is registered in GenUIRegistry.`
    );

    if (onError) {
      onError(error, component);
    }

    return (
      <div className="border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              未知组件类型
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {component.widgetType}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 渲染组件
  const Component = definition.component;

  try {
    // 应用转换函数（如果有）
    const props = definition.transform
      ? definition.transform(component.props)
      : component.props;

    // 验证属性（如果有）
    if (definition.validate && !definition.validate(props)) {
      const error = new Error(
        `Invalid props for component type: ${component.widgetType}`
      );

      if (onError) {
        onError(error, component);
      }

      return fallback || null;
    }

    return <Component {...props} />;
  } catch (error) {
    if (onError) {
      onError(error as Error, component);
    }

    return fallback || (
      <div className="border border-red-300 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-red-600 dark:text-red-400 text-lg">❌</span>
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              组件渲染错误
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {(error as Error).message}
            </p>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * GenUI 组件列表渲染器
 */
export interface GenUIListRendererProps {
  components: GenUIComponent[];
  onError?: (error: Error, component: GenUIComponent) => void;
  fallback?: React.ReactNode;
}

export function GenUIListRenderer({
  components,
  onError,
  fallback,
}: GenUIListRendererProps) {
  return (
    <>
      {components.map((component, index) => (
        <React.Fragment key={component.id || `${component.widgetType}-${index}`}>
          <GenUIRenderer
            component={component}
            onError={onError}
            fallback={fallback}
          />
        </React.Fragment>
      ))}
    </>
  );
}
