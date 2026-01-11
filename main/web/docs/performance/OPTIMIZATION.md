# 性能优化策略 (Performance Optimization)

## 1. 概述

本文档说明前端项目的性能优化策略，包括代码分割、懒加载、图片优化、缓存策略等。

## 2. 代码分割

### 2.1 路由级别分割

Next.js 自动实现路由级别的代码分割：

```typescript
// app/chat/page.tsx - 自动代码分割
export default function ChatPage() {
  // ...
}
```

### 2.2 组件级别懒加载

```typescript
// 动态导入组件
import dynamic from 'next/dynamic';

const SmartCanvas = dynamic(() => import('@/components/genui/SmartCanvas'), {
  loading: () => <div>加载中...</div>,
  ssr: false, // 如果组件不需要 SSR
});

export function GenUIRenderer({ component }: { component: GenUIComponent }) {
  if (component.widgetType === 'SmartCanvas') {
    return <SmartCanvas {...component.props} />;
  }
  // ...
}
```

### 2.3 第三方库按需加载

```typescript
// 只在需要时加载 react-window
const { FixedSizeList } = await import('react-window');
```

## 3. 图片优化

### 3.1 Next.js Image 组件

```typescript
import Image from 'next/image';

<Image
  src={imageUrl}
  alt="Generated image"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### 3.2 响应式图片

```typescript
<Image
  src={imageUrl}
  alt="Image"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  width={800}
  height={600}
/>
```

### 3.3 图片压缩

使用工具压缩图片：
- **imagemin**: 图片压缩工具
- **sharp**: Node.js 图片处理库

## 4. 状态管理优化

### 4.1 状态分割

```typescript
// 避免将所有状态放在一个 store
// ❌ 不好
const useStore = create((set) => ({
  messages: [],
  styles: [],
  ui: {},
  // ...
}));

// ✅ 好
const useMessageStore = create((set) => ({ messages: [] }));
const useStyleStore = create((set) => ({ styles: [] }));
const useUIStore = create((set) => ({ ui: {} }));
```

### 4.2 选择器优化

```typescript
// 使用选择器避免不必要的重渲染
const messages = useMessageStore((state) => state.messages);
const addMessage = useMessageStore((state) => state.addMessage);
```

## 5. 渲染优化

### 5.1 React.memo

```typescript
// 记忆化组件
export const MessageItem = React.memo(({ message }: { message: Message }) => {
  // ...
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return prevProps.message.id === nextProps.message.id;
});
```

### 5.2 useMemo 和 useCallback

```typescript
// 缓存计算结果
const filteredMessages = useMemo(() => {
  return messages.filter((msg) => msg.type === 'user');
}, [messages]);

// 缓存函数
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

### 5.3 虚拟滚动

对于大量列表数据，使用虚拟滚动：

```typescript
import { FixedSizeList } from 'react-window';

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

详见 [虚拟滚动实现](./VIRTUAL_SCROLL.md)。

## 6. 网络优化

### 6.1 API 请求优化

```typescript
// 请求去重
const requestCache = new Map<string, Promise<any>>();

async function fetchWithDedupe(url: string) {
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }

  const promise = fetch(url).then((res) => res.json());
  requestCache.set(url, promise);
  
  promise.finally(() => {
    requestCache.delete(url);
  });

  return promise;
}
```

### 6.2 数据缓存

使用 SWR 或 React Query 缓存 API 响应：

```typescript
import useSWR from 'swr';

function useStyles() {
  const { data, error } = useSWR('knowledge/styles', getStyles, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // 5秒内去重
  });

  return { styles: data || [], error };
}
```

### 6.3 请求批处理

```typescript
// 批量请求
async function batchFetch(urls: string[]) {
  const promises = urls.map((url) => fetch(url));
  return Promise.all(promises);
}
```

## 7. 资源优化

### 7.1 字体优化

```typescript
// next/font 自动优化字体
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Layout({ children }) {
  return (
    <html className={inter.className}>
      {children}
    </html>
  );
}
```

### 7.2 CSS 优化

- 使用 TailwindCSS 的 purge 功能移除未使用的样式
- 使用 CSS-in-JS 时启用生产模式优化

### 7.3 第三方库优化

```typescript
// 按需导入
import { debounce } from 'lodash-es/debounce';
// 而不是
import _ from 'lodash';
```

## 8. 浏览器缓存

### 8.1 静态资源缓存

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 8.2 Service Worker（可选）

使用 Service Worker 实现离线缓存：

```typescript
// public/sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

## 9. 性能监控

### 9.1 Web Vitals

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 9.2 性能测量

```typescript
// 测量组件渲染时间
function useRenderTime(componentName: string) {
  useEffect(() => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      console.log(`${componentName} 渲染时间: ${end - start}ms`);
    };
  }, [componentName]);
}
```

## 10. 构建优化

### 10.1 生产构建

```bash
# 生产构建
npm run build

# 分析构建产物
npm run build -- --analyze
```

### 10.2 Bundle 分析

```bash
# 安装分析工具
npm install --save-dev @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ...
});
```

## 11. 相关文档

- [虚拟滚动实现](./VIRTUAL_SCROLL.md)
- [开发最佳实践](../development/BEST_PRACTICES.md)
