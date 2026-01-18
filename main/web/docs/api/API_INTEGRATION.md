# API 集成指南 (API Integration Guide)

## 1. 概述

本文档说明如何在前端集成后端 API 接口，包括请求封装、错误处理、类型定义等。

## 2. API 基础配置

### 2.1 基础 URL 配置

```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  AGENT: {
    INFO: '/api/agent',
    CHAT: '/api/agent/chat',
  },
  KNOWLEDGE: {
    STYLES: '/api/knowledge/styles',
    STYLE_BY_ID: (id: string) => `/api/knowledge/styles/${id}`,
    SEARCH: '/api/knowledge/search',
    STATS: '/api/knowledge/stats',
  },
} as const;
```

### 2.2 HTTP 客户端封装

```typescript
// lib/api/client.ts
interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const { params, ...fetchOptions } = options || {};
  
  // 构建 URL（处理查询参数）
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  // 发送请求
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  // 错误处理
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }));
    throw new APIError(
      error.message || 'API请求失败',
      response.status,
      error
    );
  }

  return response.json();
}

// 错误类
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

## 3. Agent API 集成

### 3.1 获取 API 信息

```typescript
// lib/api/agent.ts
import { fetchAPI } from './client';
import { API_ENDPOINTS } from './client';

export interface AgentInfo {
  service: string;
  version: string;
  status: string;
  endpoints: {
    chat: {
      method: string;
      path: string;
      description: string;
    };
  };
}

export async function getAgentInfo(): Promise<AgentInfo> {
  return fetchAPI<AgentInfo>(API_ENDPOINTS.AGENT.INFO);
}
```

### 3.2 聊天接口（SSE）

聊天接口使用 SSE 流式响应。

**已实现** ✅：
- SSE 客户端实现（`lib/sse/sse-client.ts`）
- SSE 事件处理（`lib/sse/event-handler.ts`）
- SSE Hook（`hooks/useSSE.ts`、`hooks/useAgentChat.ts`）
- 聊天界面组件（`components/chat/`）

**相关文档**：
- [SSE 客户端实现](./SSE_CLIENT.md) - SSE 客户端详细说明
- [SSE 实现总结](../sse-implementation-summary.md) - 完整实现记录
- [后端 SSE 设计](../../../main/server/docs/workflow/SSE_STREAMING_DESIGN.md) - 后端 SSE 接口设计

## 4. Knowledge API 集成

### 4.1 获取所有风格

```typescript
// lib/api/knowledge.ts
import { fetchAPI } from './client';
import { API_ENDPOINTS } from './client';

export interface StyleData {
  id: string;
  style: string;
  prompt: string;
  description?: string;
  tags?: string[];
  metadata?: {
    category?: string;
    popularity?: number;
    [key: string]: any;
  };
}

export async function getStyles(): Promise<StyleData[]> {
  return fetchAPI<StyleData[]>(API_ENDPOINTS.KNOWLEDGE.STYLES);
}
```

### 4.2 获取单个风格

```typescript
export async function getStyleById(id: string): Promise<StyleData> {
  return fetchAPI<StyleData>(API_ENDPOINTS.KNOWLEDGE.STYLE_BY_ID(id));
}
```

### 4.3 搜索风格

```typescript
export interface SearchOptions {
  query: string;
  limit?: number;
  minSimilarity?: number;
}

