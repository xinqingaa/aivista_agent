# 通用 UI 组件 (UI Components)

## 1. 概述

本文档说明项目中使用的通用 UI 组件，这些组件基于 shadcn/ui 构建，风格大方简洁，配色以黑色、白色为主，灰色系辅助，绿色/蓝色系作为修饰色。

## 2. 组件库

### 2.1 shadcn/ui

项目使用 **shadcn/ui** 作为基础组件库：

- 基于 Radix UI，完全无障碍
- 使用 TailwindCSS，样式完全可控
- 组件代码复制到项目中，完全拥有
- 支持深色/浅色主题切换
- 风格大方简洁，符合 AI Agent 工作流应用

### 2.2 组件列表

所有基础组件基于 shadcn/ui：

- **Button**: 按钮组件
- **Input**: 输入框组件
- **Textarea**: 文本域组件
- **Card**: 卡片组件
- **Loading**: 加载状态组件（自定义）
- **ErrorBoundary**: 错误边界组件（自定义）
- **Dialog**: 对话框组件
- **Select**: 选择器组件
- **Toast**: 提示组件
- **Dropdown Menu**: 下拉菜单组件

## 3. 组件实现

### 3.1 安装 shadcn/ui 组件

```bash
# 添加基础组件
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dropdown-menu
```

### 3.2 Button 组件

shadcn/ui 的 Button 组件已包含多种变体，我们基于它进行扩展：

```typescript
// components/ui/button.tsx (shadcn/ui 生成)
// 使用 shadcn/ui 的 Button 组件

// 扩展 Button 以支持 loading 状态
import { Button as ShadcnButton } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function Button({ loading, disabled, children, ...props }: ButtonProps) {
  return (
    <ShadcnButton disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          加载中...
        </>
      ) : (
        children
      )}
    </ShadcnButton>
  );
}
```

**shadcn/ui Button 变体：**
- `default`: 默认样式（黑色背景白色文本，浅色模式）/ 白色背景黑色文本（深色模式）
- `destructive`: 危险操作（红色）
- `outline`: 轮廓样式（边框）
- `secondary`: 次要操作（灰色）
- `ghost`: 幽灵样式（透明背景）
- `link`: 链接样式

**使用示例：**
```typescript
import { Button } from '@/components/ui/button';

// 主要按钮（黑色/白色）
<Button variant="default">主要按钮</Button>

// 次要按钮（灰色）
<Button variant="secondary">次要按钮</Button>

// 轮廓按钮（边框装饰，可使用绿色/蓝色）
<Button variant="outline" className="border-green-400 text-green-600 dark:border-green-600 dark:text-green-400">
  装饰按钮
</Button>

// 加载状态
<Button loading>提交</Button>
```

### 3.3 Input 组件

使用 shadcn/ui 的 Input 组件，并添加 Label 和错误提示：

```typescript
// components/ui/input.tsx (shadcn/ui 生成)
// 直接使用 shadcn/ui 的 Input

// 扩展 Input 组件以支持 Label 和错误提示
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id}>
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <ShadcnInput
          ref={ref}
          className={cn(error && 'border-destructive', className)}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

**使用示例：**
```typescript
import { Input } from '@/components/ui/input';

<Input
  label="用户名"
  type="text"
  placeholder="请输入用户名"
  required
  error={errors.username}
  helperText="用户名长度为 3-20 个字符"
/>
```

### 3.4 Textarea 组件

使用 shadcn/ui 的 Textarea 组件：

```typescript
// components/ui/textarea.tsx (shadcn/ui 生成)
// 直接使用 shadcn/ui 的 Textarea

// 扩展 Textarea 组件
import { Textarea as ShadcnTextarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id}>
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <ShadcnTextarea
          ref={ref}
          className={cn(error && 'border-destructive', className)}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
```

### 3.5 Card 组件

使用 shadcn/ui 的 Card 组件：

```typescript
// components/ui/card.tsx (shadcn/ui 生成)
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

// 扩展 Card 以支持 hover 和 onClick
interface ExtendedCardProps extends React.ComponentProps<typeof Card> {
  hover?: boolean;
  onClick?: () => void;
}

