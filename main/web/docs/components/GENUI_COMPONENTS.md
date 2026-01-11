# GenUI 组件系统 (GenUI Component System)

## 1. 概述

GenUI（Generative UI）是一个动态组件渲染系统，后端通过 SSE 流式推送组件定义，前端根据定义动态渲染对应的 React 组件。

**核心特点：**
- 后端驱动：组件定义由后端 Agent 动态生成
- 类型安全：使用 TypeScript 确保类型一致
- 可扩展：支持新增组件类型

## 2. 组件类型

### 2.1 支持的组件类型

根据后端协议，支持以下组件类型：

1. **SmartCanvas**: 智能画布（图片展示、蒙版绘制）
2. **ImageView**: 图片展示组件
3. **AgentMessage**: Agent 消息气泡
4. **ActionPanel**: 操作面板（按钮、滑块、选择器）

### 2.2 组件数据结构

```typescript
interface GenUIComponent {
  id?: string;                 // 组件唯一 ID（用于更新）
  widgetType: 'SmartCanvas' | 'ImageView' | 'AgentMessage' | 'ActionPanel';
  props: ComponentProps;        // 组件属性
  updateMode?: 'append' | 'replace' | 'update'; // 更新模式
  targetId?: string;           // 如果 updateMode 为 'update'，指定要更新的组件 ID
  timestamp?: number;          // 时间戳
}
```

## 3. 组件实现

### 3.1 GenUI 渲染器

```typescript
// components/genui/GenUIRenderer.tsx
'use client';

import { GenUIComponent } from '@/lib/types/genui';
import { SmartCanvas } from './SmartCanvas';
import { ImageView } from './ImageView';
import { AgentMessage } from './AgentMessage';
import { ActionPanel } from './ActionPanel';
import {
  isSmartCanvas,
  isImageView,
  isAgentMessage,
  isActionPanel,
} from '@/lib/types/genui';

interface GenUIRendererProps {
  component: GenUIComponent;
}

export function GenUIRenderer({ component }: GenUIRendererProps) {
  if (isSmartCanvas(component)) {
    return <SmartCanvas {...component.props} />;
  }

  if (isImageView(component)) {
    return <ImageView {...component.props} />;
  }

  if (isAgentMessage(component)) {
    return <AgentMessage {...component.props} />;
  }

  if (isActionPanel(component)) {
    return <ActionPanel {...component.props} />;
  }

  // 未知组件类型
  console.warn('Unknown component type:', component.widgetType);
  return (
    <div className="border border-yellow-300 bg-yellow-50 p-2 rounded">
      未知组件类型: {component.widgetType}
    </div>
  );
}
```

### 3.2 SmartCanvas 组件

详见 [智能画布组件](./SMART_CANVAS.md)。

### 3.3 ImageView 组件

```typescript
// components/genui/ImageView.tsx
'use client';

import Image from 'next/image';
import { ImageViewProps } from '@/lib/types/genui';

export function ImageView({ imageUrl, width, height, fit = 'contain' }: ImageViewProps) {
  return (
    <div className="relative w-full" style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}>
      <Image
        src={imageUrl}
        alt="Generated image"
        width={width || 800}
        height={height || 600}
        className={`object-${fit}`}
        loading="lazy"
      />
    </div>
  );
}
```

### 3.4 AgentMessage 组件

```typescript
// components/genui/AgentMessage.tsx
'use client';

import { AgentMessageProps } from '@/lib/types/genui';
import { ThinkingIndicator } from '@/components/features/TextToImage/ThinkingIndicator';

export function AgentMessage({
  state = 'success',
  text,
  isThinking = false,
  metadata,
}: AgentMessageProps) {
  const stateClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    loading: 'bg-blue-50 border-blue-200 text-blue-800',
    failed: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`border rounded-lg p-4 ${stateClasses[state]}`}>
      {isThinking && <ThinkingIndicator />}
      <div className="mt-2">{text}</div>
      {metadata?.node && (
        <div className="text-xs text-gray-500 mt-2">
          来源: {metadata.node}
        </div>
      )}
    </div>
  );
}
```

### 3.5 ActionPanel 组件

```typescript
// components/genui/ActionPanel.tsx
'use client';

import { ActionPanelProps, ActionItem } from '@/lib/types/genui';

export function ActionPanel({ actions, metadata }: ActionPanelProps) {
  const handleAction = (action: ActionItem) => {
    // 处理操作事件
    console.log('Action triggered:', action.id, action);
    
    // 根据 action.onClick 或其他属性执行相应操作
    if (action.onClick) {
      // 触发自定义事件或调用回调
      window.dispatchEvent(
        new CustomEvent('genui-action', {
          detail: { action, metadata },
        })
      );
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-medium mb-2">操作面板</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <ActionItemRenderer
            key={action.id}
            action={action}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );
}

function ActionItemRenderer({
  action,
  onAction,
}: {
  action: ActionItem;
  onAction: (action: ActionItem) => void;
}) {
  switch (action.type) {
    case 'button':
      return (
        <button
          onClick={() => onAction(action)}
          disabled={action.disabled}
          className={`px-4 py-2 rounded-lg ${
            action.buttonType === 'primary'
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : action.buttonType === 'danger'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {action.label}
        </button>
      );

    case 'slider':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">
            {action.label}
            {action.value !== undefined && (
              <span className="ml-2 text-gray-500">
                {action.value}
                {action.unit}
              </span>
            )}
          </label>
          <input
            type="range"
            min={action.min ?? 0}
            max={action.max ?? 100}
            step={action.step ?? 1}
            value={action.value ?? action.min ?? 0}
            onChange={(e) => {
              onAction({
                ...action,
                value: Number(e.target.value),
              });
            }}
            disabled={action.disabled}
            className="w-full"
          />
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">
            {action.label}
          </label>
          <select
            value={action.value}
            onChange={(e) => {
              onAction({
                ...action,
                value: e.target.value,
              });
            }}
            disabled={action.disabled}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {action.options?.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'input':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">
            {action.label}
          </label>
          <input
            type={action.inputType ?? 'text'}
            value={action.value ?? ''}
            onChange={(e) => {
              onAction({
                ...action,
                value: e.target.value,
              });
            }}
            placeholder={action.placeholder}
            disabled={action.disabled}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      );

    default:
      return null;
  }
}
```

## 4. 组件更新机制

### 4.1 更新模式

根据 `updateMode` 处理组件更新：

- **append**: 追加到列表末尾
- **replace**: 替换最后一个组件
- **update**: 更新指定 ID 的组件

### 4.2 更新处理

```typescript
// hooks/useGenUIComponents.ts
import { useState, useCallback } from 'react';
import { GenUIComponent } from '@/lib/types/genui';

