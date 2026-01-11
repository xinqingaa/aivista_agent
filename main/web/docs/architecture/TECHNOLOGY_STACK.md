# 技术栈详解 (Technology Stack)

## 1. 概述

本文档详细说明 AiVista Web 前端项目使用的技术栈，包括每个技术的选型理由、配置方式和最佳实践。

## 2. 核心框架

### 2.1 React 18+

**版本要求：** React 18.0+

**选型理由：**
- 成熟的 UI 框架，生态丰富
- 支持并发特性（Suspense、Transitions）
- 函数组件 + Hooks 的现代化开发方式
- 与 Next.js 完美集成

**关键特性使用：**
- **函数组件**: 所有组件使用函数组件
- **Hooks**: useState、useEffect、useCallback、useMemo
- **Suspense**: 代码分割和懒加载
- **Error Boundaries**: 错误边界处理

**配置：**
```json
// package.json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### 2.2 Next.js 14+

**版本要求：** Next.js 14.0+（App Router）

**选型理由：**
- 全栈框架，支持 SSR/SSG
- App Router 提供更好的开发体验
- 内置优化（图片优化、代码分割、字体优化）
- 与 React 18 特性完美结合

**关键特性使用：**
- **App Router**: 文件系统路由
- **Server Components**: 服务端组件（可选）
- **Client Components**: 客户端组件（'use client'）
- **API Routes**: 代理路由（解决 CORS）

**配置：**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['picsum.photos', 'your-image-domain.com'],
  },
  // 开发环境代理（可选）
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

## 3. 类型系统

### 3.1 TypeScript

**版本要求：** TypeScript 5.0+

**选型理由：**
- 类型安全，减少运行时错误
- 与后端类型定义保持一致
- 更好的 IDE 支持和自动补全
- 重构更安全

**配置：**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**类型定义组织：**
- 与后端类型保持一致（参考 `lib/types/`）
- 使用类型守卫（type guards）
- 避免使用 `any`，使用 `unknown` 替代

## 4. UI 与样式

### 4.1 TailwindCSS

**版本要求：** TailwindCSS 3.0+

**选型理由：**
- 原子化 CSS，快速开发
- 响应式设计支持完善
- 按需生成，体积小
- 与 Next.js 集成良好

**配置：**
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主色
        black: '#000000',
        white: '#FFFFFF',
        // 灰色系（辅助色）
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // 绿色系（修饰色）
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // 蓝色系（修饰色）
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // shadcn/ui 主题色（使用 CSS 变量）
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

**使用方式：**
```tsx
// 响应式类名
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* 内容 */}
</div>

// 状态变体
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700">
  按钮
</button>
```

**最佳实践：**
- 使用 `@apply` 提取重复样式（谨慎使用）
- 使用 CSS 变量定义主题色
- 移动端优先设计

### 4.2 shadcn/ui

**版本要求：** shadcn/ui（基于 Radix UI 和 TailwindCSS）

**选型理由：**
- 基于 Radix UI，完全无障碍
- 使用 TailwindCSS，样式完全可控
- 组件可复制到项目中，完全拥有代码
- 风格大方简洁，符合 AI Agent 工作流应用
- 支持深色/浅色主题切换
- 与 Next.js 集成良好

**初始化：**
```bash
npx shadcn-ui@latest init
```

**配置：**
```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**添加组件：**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
```

**主题系统：**
- 使用 CSS 变量定义主题色
- 支持深色/浅色模式切换
- 配色方案：黑色、白色为主，灰色系辅助，绿色/蓝色系修饰

**使用场景：**
- 所有 UI 组件基于 shadcn/ui 构建
- 按钮、输入框、卡片、对话框等基础组件
- 自定义组件可基于 shadcn/ui 组件扩展

## 5. 状态管理

### 5.1 Zustand

**版本要求：** Zustand 4.0+

**选型理由：**
- 轻量级，API 简单
- 无需 Provider，使用方便
- TypeScript 支持良好
- 性能优秀

**使用方式：**
```typescript
// stores/session-store.ts
import { create } from 'zustand';