export function ExtendedCard({ hover, onClick, className, ...props }: ExtendedCardProps) {
  return (
    <Card
      className={cn(
        hover && 'hover:shadow-lg transition-shadow cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    />
  );
}
```

**使用示例：**
```typescript
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

<Card hover onClick={handleCardClick}>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>
    <p>内容</p>
  </CardContent>
  <CardFooter>
    <Button>操作</Button>
  </CardFooter>
</Card>
```

### 3.6 Loading 组件

自定义加载组件，使用简洁的黑色/白色配色：

```typescript
// components/ui/loading.tsx
'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ size = 'md', text, fullScreen = false }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={cn(sizeClasses[size], 'animate-spin text-foreground')} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}
```

**使用示例：**
```typescript
import { Loading } from '@/components/ui/loading';

{isLoading && <Loading text="加载中..." />}
{isLoading && <Loading fullScreen text="加载中..." />}
```

### 3.7 ErrorBoundary 组件

自定义错误边界组件，使用 shadcn/ui 的 Alert 组件：

```typescript
// components/ui/error-boundary.tsx
'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>出现错误</AlertTitle>
          <AlertDescription>
            {this.state.error?.message || '未知错误'}
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            重试
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

## 4. shadcn/ui 其他组件

### 4.1 Dialog 对话框

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>打开对话框</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
      <DialogDescription>描述</DialogDescription>
    </DialogHeader>
    <div>内容</div>
  </DialogContent>
</Dialog>
```

### 4.2 Toast 提示

```typescript
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();

  return (
    <Button
      onClick={() => {
        toast({
          title: '成功',
          description: '操作已完成',
        });
      }}
    >
      显示提示
    </Button>
  );
}
```

### 4.3 Select 选择器

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="选择选项" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">选项 1</SelectItem>
    <SelectItem value="option2">选项 2</SelectItem>
  </SelectContent>
</Select>
```

## 5. 使用示例

### 5.1 Button 使用

```typescript
import { Button } from '@/components/ui/button';

// 主要按钮（黑色/白色）
<Button variant="default">主要按钮</Button>

// 次要按钮（灰色）
<Button variant="secondary">次要按钮</Button>

// 轮廓按钮（装饰边框）
<Button variant="outline" className="border-green-400 text-green-600">
  装饰按钮
</Button>

// 加载状态
<Button loading>提交</Button>
```

### 5.2 Input 使用

```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="username">用户名</Label>
  <Input id="username" placeholder="请输入用户名" />
</div>
```

### 5.3 Card 使用

```typescript
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    <p>内容</p>
  </CardContent>
  <CardFooter>
    <Button>操作</Button>
  </CardFooter>
</Card>
```

### 5.4 Loading 使用

```typescript
import { Loading } from '@/components/ui/loading';

{isLoading && <Loading text="加载中..." />}
{isLoading && <Loading fullScreen text="加载中..." />}
```

### 5.5 ErrorBoundary 使用

```typescript
import { ErrorBoundary } from '@/components/ui/error-boundary';

<ErrorBoundary
  fallback={<div>组件加载失败</div>}
  onError={(error, errorInfo) => {
    console.error(error, errorInfo);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## 6. 样式定制

### 6.1 shadcn/ui 组件定制

shadcn/ui 组件使用 `class-variance-authority` (cva) 管理变体，所有组件代码都在项目中，可以直接修改：

```typescript
// components/ui/button.tsx (shadcn/ui 生成)
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

### 6.2 配色方案应用

**主要按钮（黑色/白色）：**
```typescript
// 使用 default 变体，通过 CSS 变量自动适配主题
<Button variant="default">主要按钮</Button>
```

**装饰按钮（绿色/蓝色边框）：**
```typescript
// 使用 outline 变体，添加自定义颜色
<Button 
  variant="outline" 
  className="border-green-400 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
>
  装饰按钮
</Button>
```

### 6.3 工具函数

shadcn/ui 提供 `cn` 工具函数用于合并类名：

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**使用示例：**
```typescript
import { cn } from '@/lib/utils';

<div className={cn('base-class', condition && 'conditional-class', className)}>
  内容
</div>
```

## 7. 主题适配

### 7.1 深色/浅色模式

所有 shadcn/ui 组件自动支持深色/浅色模式，通过 CSS 变量实现：

```typescript
// 组件自动适配主题
<Button variant="default">
  {/* 浅色模式：黑色背景白色文本 */}
  {/* 深色模式：白色背景黑色文本 */}
</Button>

<Card>
  {/* 自动使用 background 和 foreground 变量 */}
</Card>
```

### 7.2 自定义颜色

使用 TailwindCSS 的 `dark:` 前缀自定义深色模式样式：

```typescript
<div className="bg-white dark:bg-black text-black dark:text-white">
  内容
</div>
```

## 8. 无障碍支持

shadcn/ui 基于 Radix UI，所有组件都完全无障碍：

- 自动 ARIA 属性
- 键盘导航支持
- 屏幕阅读器支持
- 焦点管理

## 9. 扩展组件

### 9.1 基于 shadcn/ui 构建自定义组件

```typescript
// components/ui/custom-button.tsx
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomButtonProps extends React.ComponentProps<typeof Button> {
  decoration?: 'green' | 'blue';
}

export function CustomButton({ decoration, className, ...props }: CustomButtonProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        decoration === 'green' && 'border-green-400 text-green-600 dark:border-green-600 dark:text-green-400',
        decoration === 'blue' && 'border-blue-400 text-blue-600 dark:border-blue-600 dark:text-blue-400',
        className
      )}
      {...props}
    />
  );
}
```

## 10. 相关文档

- [响应式设计](../styling/RESPONSIVE_DESIGN.md)
- [配色方案](../styling/COLOR_SCHEME.md)
- [开发最佳实践](../development/BEST_PRACTICES.md)
- [shadcn/ui 官方文档](https://ui.shadcn.com/)
