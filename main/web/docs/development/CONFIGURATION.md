# 配置文档 (Configuration)

## 1. 概述

本文档说明前端项目的所有配置项，包括环境变量、工作流配置、超时和重试配置等。

## 2. 环境变量

### 2.1 必需配置

```bash
# .env.local

# API 基础 URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# SSE 端点 URL
NEXT_PUBLIC_SSE_URL=http://localhost:3000/api/agent/chat
```

### 2.2 可选配置

```bash
# 开发环境代理（Next.js rewrites）
# 如果后端和前端不在同一域名，可以使用代理

# 图片域名白名单（Next.js Image 组件）
# 在 next.config.js 中配置
```

### 2.3 环境变量说明

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | 后端 API 基础 URL | `http://localhost:3000` | 是 |
| `NEXT_PUBLIC_SSE_URL` | SSE 端点完整 URL | `http://localhost:3000/api/agent/chat` | 否（可自动构建） |

**注意：**
- `NEXT_PUBLIC_` 前缀的变量会暴露到浏览器
- 敏感信息不要使用 `NEXT_PUBLIC_` 前缀
- 生产环境需要配置正确的 API URL

## 3. Next.js 配置

### 3.1 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 图片优化配置
  images: {
    domains: [
      'picsum.photos',
      'your-image-domain.com',
      // 添加其他图片域名
    ],
    // 图片格式支持
    formats: ['image/avif', 'image/webp'],
  },
  
  // 开发环境代理（解决 CORS）
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

## 4. 工作流配置

### 4.1 超时配置

```typescript
// lib/config/workflow.ts
export const WORKFLOW_CONFIG = {
  // 节点超时时间（毫秒）
  nodeTimeouts: {
    planner: 10 * 1000,    // 10 秒
    rag: 5 * 1000,         // 5 秒
    executor: 5 * 1000,    // 5 秒
    critic: 8 * 1000,      // 8 秒
  },
  
  // 总超时时间
  totalTimeout: 60 * 1000, // 60 秒
  
  // 重试配置
  retry: {
    maxRetries: 3,
    retryIntervals: [5000, 10000, 20000], // 5s, 10s, 20s
  },
};
```

### 4.2 重试配置

```typescript
// lib/config/retry.ts
export const RETRY_CONFIG = {
  // 最大重试次数
  maxRetries: 3,
  
  // 重试间隔（毫秒）
  intervals: [5000, 10000, 20000], // 指数退避
  
  // 可重试的错误代码
  retryableErrors: [
    'LLM_API_ERROR',
    'EXECUTION_TIMEOUT',
    'VECTOR_DB_ERROR',
    'WORKFLOW_ERROR',
  ],
};
```

## 5. SSE 配置

### 5.1 连接配置

```typescript
// lib/config/sse.ts
export const SSE_CONFIG = {
  // 最大重连次数
  maxReconnectAttempts: 3,
  
  // 重连间隔（毫秒）
  reconnectDelays: [2000, 4000, 8000], // 指数退避
  
  // 心跳间隔（毫秒）
  heartbeatInterval: 30 * 1000, // 30 秒
  
  // 连接超时（毫秒）
  connectionTimeout: 10 * 1000, // 10 秒
};
```

### 5.2 事件处理配置

```typescript
// lib/config/events.ts
export const EVENT_CONFIG = {
  // 事件去重时间窗口（毫秒）
  dedupeWindow: 1000,
  
  // 批量处理间隔（毫秒）
  batchInterval: 100,
  
  // 最大批量大小
  maxBatchSize: 5,
};
```

## 6. 性能配置

### 6.1 虚拟滚动配置

```typescript
// lib/config/virtual-scroll.ts
export const VIRTUAL_SCROLL_CONFIG = {
  // 消息列表
  messageList: {
    itemHeight: 100,
    overscan: 5, // 预渲染项目数
  },
  
  // 知识库列表
  knowledgeList: {
    itemHeight: 200,
    overscan: 3,
  },
  
  // 思考日志
  thoughtLog: {
    itemHeight: 60,
    overscan: 10,
  },
};
```

