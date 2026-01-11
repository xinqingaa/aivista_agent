# 配色方案文档 (Color Scheme)

## 1. 概述

本文档定义 AiVista Web 前端的配色方案，整体风格大方简洁，以黑色、白色为主，灰色系作为辅助色，绿色系和蓝色系作为修饰色。

## 2. 配色原则

### 2.1 设计理念

- **大方简洁**: 界面设计简洁明了，避免过度装饰
- **高对比度**: 确保文本清晰可读
- **层次分明**: 使用颜色建立视觉层次
- **主题适配**: 支持深色/浅色模式无缝切换

### 2.2 颜色角色

- **主色**: 黑色、白色 - 用于主要背景和文本
- **辅助色**: 灰色系 - 用于边框、次要文本、背景层次
- **修饰色**: 绿色系、蓝色系 - 用于强调、装饰、交互反馈

## 3. 颜色定义

### 3.1 主色

#### 黑色 (Black)
- **Hex**: `#000000`
- **使用场景**: 
  - 深色模式背景
  - 深色模式主要文本
  - 强调元素
  - 边框装饰

#### 白色 (White)
- **Hex**: `#FFFFFF`
- **使用场景**:
  - 浅色模式背景
  - 浅色模式主要文本
  - 卡片背景
  - 对话框背景

### 3.2 灰色系（辅助色）

```typescript
const gray = {
  50: '#f9fafb',   // 最浅 - 浅色模式背景层次
  100: '#f3f4f6',  // 浅色模式次要背景
  200: '#e5e7eb', // 浅色模式边框
  300: '#d1d5db', // 浅色模式禁用状态
  400: '#9ca3af', // 浅色模式次要文本
  500: '#6b7280', // 中性灰色
  600: '#4b5563', // 深色模式次要文本
  700: '#374151', // 深色模式边框
  800: '#1f2937', // 深色模式次要背景
  900: '#111827', // 深色模式背景层次
};
```

**使用场景：**
- `gray-50/100`: 浅色模式背景层次、卡片背景
- `gray-200/300`: 浅色模式边框、分割线
- `gray-400/500`: 次要文本、占位符
- `gray-600/700`: 深色模式边框、次要文本
- `gray-800/900`: 深色模式背景层次

### 3.3 绿色系（修饰色）

```typescript
const green = {
  50: '#f0fdf4',   // 最浅
  100: '#dcfce7',  // 浅色背景
  200: '#bbf7d0',  // 浅色边框
  300: '#86efac',  // 浅色强调
  400: '#4ade80',  // 中等强调
  500: '#22c55e',  // 主要绿色
  600: '#16a34a',  // 深色强调
  700: '#15803d',  // 深色模式使用
  800: '#166534',  // 深色模式边框
  900: '#14532d',  // 最深
};
```

**使用场景：**
- 成功状态提示
- 边框装饰（细边框）
- 强调元素（小图标、徽章）
- 进度指示器
- 确认按钮（可选）

**使用原则：**
- 主要用于装饰和强调，不作为主要交互色
- 使用较浅的绿色（300-500）避免过于抢眼
- 深色模式使用较深的绿色（700-900）

### 3.4 蓝色系（修饰色）

```typescript
const blue = {
  50: '#eff6ff',   // 最浅
  100: '#dbeafe',  // 浅色背景
  200: '#bfdbfe',  // 浅色边框
  300: '#93c5fd',  // 浅色强调
  400: '#60a5fa',  // 中等强调
  500: '#3b82f6',  // 主要蓝色
  600: '#2563eb',  // 深色强调
  700: '#1d4ed8',  // 深色模式使用
  800: '#1e40af',  // 深色模式边框
  900: '#1e3a8a',  // 最深
};
```

**使用场景：**
- 链接文本
- 交互元素（按钮、输入框焦点）
- 边框装饰（细边框）
- 强调元素（小图标、徽章）
- 信息提示

**使用原则：**
- 主要用于交互和链接，适度使用
- 使用中等蓝色（400-600）保持专业感
- 深色模式使用较深的蓝色（700-900）

## 4. TailwindCSS 配置

### 4.1 颜色配置

```javascript
// tailwind.config.js
module.exports = {
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
      },
    },
  },
};
```

### 4.2 shadcn/ui 主题色

shadcn/ui 使用 CSS 变量定义主题色，支持深色/浅色模式切换：

