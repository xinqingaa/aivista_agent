/**
 * GenUI 组件注册表
 * 管理所有 GenUI 组件的注册和获取
 */

import React from 'react';
import { GenUIWidgetType } from '@/lib/types/genui';

/**
 * 组件定义接口
 */
export interface ComponentDefinition {
  type: GenUIWidgetType;
  component: React.ComponentType<any>;
  validate?: (props: any) => boolean;
  transform?: (props: any) => any;
}

/**
 * GenUI 组件注册表
 * 使用单例模式，全局唯一
 */
export class GenUIRegistry {
  private static instance: GenUIRegistry;
  private components: Map<GenUIWidgetType, ComponentDefinition> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): GenUIRegistry {
    if (!GenUIRegistry.instance) {
      GenUIRegistry.instance = new GenUIRegistry();
    }
    return GenUIRegistry.instance;
  }

  /**
   * 注册组件
   */
  register(definition: ComponentDefinition): void {
    if (this.components.has(definition.type)) {
      console.warn(
        `[GenUIRegistry] Component type "${definition.type}" is already registered. Overwriting.`
      );
    }
    this.components.set(definition.type, definition);
  }

  /**
   * 批量注册组件
   */
  registerAll(definitions: ComponentDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * 获取组件定义
   */
  get(type: GenUIWidgetType): ComponentDefinition | undefined {
    return this.components.get(type);
  }

  /**
   * 检查组件是否已注册
   */
  has(type: GenUIWidgetType): boolean {
    return this.components.has(type);
  }

  /**
   * 获取所有已注册的组件类型
   */
  getRegisteredTypes(): GenUIWidgetType[] {
    return Array.from(this.components.keys());
  }

  /**
   * 注销组件
   */
  unregister(type: GenUIWidgetType): void {
    this.components.delete(type);
  }

  /**
   * 清空所有组件
   */
  clear(): void {
    this.components.clear();
  }

  /**
   * 获取已注册组件的数量
   */
  size(): number {
    return this.components.size;
  }
}