### 6.2 缓存配置

```typescript
// lib/config/cache.ts
export const CACHE_CONFIG = {
  // API 响应缓存时间（毫秒）
  apiCacheTime: 5 * 60 * 1000, // 5 分钟
  
  // 图片缓存策略
  imageCache: {
    maxAge: 31536000, // 1 年
    immutable: true,
  },
};
```

## 7. UI 配置

### 7.1 主题配置

```typescript
// lib/config/theme.ts
export const THEME_CONFIG = {
  // 默认主题
  defaultTheme: 'system', // 'light' | 'dark' | 'system'
  
  // 主题存储键
  storageKey: 'aivista-theme',
  
  // 主题切换动画
  enableTransition: true,
};
```

### 7.2 响应式配置

```typescript
// lib/config/responsive.ts
export const RESPONSIVE_CONFIG = {
  // 断点
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
  
  // 容器最大宽度
  containerMaxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};
```

## 8. 数据限制配置

### 8.1 消息历史

```typescript
// lib/config/limits.ts
export const LIMITS = {
  // 最大消息数
  maxMessages: 50,
  
  // 最大组件数
  maxComponents: 100,
  
  // 最大文本长度
  maxTextLength: 1000,
  
  // 最大蒙版大小（字节）
  maxMaskSize: 10 * 1024 * 1024, // 10MB
  
  // 最大坐标点数
  maxCoordinates: 10000,
  
  // 最大路径数
  maxPaths: 100,
};
```

## 9. 开发配置

### 9.1 开发工具配置

```typescript
// lib/config/dev.ts
export const DEV_CONFIG = {
  // 启用调试日志
  enableDebugLogs: process.env.NODE_ENV === 'development',
  
  // 启用性能监控
  enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
  
  // Mock 数据（开发环境）
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK === 'true',
};
```

### 9.2 日志配置

```typescript
// lib/config/logging.ts
export const LOGGING_CONFIG = {
  // 日志级别
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  
  // 是否记录 SSE 事件
  logSSEEvents: process.env.NODE_ENV === 'development',
  
  // 是否记录性能指标
  logPerformance: process.env.NODE_ENV === 'development',
};
```

## 10. 配置管理

### 10.1 配置集中管理

```typescript
// lib/config/index.ts
import { WORKFLOW_CONFIG } from './workflow';
import { SSE_CONFIG } from './sse';
import { LIMITS } from './limits';
import { THEME_CONFIG } from './theme';

export const CONFIG = {
  workflow: WORKFLOW_CONFIG,
  sse: SSE_CONFIG,
  limits: LIMITS,
  theme: THEME_CONFIG,
  api: {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    sseURL: process.env.NEXT_PUBLIC_SSE_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/agent/chat`,
  },
} as const;
```

### 10.2 配置验证

```typescript
// lib/config/validate.ts
export function validateConfig() {
  const errors: string[] = [];

  if (!process.env.NEXT_PUBLIC_API_URL) {
    errors.push('NEXT_PUBLIC_API_URL 未设置');
  }

  if (CONFIG.limits.maxMessages > 100) {
    errors.push('最大消息数不能超过 100');
  }

  if (errors.length > 0) {
    console.error('配置验证失败:', errors);
    throw new Error(`配置错误: ${errors.join(', ')}`);
  }
}
```

## 11. 生产环境配置

### 11.1 环境变量

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SSE_URL=https://api.yourdomain.com/api/agent/chat
```

### 11.2 构建配置

```bash
# 生产构建
npm run build

# 分析构建产物
ANALYZE=true npm run build
```

## 12. 相关文档

- [项目初始化](./SETUP.md)
- [边界条件](../features/BOUNDARY_CONDITIONS.md)
- [后端配置](../../../main/server/docs/workflow/AGENT_WORKFLOW_DESIGN.md#配置说明)
