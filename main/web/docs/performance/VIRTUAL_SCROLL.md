# 虚拟滚动实现 (Virtual Scroll Implementation)

## 1. 概述

虚拟滚动（Virtual Scrolling）是一种性能优化技术，只渲染可见区域的列表项，大幅提升大量数据列表的渲染性能。

**使用场景：**
- 聊天消息列表（大量消息）
- 知识库风格列表（大量风格数据）
- 思考日志列表（大量日志条目）

## 2. 技术选型

### 2.1 推荐库

- **react-window**: 轻量级，API 简单
- **react-virtuoso**: 功能更丰富，支持动态高度

**选择 react-window 的理由：**
- 体积小（~2KB）
- 性能优秀
- API 简单易用

## 3. 基础实现

### 3.1 安装依赖

```bash
npm install react-window
npm install --save-dev @types/react-window
```

### 3.2 固定高度列表

```typescript
// components/shared/VirtualList.tsx
'use client';

import { FixedSizeList } from 'react-window';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T }) => React.ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
}: VirtualListProps<T>) {
  return (
    <FixedSizeList
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
    >
      {({ index, style }) => renderItem({ index, style, data: items[index] })}
    </FixedSizeList>
  );
}
```

### 3.3 使用示例

```typescript
// 聊天消息列表
<VirtualList
  items={messages}
  itemHeight={100}
  height={600}
  renderItem={({ index, style, data }) => (
    <div style={style}>
      <MessageItem message={data} />
    </div>
  )}
/>
```

## 4. 动态高度列表

### 4.1 使用 react-virtuoso

```bash
npm install react-virtuoso
```

```typescript
// components/shared/VirtualListDynamic.tsx
'use client';

import { Virtuoso } from 'react-virtuoso';

interface VirtualListDynamicProps<T> {
  items: T[];
  height: number;
  renderItem: (index: number, item: T) => React.ReactNode;
  estimateItemSize?: number;
}

export function VirtualListDynamic<T>({
  items,
  height,
  renderItem,
  estimateItemSize = 100,
}: VirtualListDynamicProps<T>) {
  return (
    <Virtuoso
      style={{ height }}
      totalCount={items.length}
      itemContent={(index) => renderItem(index, items[index])}
      defaultItemHeight={estimateItemSize}
    />
  );
}
```

## 5. 实际应用

### 5.1 聊天消息列表

```typescript
// components/features/TextToImage/MessageList.tsx
'use client';

import { FixedSizeList } from 'react-window';
import { ChatMessage } from '@/hooks/useAgentChat';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  height?: number;
}

export function MessageList({ messages, height = 600 }: MessageListProps) {
  return (
    <FixedSizeList
      height={height}
      itemCount={messages.length}
      itemSize={120}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <MessageItem message={messages[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### 5.2 知识库风格列表

```typescript
// components/features/KnowledgeBase/StyleList.tsx
'use client';

import { FixedSizeGrid } from 'react-window';
import { StyleData } from '@/lib/api/knowledge';
import { StyleCard } from './StyleCard';

interface StyleListProps {
  styles: StyleData[];
  columns?: number;
  height?: number;
}

export function StyleList({
  styles,
  columns = 3,
  height = 600,
}: StyleListProps) {
  const rowCount = Math.ceil(styles.length / columns);
  const columnWidth = 300;
  const rowHeight = 200;

  return (
    <FixedSizeGrid
      columnCount={columns}
      columnWidth={columnWidth}
      height={height}
      rowCount={rowCount}
      rowHeight={rowHeight}
      width="100%"
    >
      {({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * columns + columnIndex;
        if (index >= styles.length) return null;

        return (
          <div style={style}>
            <StyleCard style={styles[index]} />
          </div>
        );
      }}
    </FixedSizeGrid>
  );
}
```

### 5.3 思考日志列表

```typescript
// components/features/AgentWorkflow/ThoughtLogList.tsx
'use client';

import { FixedSizeList } from 'react-window';
import { ThoughtLogEvent } from '@/lib/types/sse';
import { ThoughtLog } from './ThoughtLog';

interface ThoughtLogListProps {
  logs: ThoughtLogEvent[];
  height?: number;
}

export function ThoughtLogList({ logs, height = 300 }: ThoughtLogListProps) {
  return (
    <FixedSizeList
      height={height}
      itemCount={logs.length}
      itemSize={60}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ThoughtLog log={logs[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

## 6. 自定义 Hook

### 6.1 useVirtualScroll Hook

```typescript
// hooks/useVirtualScroll.ts
import { useState, useCallback } from 'react';

export function useVirtualScroll<T>(items: T[], itemHeight: number) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const visibleRange = {
    start: Math.floor(scrollOffset / itemHeight),
    end: Math.min(
      items.length - 1,
      Math.floor((scrollOffset + containerHeight) / itemHeight)
    ),
  };

  const visibleItems = items.slice(
    visibleRange.start,
    visibleRange.end + 1
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollOffset(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    handleScroll,
    setContainerHeight,
  };
}
```

## 7. 性能优化

### 7.1 避免不必要的重渲染

```typescript
// 使用 React.memo
const MessageItem = React.memo(({ message }: { message: ChatMessage }) => {
  // ...
});
```

### 7.2 使用 useMemo 缓存计算结果

```typescript
const visibleItems = useMemo(() => {
  return items.slice(visibleRange.start, visibleRange.end + 1);
}, [items, visibleRange.start, visibleRange.end]);
```

### 7.3 图片懒加载

```typescript
// 在虚拟列表中，只加载可见项的图片
const MessageItem = ({ message }: { message: ChatMessage }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible && <Image src={message.imageUrl} />}
    </div>
  );
};
```

## 8. 响应式适配

### 8.1 动态列数

```typescript
// 根据屏幕宽度调整列数
const [columns, setColumns] = useState(3);

useEffect(() => {
  const updateColumns = () => {
    const width = window.innerWidth;
    if (width < 640) {
      setColumns(1);
    } else if (width < 1024) {
      setColumns(2);
    } else {
      setColumns(3);
    }
  };

  updateColumns();
  window.addEventListener('resize', updateColumns);
  
  return () => {
    window.removeEventListener('resize', updateColumns);
  };
}, []);
```

## 9. 相关文档

- [性能优化策略](./OPTIMIZATION.md)
- [响应式设计](../styling/RESPONSIVE_DESIGN.md)
