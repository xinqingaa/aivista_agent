/**
 * useGenUIRenderer Hook
 * 提供对 GenUI 渲染器的便捷访问
 */

'use client';

import { useState, useCallback } from 'react';
import { GenUIComponent } from '@/lib/types/genui';
import { GenUIRenderer } from '../core/gen-ui-renderer';

export interface UseGenUIRendererOptions {
  onError?: (error: Error, component: GenUIComponent) => void;
  fallback?: React.ReactNode;
}

export function useGenUIRenderer(options: UseGenUIRendererOptions = {}) {
  const [errors, setErrors] = useState<Array<{
    component: GenUIComponent;
    error: Error;
  }>>([]);

  const handleError = useCallback((error: Error, component: GenUIComponent) => {
    setErrors(prev => [...prev, { component, error }]);
    options.onError?.(error, component);
  }, [options.onError]);

  const Renderer = useCallback(({ component }: { component: GenUIComponent }) => {
    return (
      <GenUIRenderer
        component={component}
        onError={handleError}
        fallback={options.fallback}
      />
    );
  }, [handleError, options.fallback]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    Renderer,
    errors,
    clearErrors,
  };
}
