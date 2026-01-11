# 开发最佳实践 (Best Practices)

## 1. 概述

本文档说明前端开发的最佳实践，包括代码规范、组件设计原则、状态管理模式等。

## 2. 代码规范

### 2.1 命名规范

**组件命名：**
- 使用 PascalCase：`Button.tsx`, `SmartCanvas.tsx`
- 文件名与组件名一致

**函数命名：**
- 使用 camelCase：`handleClick`, `fetchData`
- 事件处理函数以 `handle` 开头
- 工具函数使用动词：`formatDate`, `validateInput`

**变量命名：**
- 使用 camelCase：`userName`, `isLoading`
- 布尔值以 `is`, `has`, `should` 开头

**常量命名：**
- 使用 UPPER_SNAKE_CASE：`API_BASE_URL`, `MAX_RETRY_COUNT`

### 2.2 文件组织

```
components/
├── genui/
│   ├── SmartCanvas.tsx
│   └── index.ts          # 统一导出
├── ui/
│   ├── Button.tsx
│   └── index.ts
```

### 2.3 导入顺序

```typescript
// 1. React 相关
import { useState, useEffect } from 'react';

// 2. Next.js 相关
import Image from 'next/image';
import Link from 'next/link';

// 3. 第三方库
import { useSWR } from 'swr';

// 4. 内部模块（使用 @/ 别名）
import { Button } from '@/components/ui/Button';
import { useAgentChat } from '@/hooks/useAgentChat';
import { StyleData } from '@/lib/types';

// 5. 样式
import './styles.css';
```

## 3. 组件设计原则

### 3.1 单一职责

```typescript
// ✅ 好：单一职责
function MessageItem({ message }: { message: Message }) {
  return <div>{message.content}</div>;
}

// ❌ 不好：职责过多
function MessageItem({ message }: { message: Message }) {
  // 渲染消息
  // 处理点击
  // 发送请求
  // 更新状态
  // ...
}
```

### 3.2 可复用性

```typescript
// ✅ 好：可复用
function Button({ variant, size, children, ...props }: ButtonProps) {
  // ...
}

// ❌ 不好：硬编码
function SubmitButton() {
  return <button className="bg-blue-500">提交</button>;
}
```

### 3.3 组合优于继承

```typescript
// ✅ 好：使用组合
function Card({ children, header, footer }: CardProps) {
  return (
    <div>
      {header && <div>{header}</div>}
      {children}
      {footer && <div>{footer}</div>}
    </div>
  );
}

// ❌ 不好：使用继承
class Card extends BaseComponent {
  // ...
}
```

## 4. Hooks 使用

### 4.1 自定义 Hooks

```typescript
// ✅ 好：提取可复用逻辑
function useAgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  // ...
  return { messages, sendMessage };
}

// ❌ 不好：逻辑混在组件中
function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  // 大量逻辑...
}
```

### 4.2 Hooks 依赖

```typescript
// ✅ 好：正确声明依赖
useEffect(() => {
  fetchData(id);
}, [id]);

// ❌ 不好：缺少依赖
useEffect(() => {
  fetchData(id); // id 变化时不会重新执行
}, []);
```

### 4.3 避免不必要的重渲染

```typescript
// ✅ 好：使用 useCallback
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);

// ✅ 好：使用 useMemo
const filteredItems = useMemo(() => {
  return items.filter(item => item.active);
}, [items]);
```

## 5. 状态管理

### 5.1 状态提升

```typescript
// ✅ 好：状态提升到共同父组件
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <ChildA count={count} />
      <ChildB setCount={setCount} />
    </>
  );
}

// ❌ 不好：状态分散
function ChildA() {
  const [count, setCount] = useState(0);
  // ...
}
```

### 5.2 全局状态 vs 本地状态

```typescript
// ✅ 全局状态：跨组件共享
const useSessionStore = create((set) => ({
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
}));

// ✅ 本地状态：组件内部使用
function Component() {
  const [isOpen, setIsOpen] = useState(false);
  // ...
}
```

## 6. 错误处理

### 6.1 错误边界

```typescript
// ✅ 使用 ErrorBoundary
<ErrorBoundary fallback={<ErrorFallback />}>
  <YourComponent />
</ErrorBoundary>
```

### 6.2 API 错误处理

```typescript
// ✅ 统一错误处理
try {
  const data = await fetchAPI('/api/endpoint');
} catch (error) {
  if (error instanceof APIError) {
    // 处理 API 错误
  } else {
    // 处理其他错误
  }
}
```

## 7. 性能优化

### 7.1 代码分割

```typescript
// ✅ 懒加载组件
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
});
```

### 7.2 虚拟滚动

```typescript
// ✅ 大量数据使用虚拟滚动
<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={100}
>
  {({ index, style }) => (
    <div style={style}>
      <Item data={items[index]} />
    </div>
  )}
</FixedSizeList>
```

### 7.3 图片优化

```typescript
// ✅ 使用 Next.js Image
<Image
  src={imageUrl}
  alt="Image"
  width={800}
  height={600}
  loading="lazy"
/>
```

## 8. 类型安全

### 8.1 使用 TypeScript

```typescript
// ✅ 定义类型
interface User {
  id: string;
  name: string;
}

function UserCard({ user }: { user: User }) {
  // ...
}

// ❌ 避免 any
function processData(data: any) {
  // ...
}
```

### 8.2 类型守卫

```typescript
// ✅ 使用类型守卫
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
}
```

## 9. 测试

### 9.1 单元测试

```typescript
// ✅ 测试工具函数
describe('formatDate', () => {
  it('should format date correctly', () => {
    expect(formatDate(new Date('2024-01-01'))).toBe('2024-01-01');
  });
});
```

### 9.2 组件测试

```typescript
// ✅ 测试组件渲染
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

## 10. 文档

### 10.1 组件文档

```typescript
/**
 * 按钮组件
 * 
 * @param variant - 按钮变体：primary | secondary | danger
 * @param size - 按钮尺寸：sm | md | lg
 * @param loading - 是否显示加载状态
 */
export function Button({ variant, size, loading }: ButtonProps) {
  // ...
}
```

### 10.2 代码注释

```typescript
// ✅ 解释"为什么"，而不是"做什么"
// 使用防抖减少 API 调用频率
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  [handleSearch]
);
```

## 11. 安全

### 11.1 输入验证

```typescript
// ✅ 验证用户输入
function validateInput(input: string): boolean {
  return input.length > 0 && input.length <= 1000;
}
```

### 11.2 XSS 防护

```typescript
// ✅ 使用 React 自动转义
<div>{userInput}</div>

// ❌ 避免 dangerouslySetInnerHTML（除非必要）
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

## 12. 相关文档

- [项目结构说明](../architecture/PROJECT_STRUCTURE.md)
- [性能优化](../performance/OPTIMIZATION.md)
- [响应式设计](../styling/RESPONSIVE_DESIGN.md)