export interface SearchResult {
  style: string;
  prompt: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export async function searchStyles(
  options: SearchOptions
): Promise<SearchResult[]> {
  return fetchAPI<SearchResult[]>(API_ENDPOINTS.KNOWLEDGE.SEARCH, {
    params: {
      query: options.query,
      ...(options.limit && { limit: options.limit }),
      ...(options.minSimilarity && { minSimilarity: options.minSimilarity }),
    },
  });
}
```

### 4.4 获取统计信息

```typescript
export interface KnowledgeStats {
  count: number;
  dimension: number;
  dbPath: string;
  tableName: string;
  initialized: boolean;
  dbExists: boolean;
  tableInitialized: boolean;
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  return fetchAPI<KnowledgeStats>(API_ENDPOINTS.KNOWLEDGE.STATS);
}
```

### 4.5 添加风格

```typescript
export interface CreateStyleRequest {
  id: string;
  style: string;
  prompt: string;
  description?: string;
  tags?: string[];
  metadata?: {
    category?: string;
    popularity?: number;
    [key: string]: any;
  };
}

export interface CreateStyleResponse {
  message: string;
  id: string;
}

export async function createStyle(
  data: CreateStyleRequest
): Promise<CreateStyleResponse> {
  return fetchAPI<CreateStyleResponse>(
    API_ENDPOINTS.KNOWLEDGE.STYLES,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}
```

## 5. 错误处理

### 5.1 错误类型

```typescript
// lib/api/errors.ts
export enum APIErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class APIError extends Error {
  constructor(
    message: string,
    public code: APIErrorCode,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

### 5.2 错误处理中间件

```typescript
// lib/api/client.ts
export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  try {
    // ... 请求逻辑
  } catch (error) {
    // 网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        '网络连接失败，请检查网络设置',
        APIErrorCode.NETWORK_ERROR
      );
    }

    // HTTP 错误
    if (error instanceof APIError) {
      throw error;
    }

    // 未知错误
    throw new APIError(
      '未知错误',
      APIErrorCode.UNKNOWN_ERROR,
      undefined,
      error
    );
  }
}
```

### 5.3 错误展示

```typescript
// hooks/useAPIError.ts
import { useState, useCallback } from 'react';
import { APIError } from '@/lib/api/errors';

export function useAPIError() {
  const [error, setError] = useState<APIError | null>(null);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof APIError) {
      setError(error);
    } else {
      setError(
        new APIError(
          '未知错误',
          APIErrorCode.UNKNOWN_ERROR
        )
      );
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}
```

## 6. 请求拦截器（可选）

### 6.1 请求拦截

```typescript
// lib/api/interceptors.ts
export type RequestInterceptor = (
  url: string,
  options: RequestInit
) => [string, RequestInit];

export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
}

export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
}

// 在 fetchAPI 中使用
export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`;
  let fetchOptions: RequestInit = { ...options };

  // 应用请求拦截器
  for (const interceptor of requestInterceptors) {
    [url, fetchOptions] = interceptor(url, fetchOptions);
  }

  let response = await fetch(url, fetchOptions);

  // 应用响应拦截器
  for (const interceptor of responseInterceptors) {
    response = await interceptor(response);
  }

  // ... 处理响应
}
```

### 6.2 使用示例

```typescript
// 添加认证 token
addRequestInterceptor((url, options) => {
  const token = localStorage.getItem('token');
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return [url, options];
});

// 添加请求日志
addRequestInterceptor((url, options) => {
  console.log('API Request:', url, options);
  return [url, options];
});
```

## 7. 数据缓存（可选）

### 7.1 使用 SWR

```typescript
// hooks/useKnowledge.ts
import useSWR from 'swr';
import { getStyles, getStyleById } from '@/lib/api/knowledge';

export function useStyles() {
  const { data, error, isLoading, mutate } = useSWR(
    'knowledge/styles',
    getStyles,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    styles: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useStyle(id: string) {
  const { data, error, isLoading } = useSWR(
    id ? `knowledge/styles/${id}` : null,
    () => getStyleById(id)
  );

  return {
    style: data,
    isLoading,
    error,
  };
}
```

## 8. 类型定义

### 8.1 共享类型

所有 API 相关的类型定义在 `lib/types/` 目录下，详见 [类型定义文档](./TYPES.md)。

### 8.2 类型导出

```typescript
// lib/types/index.ts
export * from './agent';
export * from './knowledge';
export * from './genui';
export * from './sse';
```

## 9. 使用示例

### 9.1 在组件中使用

```typescript
// components/knowledge/StyleList.tsx
'use client';

import { useEffect, useState } from 'react';
import { getStyles, StyleData } from '@/lib/api/knowledge';
import { useAPIError } from '@/hooks/useAPIError';

export function StyleList() {
  const [styles, setStyles] = useState<StyleData[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useAPIError();

  useEffect(() => {
    async function loadStyles() {
      try {
        setLoading(true);
        clearError();
        const data = await getStyles();
        setStyles(data);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    }

    loadStyles();
  }, [handleError, clearError]);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div>
      {styles.map((style) => (
        <div key={style.id}>{style.style}</div>
      ))}
    </div>
  );
}
```

### 9.2 使用自定义 Hook

```typescript
// hooks/useKnowledge.ts
import { useState, useEffect } from 'react';
import { getStyles, searchStyles, StyleData } from '@/lib/api/knowledge';

export function useKnowledge() {
  const [styles, setStyles] = useState<StyleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadStyles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStyles();
      setStyles(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const search = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const results = await searchStyles({ query });
      // 处理搜索结果
      return results;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知错误'));
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStyles();
  }, []);

  return {
    styles,
    loading,
    error,
    loadStyles,
    search,
  };
}
```

## 10. 测试

### 10.1 Mock 数据

```typescript
// tests/__mocks__/api.ts
export const mockStyles: StyleData[] = [
  {
    id: 'style_001',
    style: 'Cyberpunk',
    prompt: 'neon lights, high tech...',
    description: '赛博朋克风格',
  },
];
```

### 10.2 测试示例

```typescript
// tests/api/knowledge.test.ts
import { getStyles } from '@/lib/api/knowledge';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockStyles),
  })
) as jest.Mock;

describe('Knowledge API', () => {
  it('should fetch styles', async () => {
    const styles = await getStyles();
    expect(styles).toEqual(mockStyles);
  });
});
```

## 11. 相关文档

- [SSE 客户端实现](./SSE_CLIENT.md)
- [类型定义](./TYPES.md)
- [后端 API 参考](../../../main/server/docs/api/API_REFERENCE.md)
