/**
 * GenUI 上下文
 * 提供全局的 GenUI 注册表访问
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { GenUIRegistry } from './gen-ui-registry';

/**
 * GenUI 上下文接口
 */
export interface GenUIContextValue {
  registry: GenUIRegistry;
}

/**
 * 创建 GenUI 上下文
 */
const GenUIContext = createContext<GenUIContextValue | undefined>(undefined);

/**
 * GenUI 上下文 Provider
 */
export function GenUIProvider({ children }: { children: ReactNode }) {
  const registry = GenUIRegistry.getInstance();

  return (
    <GenUIContext.Provider value={{ registry }}>
      {children}
    </GenUIContext.Provider>
  );
}

/**
 * 使用 GenUI 上下文
 */
export function useGenUIContext(): GenUIContextValue {
  const context = useContext(GenUIContext);

  if (!context) {
    throw new Error('useGenUIContext must be used within GenUIProvider');
  }

  return context;
}