export function useGenUIComponents() {
  const [components, setComponents] = useState<GenUIComponent[]>([]);

  const addComponent = useCallback((component: GenUIComponent) => {
    setComponents((prev) => {
      switch (component.updateMode) {
        case 'replace':
          return [...prev.slice(0, -1), component];
        
        case 'update':
          if (component.targetId) {
            return prev.map((c) =>
              c.id === component.targetId ? component : c
            );
          }
          return [...prev, component];
        
        case 'append':
        default:
          return [...prev, component];
      }
    });
  }, []);

  const clearComponents = useCallback(() => {
    setComponents([]);
  }, []);

  return {
    components,
    addComponent,
    clearComponents,
  };
}
```

## 5. 事件处理

### 5.1 ActionPanel 事件

当用户与 ActionPanel 交互时，触发自定义事件：

```typescript
// 监听 ActionPanel 事件
useEffect(() => {
  const handleAction = (event: CustomEvent) => {
    const { action, metadata } = event.detail;
    
    // 根据 action.id 执行相应操作
    switch (action.id) {
      case 'regenerate_btn':
        // 重新生成图片
        break;
      case 'style_strength':
        // 调整风格强度
        break;
      // ...
    }
  };

  window.addEventListener('genui-action', handleAction as EventListener);
  
  return () => {
    window.removeEventListener('genui-action', handleAction as EventListener);
  };
}, []);
```

### 5.2 SmartCanvas 事件

SmartCanvas 支持蒙版绘制，需要处理绘制事件：

```typescript
// 在 SmartCanvas 中处理蒙版绘制
const handleMaskDraw = (maskData: MaskData) => {
  // 发送蒙版数据到后端
  sendMessage({
    text: '修改这里',
    maskData,
  });
};
```

## 6. 类型安全

### 6.1 类型守卫

使用类型守卫确保类型安全：

```typescript
// lib/types/genui.ts
export function isSmartCanvas(
  component: GenUIComponent
): component is GenUIComponent & {
  widgetType: 'SmartCanvas';
  props: SmartCanvasProps;
} {
  return component.widgetType === 'SmartCanvas';
}
```

### 6.2 运行时验证

```typescript
// 验证组件数据
function validateComponent(data: unknown): data is GenUIComponent {
  if (!data || typeof data !== 'object') return false;
  
  const component = data as Record<string, unknown>;
  
  if (!component.widgetType || !component.props) return false;
  
  const validTypes = ['SmartCanvas', 'ImageView', 'AgentMessage', 'ActionPanel'];
  if (!validTypes.includes(component.widgetType as string)) return false;
  
  return true;
}
```

## 7. 错误处理

### 7.1 未知组件类型

```typescript
// 在 GenUIRenderer 中处理未知类型
if (!isValidComponent(component)) {
  return (
    <div className="border border-yellow-300 bg-yellow-50 p-2 rounded">
      警告: 未知组件类型 {component.widgetType}
    </div>
  );
}
```

### 7.2 组件渲染错误

```typescript
// 使用 ErrorBoundary 捕获组件错误
<ErrorBoundary fallback={<div>组件渲染失败</div>}>
  <GenUIRenderer component={component} />
</ErrorBoundary>
```

## 8. 性能优化

### 8.1 组件记忆化

```typescript
import { memo } from 'react';

export const GenUIRenderer = memo(function GenUIRenderer({
  component,
}: GenUIRendererProps) {
  // ...
});
```

### 8.2 懒加载

```typescript
// 按需加载组件
const SmartCanvas = lazy(() => import('./SmartCanvas'));
const ImageView = lazy(() => import('./ImageView'));
```

## 9. 扩展新组件类型

### 9.1 添加新组件

1. 在 `lib/types/genui.ts` 中定义类型
2. 创建组件实现文件
3. 在 `GenUIRenderer` 中添加渲染逻辑
4. 添加类型守卫函数

### 9.2 示例

```typescript
// 1. 定义类型
export interface NewComponentProps {
  // ...
}

// 2. 创建组件
export function NewComponent(props: NewComponentProps) {
  // ...
}

// 3. 添加到渲染器
if (component.widgetType === 'NewComponent') {
  return <NewComponent {...component.props} />;
}
```

## 10. 相关文档

- [智能画布组件](./SMART_CANVAS.md)
- [通用 UI 组件](./UI_COMPONENTS.md)
- [类型定义](../api/TYPES.md)
- [后端 GenUI 协议](../../../docs/gen_ui_protocol.md)