```css
:root {
  --background: 0 0% 100%;        /* 白色 */
  --foreground: 222.2 84% 4.9%;   /* 深灰色（接近黑色）*/
  --border: 214.3 31.8% 91.4%;   /* 浅灰色 */
  --primary: 222.2 47.4% 11.2%;   /* 深灰色 */
  --secondary: 210 40% 96.1%;     /* 浅灰色 */
  --muted: 210 40% 96.1%;         /* 浅灰色 */
  --accent: 210 40% 96.1%;         /* 浅灰色 */
}

.dark {
  --background: 222.2 84% 4.9%;   /* 深灰色（接近黑色）*/
  --foreground: 210 40% 98%;      /* 浅灰色（接近白色）*/
  --border: 217.2 32.6% 17.5%;    /* 深灰色 */
  --primary: 210 40% 98%;         /* 浅灰色（接近白色）*/
  --secondary: 217.2 32.6% 17.5%; /* 深灰色 */
  --muted: 217.2 32.6% 17.5%;     /* 深灰色 */
  --accent: 217.2 32.6% 17.5%;    /* 深灰色 */
}
```

## 5. 使用示例

### 5.1 背景和文本

```typescript
// 浅色模式
<div className="bg-white text-black">
  内容
</div>

// 深色模式
<div className="bg-black text-white dark:bg-black dark:text-white">
  内容
</div>

// 自适应（推荐）
<div className="bg-white dark:bg-black text-black dark:text-white">
  内容
</div>
```

### 5.2 边框装饰

```typescript
// 使用灰色作为主要边框
<div className="border border-gray-200 dark:border-gray-700">
  内容
</div>

// 使用绿色作为装饰边框（细边框）
<div className="border-l-2 border-green-400">
  内容
</div>

// 使用蓝色作为装饰边框（细边框）
<div className="border-l-2 border-blue-400">
  内容
</div>
```

### 5.3 卡片设计

```typescript
// 浅色模式卡片
<div className="bg-white border border-gray-200 rounded-lg p-4">
  卡片内容
</div>

// 深色模式卡片
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
  卡片内容
</div>
```

### 5.4 按钮设计

```typescript
// 主要按钮（使用黑色/白色）
<button className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100">
  主要按钮
</button>

// 次要按钮（使用灰色）
<button className="bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
  次要按钮
</button>

// 装饰按钮（使用绿色/蓝色作为边框）
<button className="border-2 border-green-400 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20">
  装饰按钮
</button>
```

### 5.5 链接设计

```typescript
// 链接使用蓝色
<a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
  链接文本
</a>
```

### 5.6 状态提示

```typescript
// 成功状态（使用绿色）
<div className="bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
  成功消息
</div>

// 信息提示（使用蓝色）
<div className="bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
  信息提示
</div>
```

## 6. 深色/浅色模式

### 6.1 模式切换

使用 `next-themes` 实现主题切换：

```typescript
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      切换主题
    </button>
  );
}
```

### 6.2 颜色适配

所有颜色都需要考虑深色/浅色模式：

```typescript
// 文本颜色
className="text-black dark:text-white"

// 背景颜色
className="bg-white dark:bg-black"

// 边框颜色
className="border-gray-200 dark:border-gray-700"

// 修饰色（绿色）
className="border-green-400 dark:border-green-600"

// 修饰色（蓝色）
className="text-blue-600 dark:text-blue-400"
```

## 7. 配色指南

### 7.1 主要区域

- **背景**: 白色（浅色模式）/ 黑色（深色模式）
- **主要文本**: 黑色（浅色模式）/ 白色（深色模式）
- **次要文本**: 灰色 400-500（浅色模式）/ 灰色 400-500（深色模式）

### 7.2 边框和分割线

- **主要边框**: 灰色 200（浅色模式）/ 灰色 700（深色模式）
- **装饰边框**: 绿色 400/蓝色 400（浅色模式）/ 绿色 600/蓝色 600（深色模式）

### 7.3 交互元素

- **链接**: 蓝色 600（浅色模式）/ 蓝色 400（深色模式）
- **按钮**: 黑色背景白色文本（浅色模式）/ 白色背景黑色文本（深色模式）
- **焦点状态**: 蓝色 500（浅色模式）/ 蓝色 400（深色模式）

### 7.4 状态提示

- **成功**: 绿色 50 背景 + 绿色 800 文本（浅色模式）/ 绿色 900/20 背景 + 绿色 400 文本（深色模式）
- **信息**: 蓝色 50 背景 + 蓝色 800 文本（浅色模式）/ 蓝色 900/20 背景 + 蓝色 400 文本（深色模式）

## 8. 设计原则

### 8.1 简洁原则

- 避免使用过多颜色
- 主要使用黑色、白色、灰色
- 绿色和蓝色仅用于装饰和强调

### 8.2 对比度原则

- 确保文本与背景对比度符合 WCAG AA 标准（至少 4.5:1）
- 主要文本使用高对比度（黑色/白色）
- 次要文本使用中等对比度（灰色）

### 8.3 一致性原则

- 相同功能的元素使用相同颜色
- 保持深色/浅色模式颜色对应关系
- 使用 TailwindCSS 类名保持一致性

## 9. 相关文档

- [响应式设计](./RESPONSIVE_DESIGN.md)
- [技术栈详解](../architecture/TECHNOLOGY_STACK.md)
- [项目初始化](../development/SETUP.md)
