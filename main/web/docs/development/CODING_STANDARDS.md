# 开发规范 (Coding Standards)

## 1. 概述

本文档定义 AiVista Web 项目的开发规范，包括代码风格、组件编写、Hook 使用等最佳实践。

## 2. 代码风格

### 2.1 TypeScript

- **类型定义**: 优先使用 TypeScript 类型，避免使用 `any`
- **接口命名**: 使用 PascalCase，以描述性名称命名
  ```typescript
  interface StyleData {
    id: string;
    style: string;
  }
  ```
- **类型导出**: 在 `lib/types/` 目录下组织类型定义
- **严格模式**: 项目关闭了 TypeScript 严格模式（`strict: false`），但仍建议编写类型安全的代码

### 2.2 代码格式

- **缩进**: 使用 2 个空格
- **引号**: 使用单引号（字符串）
- **分号**: 使用分号
- **行长度**: 建议不超过 100 字符

### 2.3 命名规范

详见 [文件命名规范](./NAMING_CONVENTIONS.md)

- **变量**: camelCase
- **常量**: UPPER_SNAKE_CASE
- **函数**: camelCase
- **组件**: PascalCase
- **Hook**: camelCase，以 `use` 开头

## 3. React 组件规范

### 3.1 组件结构

```typescript
'use client'; // 如果是客户端组件

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState('');

  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={onAction}>操作</Button>
    </div>
  );
}
```

### 3.2 组件编写原则

1. **单一职责**: 每个组件应该只负责一个功能
2. **可复用性**: 设计组件时考虑复用性
3. **Props 类型**: 始终定义 Props 接口
4. **默认导出**: 页面组件使用默认导出，其他组件使用命名导出
5. **客户端组件**: 需要交互的组件使用 `'use client'` 指令

### 3.3 组件文件组织

```
components/
  layout/
    Header.tsx          # 布局组件
  ui/
    Button.tsx          # 基础 UI 组件
  features/
    KnowledgeBase/
      StyleCard.tsx     # 功能组件
```

## 4. Hook 使用规范

### 4.1 自定义 Hook

- **命名**: 以 `use` 开头，使用 camelCase
- **文件命名**: 使用 kebab-case（如 `use-debounce.ts`）
- **单一职责**: 每个 Hook 应该只负责一个功能

```typescript
// hooks/use-debounce.ts
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### 4.2 Hook 使用原则

1. **只在顶层调用**: 不要在循环、条件或嵌套函数中调用 Hook
2. **只在 React 函数中调用**: 只在 React 函数组件或自定义 Hook 中调用
3. **依赖数组**: 正确使用 `useEffect` 的依赖数组

## 5. 样式规范

### 5.1 TailwindCSS

- **优先使用 TailwindCSS**: 使用 TailwindCSS 工具类而不是自定义 CSS
- **响应式设计**: 使用 TailwindCSS 响应式前缀（`sm:`, `md:`, `lg:`）
- **主题适配**: 使用 `dark:` 前缀适配深色模式

```typescript
<div className="bg-white dark:bg-black text-black dark:text-white">
  内容
</div>
```

### 5.2 颜色使用

- **主色**: 黑色、白色
- **辅助色**: 灰色系
- **修饰色**: 绿色系、蓝色系（用于边框和装饰）

详见 [配色方案](../styling/COLOR_SCHEME.md)

### 5.3 组件样式

- **shadcn/ui**: 使用 shadcn/ui 组件库
- **自定义样式**: 通过 `className` 属性扩展样式
- **样式合并**: 使用 `cn()` 工具函数合并类名

```typescript
import { cn } from '@/lib/utils';

<div className={cn('base-class', condition && 'conditional-class')} />
```

## 6. 状态管理

### 6.1 本地状态

- **useState**: 组件内部状态使用 `useState`
- **useReducer**: 复杂状态逻辑使用 `useReducer`

### 6.2 全局状态

- **Zustand**: 使用 Zustand 管理全局状态
- **Store 组织**: 在 `stores/` 目录下组织 Store

```typescript
// stores/useAppStore.ts
import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
```

## 7. API 调用规范

### 7.1 API 客户端

- **统一封装**: 使用 `lib/api/client.ts` 中的 `fetchAPI` 函数
- **错误处理**: 使用 `APIError` 类处理错误
- **类型安全**: 为 API 响应定义类型

```typescript
import { fetchAPI } from '@/lib/api/client';
import type { StyleData } from '@/lib/types/knowledge';

export async function getStyles(): Promise<StyleData[]> {
  return fetchAPI<StyleData[]>('/api/knowledge/styles');
}
```

### 7.2 错误处理

- **Try-Catch**: 使用 try-catch 处理异步错误
- **用户提示**: 使用 Toast 组件提示用户错误信息

```typescript
try {
  const data = await getStyles();
  setStyles(data);
} catch (err) {
  toast({
    variant: 'destructive',
    title: '错误',
    description: err instanceof Error ? err.message : '加载失败',
  });
}
```

## 8. 文件组织

### 8.1 目录结构

```
app/                    # Next.js App Router
components/            # React 组件
  ui/                 # 基础 UI 组件
  layout/             # 布局组件
  features/           # 功能组件
lib/                  # 工具库
  api/               # API 客户端
  types/             # 类型定义
  utils/             # 工具函数
hooks/               # 自定义 Hooks
stores/              # Zustand Stores
```

### 8.2 导入顺序

1. React 相关
2. Next.js 相关
3. 第三方库
4. 内部组件
5. 工具函数
6. 类型定义

```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. Next.js
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 3. 第三方库
import { Button } from '@/components/ui/button';

// 4. 内部组件
import { Header } from '@/components/layout/Header';

// 5. 工具函数
import { cn } from '@/lib/utils';

// 6. 类型定义
import type { StyleData } from '@/lib/types/knowledge';
```

## 9. 性能优化

### 9.1 组件优化

- **React.memo**: 对纯组件使用 `React.memo`
- **useMemo**: 对昂贵计算使用 `useMemo`
- **useCallback**: 对函数引用使用 `useCallback`

### 9.2 代码分割

- **动态导入**: 使用 `next/dynamic` 进行代码分割
- **懒加载**: 对大型组件使用懒加载

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>加载中...</p>,
});
```

## 10. 测试规范

### 10.1 单元测试

- **测试文件**: 使用 `.test.ts` 或 `.spec.ts` 后缀
- **测试覆盖**: 关键功能应该有测试覆盖

### 10.2 组件测试

- **测试工具**: 使用 React Testing Library
- **测试重点**: 测试用户交互和组件行为

## 11. Git 提交规范

### 11.1 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 11.2 提交类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具变更

## 12. 代码审查

### 12.1 审查清单

- [ ] 代码符合命名规范
- [ ] 类型定义完整
- [ ] 错误处理完善
- [ ] 性能优化考虑
- [ ] 响应式设计
- [ ] 无障碍支持

## 13. 参考文档

- [文件命名规范](./NAMING_CONVENTIONS.md)
- [项目结构](../architecture/PROJECT_STRUCTURE.md)
- [技术栈](../architecture/TECHNOLOGY_STACK.md)
- [最佳实践](./BEST_PRACTICES.md)