interface SessionState {
  sessionId: string | null;
  messages: Message[];
  setSessionId: (id: string) => void;
  addMessage: (message: Message) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  messages: [],
  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
}));
```

**使用原则：**
- 作为项目唯一的状态管理方案
- 全局状态使用 Zustand Store
- 组件内部状态使用 useState/useReducer

## 6. 数据获取

### 6.1 Fetch API

**选型理由：**
- 浏览器原生 API，无需额外依赖
- 支持 async/await
- 与 Next.js 兼容良好

**封装方式：**
```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}
```

### 6.2 EventSource API（SSE）

**选型理由：**
- 浏览器原生 API
- 支持流式数据接收
- 自动重连机制（需要手动实现）

**封装方式：**
```typescript
// lib/sse/sse-client.ts
export class SSEClient {
  private eventSource: EventSource | null = null;
  
  connect(url: string, options: SSEOptions) {
    // 使用 fetch + ReadableStream 实现 POST SSE
    // 或使用 polyfill
  }
}
```

**注意：**
- 原生 EventSource 不支持 POST 请求
- 需要使用 fetch + ReadableStream 或 polyfill

### 6.3 SWR（可选）

**选型理由：**
- 数据缓存和同步
- 自动重新验证
- 请求去重

**使用场景：**
- 知识库列表、风格详情等需要缓存的数据

## 7. 性能优化

### 7.1 react-window / react-virtuoso

**选型理由：**
- 虚拟滚动，处理大量列表数据
- 性能优秀，内存占用低

**使用场景：**
- 聊天消息列表
- 知识库风格列表

**示例：**
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={100}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <MessageItem message={messages[index]} />
    </div>
  )}
</FixedSizeList>
```

### 7.2 next/image

**选型理由：**
- Next.js 内置图片优化
- 自动懒加载
- 响应式图片

**使用方式：**
```tsx
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="Generated image"
  width={800}
  height={600}
  loading="lazy"
/>
```

## 8. 开发工具

### 8.1 ESLint

**配置：**
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### 8.2 Prettier

**配置：**
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 9. 环境变量

### 9.1 配置方式

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SSE_URL=http://localhost:3000/api/agent/chat
```

**注意：**
- `NEXT_PUBLIC_` 前缀的变量会暴露到浏览器
- 敏感信息不要使用 `NEXT_PUBLIC_` 前缀

## 10. 构建与部署

### 10.1 构建命令

```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start
```

### 10.2 部署平台

- **Vercel**: Next.js 官方推荐，零配置部署
- **Netlify**: 支持 Next.js，配置简单
- **自建服务器**: 使用 Node.js 运行

## 11. 依赖管理

### 11.1 核心依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### 11.2 可选依赖

```json
{
  "dependencies": {
    "react-window": "^1.8.10",        // 虚拟滚动
    "swr": "^2.2.0",                  // 数据获取（可选）
    "tailwindcss-animate": "^1.0.7",  // shadcn/ui 动画支持
    "class-variance-authority": "^0.7.0", // shadcn/ui 变体工具
    "clsx": "^2.0.0",                 // className 工具
    "tailwind-merge": "^2.0.0"        // Tailwind 类名合并
  }
}
```

## 12. 主题系统

### 12.1 配色方案

**主色：**
- 黑色：`#000000`
- 白色：`#FFFFFF`

**辅助色：**
- 灰色系：用于背景、边框、文本等

**修饰色：**
- 绿色系：用于成功状态、边框装饰等
- 蓝色系：用于链接、强调、边框装饰等

### 12.2 深色/浅色模式

使用 `class` 策略实现主题切换：

```typescript
// 切换主题
const toggleTheme = () => {
  document.documentElement.classList.toggle('dark');
};
```

### 12.3 CSS 变量

shadcn/ui 使用 CSS 变量定义主题色，支持动态切换：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  /* ... */
}
```

详见 [配色方案文档](../styling/COLOR_SCHEME.md)。

## 13. 相关文档

- [架构设计](./ARCHITECTURE.md)
- [项目结构](./PROJECT_STRUCTURE.md)
- [开发最佳实践](../development/BEST_PRACTICES.md)
- [配色方案](../styling/COLOR_SCHEME.md)
