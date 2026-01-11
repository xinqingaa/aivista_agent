# 项目初始化指南 (Setup Guide)

## 1. 概述

本文档说明如何初始化 AiVista Web 前端项目，包括环境配置、依赖安装、开发服务器启动等。

## 2. 前置要求

### 2.1 Node.js

- **版本要求**: Node.js 18.0+ 或 20.0+
- **包管理器**: pnpm

### 2.2 后端服务

确保后端服务已启动并运行在 `http://localhost:3000`。

## 3. 项目初始化

### 3.1 创建 Next.js 项目

```bash
# 使用 create-next-app
npx create-next-app@latest aivista-web --typescript --tailwind --app

# 或手动创建
mkdir aivista-web
cd aivista-web
npm init -y
```

### 3.2 安装依赖

```bash
# 核心依赖
npm install react react-dom next

# 类型定义
npm install --save-dev @types/react @types/node typescript

# 样式
npm install tailwindcss postcss autoprefixer

# 状态管理
npm install zustand

# 虚拟滚动
npm install react-window
npm install --save-dev @types/react-window

# shadcn/ui 相关依赖
npm install class-variance-authority clsx tailwind-merge
npm install tailwindcss-animate

# 其他工具
npm install clsx
```

### 3.3 初始化 TailwindCSS

```bash
npx tailwindcss init -p
```

### 3.4 初始化 shadcn/ui

```bash
# 初始化 shadcn/ui
npx shadcn-ui@latest init
```

初始化时会提示配置选项，建议选择：
- **Style**: Default
- **Base color**: Slate
- **CSS variables**: Yes（用于主题切换）
- **Tailwind config**: tailwind.config.js
- **CSS file**: app/globals.css
- **Components**: @/components
- **Utils**: @/lib/utils

### 3.5 添加常用组件

```bash
# 添加基础组件
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
```

## 4. 项目结构

按照 [项目结构说明](../architecture/PROJECT_STRUCTURE.md) 创建目录结构：

```bash
mkdir -p app components/{genui,ui,layout,features,shared} lib/{api,sse,types,utils} hooks stores styles public docs
```

## 5. 配置文件

### 5.1 TypeScript 配置

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

### 5.2 TailwindCSS 配置

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

### 5.3 配置全局样式（主题变量）

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 5.4 Next.js 配置

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

## 6. 环境变量

### 6.1 创建环境变量文件

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SSE_URL=http://localhost:3000/api/agent/chat
```

### 6.2 环境变量示例

```bash
# .env.example
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SSE_URL=http://localhost:3000/api/agent/chat
```

## 7. 开发服务器

### 7.1 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3001`（或 Next.js 分配的端口）。

### 7.2 构建生产版本

```bash
npm run build
npm start
```

## 8. 代码规范

### 8.1 ESLint 配置

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

### 8.2 Prettier 配置

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

## 9. Git 配置

### 9.1 .gitignore

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build/
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
```

## 10. 验证安装

### 10.1 创建测试页面

```typescript
// app/page.tsx
export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">AiVista Web</h1>
      <p>项目初始化成功！</p>
    </div>
  );
}
```

### 10.2 测试 API 连接

```typescript
// 测试 API 连接
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/agent');
    const data = await response.json();
    console.log('API 连接成功:', data);
  } catch (error) {
    console.error('API 连接失败:', error);
  }
}
```

## 11. 常见问题

### 11.1 端口冲突

如果端口被占用，Next.js 会自动选择下一个可用端口。

### 11.2 CORS 错误

在开发环境中，使用 Next.js 的 rewrites 功能代理 API 请求。

### 11.3 类型错误

确保安装了所有必要的类型定义包：
```bash
npm install --save-dev @types/react @types/node @types/react-window
```

## 12. 主题切换实现

### 12.1 创建主题 Provider

```typescript
// components/theme-provider.tsx
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### 12.2 安装 next-themes

```bash
npm install next-themes
```

### 12.3 在根布局中使用

```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 12.4 创建主题切换组件

```typescript
// components/theme-toggle.tsx
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">切换主题</span>
    </Button>
  );
}
```

## 13. 相关文档

- [项目结构说明](../architecture/PROJECT_STRUCTURE.md)
- [技术栈详解](../architecture/TECHNOLOGY_STACK.md)
- [开发最佳实践](./BEST_PRACTICES.md)
- [配色方案](../styling/COLOR_SCHEME.md)
