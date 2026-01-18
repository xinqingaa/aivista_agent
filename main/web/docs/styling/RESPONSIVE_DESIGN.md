# 响应式设计 (Responsive Design)

## 1. 概述

本文档说明如何使用 TailwindCSS 实现 PC 端和移动端的响应式设计。

## 2. TailwindCSS 断点

### 2.1 默认断点

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // 小屏设备
      'md': '768px',  // 平板
      'lg': '1024px', // 桌面
      'xl': '1280px', // 大屏桌面
      '2xl': '1536px', // 超大屏
    },
  },
};
```

### 2.2 使用方式

```typescript
// 移动端优先设计
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* 移动端：100% 宽度 */}
  {/* 平板：50% 宽度 */}
  {/* 桌面：33% 宽度 */}
</div>
```

## 3. 布局适配

### 3.1 网格布局

```typescript
// 响应式网格
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 移动端：1列 */}
  {/* 平板：2列 */}
  {/* 桌面：3列 */}
</div>
```

### 3.2 Flexbox 布局

```typescript
// 响应式 Flex
<div className="flex flex-col md:flex-row gap-4">
  {/* 移动端：垂直排列 */}
  {/* 平板及以上：水平排列 */}
</div>
```

### 3.3 容器宽度

```typescript
// 响应式容器
<div className="container mx-auto px-4 md:px-6 lg:px-8">
  {/* 内容 */}
</div>
```

## 4. 组件适配

### 4.1 文本大小

```typescript
// 响应式文本
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  标题
</h1>

<p className="text-sm md:text-base lg:text-lg">
  正文
</p>
```

### 4.2 间距

```typescript
// 响应式间距
<div className="p-4 md:p-6 lg:p-8">
  {/* 移动端：小间距 */}
  {/* 桌面：大间距 */}
</div>
```

### 4.3 显示/隐藏

```typescript
// 响应式显示
<div className="hidden md:block">
  {/* 移动端隐藏，平板及以上显示 */}
</div>

<div className="block md:hidden">
  {/* 移动端显示，平板及以上隐藏 */}
</div>
```

## 5. 实际应用

### 5.1 聊天界面

```typescript
// components/layout/ChatContainer.tsx
export function ChatContainer() {
  return (
    <div className="flex flex-col h-screen">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4">
        <MessageList />
      </div>

      {/* 输入区域：移动端固定在底部 */}
      <div className="sticky bottom-0 border-t bg-white p-2 md:p-4">
        <TextInput />
      </div>
    </div>
  );
}
```

### 5.2 知识库列表

```typescript
// components/knowledge/StyleList.tsx
export function StyleList({ styles }: { styles: StyleData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {styles.map((style) => (
        <StyleCard key={style.id} style={style} />
      ))}
    </div>
  );
}
```

### 5.3 导航栏

```typescript
// components/layout/Header.tsx
export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold">AiVista</h1>
          
          {/* 移动端：汉堡菜单 */}
          <button className="md:hidden">
            <MenuIcon />
          </button>
          
          {/* 桌面端：导航链接 */}
          <nav className="hidden md:flex gap-4">
            <Link href="/">首页</Link>
            <Link href="/knowledge">知识库</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
```

## 6. 触摸优化

### 6.1 触摸目标大小

```typescript
// 确保触摸目标至少 44x44px
<button className="min-w-[44px] min-h-[44px]">
  按钮
</button>
```

### 6.2 触摸反馈

```typescript
// 使用 active 状态提供触摸反馈
<button className="active:scale-95 transition-transform">
  按钮
</button>
```

## 7. 移动端特定优化

### 7.1 视口设置

```typescript
// app/layout.tsx
export const metadata = {
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};
```

### 7.2 防止缩放

```typescript
// 某些输入框可能需要禁用缩放
<input
  type="text"
  className="text-base" // 防止 iOS 自动缩放
/>
```

### 7.3 安全区域

```typescript
// 适配 iPhone 刘海屏
<div className="pb-safe">
  {/* 内容 */}
</div>

// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
};
```

## 8. 图片响应式

### 8.1 Next.js Image

```typescript
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="Image"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="w-full h-auto"
/>
```

## 9. 测试

### 9.1 浏览器 DevTools

使用 Chrome DevTools 的设备模拟器测试不同屏幕尺寸。

### 9.2 实际设备测试

在真实设备上测试：
- iPhone (各种尺寸)
- Android 设备
- iPad
- 桌面浏览器

## 10. 主题切换

### 10.1 使用 next-themes

```typescript
// 在组件中使用主题
import { useTheme } from 'next-themes';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      切换主题
    </button>
  );
}
```

### 10.2 主题类名

```typescript
// 使用 dark: 前缀应用深色模式样式
<div className="bg-white dark:bg-black text-black dark:text-white">
  内容
</div>
```

### 10.3 响应式主题

主题切换在所有设备上保持一致，使用 `class` 策略存储在 localStorage 中。

## 11. 配色方案

### 11.1 主色使用

- **黑色**: 用于深色模式背景、主要文本
- **白色**: 用于浅色模式背景、主要文本

### 11.2 辅助色使用

- **灰色系**: 用于边框、次要文本、背景层次

### 11.3 修饰色使用

- **绿色系**: 用于成功状态、边框装饰、强调元素
- **蓝色系**: 用于链接、交互元素、边框装饰

详见 [配色方案文档](./COLOR_SCHEME.md)。

## 12. 相关文档

- [性能优化](../performance/OPTIMIZATION.md)
- [开发最佳实践](../development/BEST_PRACTICES.md)
- [配色方案](./COLOR_SCHEME.md)
