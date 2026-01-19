# GenUI 组件系统 (GenUI Component System)

## 1. 概述

GenUI（Generative UI）是一个协议驱动的动态组件渲染系统。后端通过 SSE 流式推送组件定义，前端根据定义动态渲染对应的 React 组件。

**核心特点：**
- **协议驱动**: 组件定义由后端 Agent 动态生成，严格遵循 [GenUI 协议](../../../../docs/gen_ui_protocol.md)
- **动态渲染**: 使用 GenUIRegistry 和 GenUIRenderer 实现运行时组件映射
- **类型安全**: 使用 TypeScript 确保类型一致
- **可扩展**: 支持新增组件类型，无需修改核心渲染逻辑

## 2. 架构设计

### 2.1 目录结构

```
main/web/components/genui/
├── core/                      # 核心系统
│   ├── GenUIRegistry.ts       # 组件注册表（单例模式）
│   ├── GenUIRenderer.tsx      # 动态渲染器
│   ├── GenUIContext.tsx       # React 上下文
│   └── types.ts               # 核心类型定义
│
├── components/                # GenUI 组件实现
│   ├── ImageView.tsx          # 图片展示组件
│   ├── ThoughtLogItem.tsx     # 思考日志组件
│   └── EnhancedPromptView.tsx # 增强 Prompt 组件
│
├── hooks/                     # GenUI Hooks
│   ├── useGenUIRenderer.tsx   # 渲染器 Hook
│   └── useGenUIRegistry.ts    # 注册表 Hook
│
├── utils/                     # 工具函数
│   ├── validators.ts          # 属性验证器
│   ├── transformers.ts        # 数据转换器
│   └── helpers.ts             # 辅助函数
│
└── index.ts                   # 统一导出和组件注册
```

### 2.2 核心架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      SSE Event Stream                           │
│  thought_log | enhanced_prompt | gen_ui_component               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useAgentChat Hook                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ onThoughtLog → addGenUIComponent({ widgetType: 'Thought...'│ │
│  │ onEnhancedPrompt → addGenUIComponent({ widgetType: 'Enh...'│ │
│  │ onGenUIComponent → addGenUIComponent({ widgetType: ... })  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 genUIComponents State                           │
│  GenUIComponent[] - 统一的组件状态数组                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GenUIRenderer                                │
│  ┌─────────────────┐    ┌──────────────────────────────────┐   │
│  │ GenUIRegistry   │───▶│ ComponentDefinition              │   │
│  │ (单例)          │    │ { type, component, validate... } │   │
│  └─────────────────┘    └──────────────────────────────────┘   │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ React Component: ImageView | ThoughtLogItem | ...        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 3. 核心组件

### 3.1 GenUIRegistry - 组件注册表

单例模式的组件注册表，管理所有 GenUI 组件的注册和获取。

```typescript
// components/genui/core/GenUIRegistry.ts

export interface ComponentDefinition {
  type: GenUIWidgetType;
  component: React.ComponentType<any>;
  validate?: (props: any) => boolean;
  transform?: (props: any) => any;
}

export class GenUIRegistry {
  private static instance: GenUIRegistry;
  private components: Map<GenUIWidgetType, ComponentDefinition> = new Map();

  static getInstance(): GenUIRegistry {
    if (!GenUIRegistry.instance) {
      GenUIRegistry.instance = new GenUIRegistry();
    }
    return GenUIRegistry.instance;
  }

  register(definition: ComponentDefinition): void { ... }
  registerAll(definitions: ComponentDefinition[]): void { ... }
  get(type: GenUIWidgetType): ComponentDefinition | undefined { ... }
  has(type: GenUIWidgetType): boolean { ... }
}
```

### 3.2 GenUIRenderer - 动态渲染器

根据组件类型动态渲染对应的 React 组件。

```typescript
// components/genui/core/GenUIRenderer.tsx

interface GenUIRendererProps {
  component: GenUIComponent;
  onError?: (error: Error, component: GenUIComponent) => void;
  fallback?: React.ReactNode;
}

export function GenUIRenderer({ component, onError, fallback }: GenUIRendererProps) {
  const registry = GenUIRegistry.getInstance();
  const definition = registry.get(component.widgetType);

  if (!definition) {
    // 处理未知组件类型
    return <UnknownComponentWarning type={component.widgetType} />;
  }

  const Component = definition.component;
  const props = definition.transform 
    ? definition.transform(component.props) 
    : component.props;

  return <Component {...props} />;
}
```

### 3.3 组件自动注册

在 `index.ts` 中自动注册所有组件：

```typescript
// components/genui/index.ts

import { GenUIRegistry } from './core/GenUIRegistry';
import { ImageView } from './components/ImageView';
import { ThoughtLogItem } from './components/ThoughtLogItem';
import { EnhancedPromptView } from './components/EnhancedPromptView';

const defaultComponentDefinitions: ComponentDefinition[] = [
  { type: 'ImageView', component: ImageView, validate: validateImageViewProps },
  { type: 'ThoughtLogItem', component: ThoughtLogItem, validate: validateThoughtLogItemProps },
  { type: 'EnhancedPromptView', component: EnhancedPromptView, validate: validateEnhancedPromptViewProps },
];

export function ensureGenUIRegistryInitialized(): GenUIRegistry {
  const registry = GenUIRegistry.getInstance();
  if (registry.size() === 0) {
    registry.registerAll(defaultComponentDefinitions);
  }
  return registry;
}

// 自动初始化（客户端）
if (typeof window !== 'undefined') {
  ensureGenUIRegistryInitialized();
}
```

## 4. 组件类型

### 4.1 支持的组件类型

| widgetType | 组件 | 说明 |
|------------|------|------|
| `ImageView` | ImageView | 图片展示（下载、查看） |
| `ThoughtLogItem` | ThoughtLogItem | Agent 思考日志 |
| `EnhancedPromptView` | EnhancedPromptView | RAG 增强 Prompt 展示 |
| `SmartCanvas` | SmartCanvas | 智能画布（图片编辑） |
| `AgentMessage` | AgentMessage | Agent 消息气泡 |
| `ActionPanel` | ActionPanel | 操作面板 |

### 4.2 组件数据结构

```typescript
// lib/types/genui.ts

export interface GenUIComponent {
  id?: string;                    // 组件唯一 ID
  widgetType: GenUIWidgetType;    // 组件类型
  props: GenUIComponentProps;     // 组件属性
  updateMode?: GenUIUpdateMode;   // 更新模式
  targetId?: string;              // 目标组件 ID（用于更新）
  timestamp?: number;             // 时间戳
}

export type GenUIWidgetType =
  | 'SmartCanvas'
  | 'ImageView'
  | 'AgentMessage'
  | 'ActionPanel'
  | 'ThoughtLogItem'
  | 'EnhancedPromptView';

export type GenUIUpdateMode = 'append' | 'replace' | 'update';
```

## 5. 组件实现

### 5.1 ImageView 组件

```typescript
// components/genui/components/ImageView.tsx

export interface ImageViewProps {
  imageUrl: string;
  prompt?: string;
  alt?: string;
  actions?: ActionItem[];
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function ImageView({ imageUrl, prompt, alt, actions, onLoad, onError }: ImageViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-muted">
          {isLoading && <LoadingSpinner />}
          {error && <ErrorDisplay message={error} />}
          {!error && (
            <img
              src={imageUrl}
              alt={alt}
              onLoad={() => { setIsLoading(false); onLoad?.(); }}
              onError={() => { setIsLoading(false); setError('加载失败'); }}
            />
          )}
        </div>
        {!isLoading && !error && (
          <ActionBar prompt={prompt} actions={actions} />
        )}
      </CardContent>
    </Card>
  );
}
```

### 5.2 ThoughtLogItem 组件

```typescript
// components/genui/components/ThoughtLogItem.tsx

export interface ThoughtLogItemProps {
  node: 'planner' | 'rag' | 'executor' | 'critic' | 'genui';
  message: string;
  progress?: number;
  metadata?: { action?: string; confidence?: number; [key: string]: any };
  timestamp?: number;
  isLast?: boolean;
}

export function ThoughtLogItem({ node, message, progress, metadata, timestamp, isLast }: ThoughtLogItemProps) {
  const nodeConfig = {
    planner: { label: '意图识别', icon: Brain },
    rag: { label: '风格检索', icon: Search },
    executor: { label: '任务执行', icon: Zap },
    critic: { label: '质量审查', icon: Eye },
    genui: { label: '界面生成', icon: Terminal },
  };

  const config = nodeConfig[node];
  const isProcessing = progress !== undefined && progress < 100;

  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* 时间轴连接线 */}
      {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border/50" />}
      
      {/* 节点图标 */}
      <NodeIcon icon={config.icon} isProcessing={isProcessing} />
      
      {/* 内容 */}
      <div className="flex flex-col gap-1.5">
        <NodeHeader label={config.label} confidence={metadata?.confidence} timestamp={timestamp} />
        <p className="text-sm text-muted-foreground">{message}</p>
        {isProcessing && <ProgressBar progress={progress} />}
      </div>
    </div>
  );
}
```

### 5.3 EnhancedPromptView 组件

```typescript
// components/genui/components/EnhancedPromptView.tsx

export interface EnhancedPromptViewProps {
  original: string;
  retrieved: Array<{ style: string; prompt: string; similarity: number }>;
  final: string;
}

export function EnhancedPromptView({ original, retrieved, final }: EnhancedPromptViewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="overflow-hidden my-4">
      {/* 头部：最终结果 */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <SparklesIcon />
          <div>
            <div className="text-sm font-medium">Prompt 已优化</div>
            <div className="text-sm text-muted-foreground">{final}</div>
          </div>
        </div>
      </div>

      {/* 可折叠详情 */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger>查看优化详情 (RAG 检索结果)</CollapsibleTrigger>
        <CollapsibleContent>
          <OriginalInput text={original} />
          <RetrievedStyles items={retrieved} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
```

## 6. 在 ChatInterface 中使用

### 6.1 状态管理

```typescript
// components/chat/ChatInterface.tsx

export function ChatInterface() {
  // 统一的 GenUI 组件状态
  const [genUIComponents, setGenUIComponents] = useState<GenUIComponent[]>([]);

  const addGenUIComponent = useCallback((component: GenUIComponent) => {
    setGenUIComponents(prev => [...prev, component]);
  }, []);

  // SSE 事件处理
  const { sendMessage } = useAgentChat({
    onThoughtLog: (data) => {
      addGenUIComponent({
        id: generateComponentId('thought'),
        widgetType: 'ThoughtLogItem',
        props: { ...data, timestamp: Date.now() },
      });
    },
    onEnhancedPrompt: (data) => {
      addGenUIComponent({
        id: generateComponentId('enhanced'),
        widgetType: 'EnhancedPromptView',
        props: data,
      });
    },
    onGenUIComponent: (data) => {
      addGenUIComponent({
        id: data.id || generateComponentId(data.widgetType.toLowerCase()),
        widgetType: data.widgetType,
        props: data.props,
      });
    },
  });
}
```

### 6.2 渲染组件

```typescript
// 渲染 GenUI 组件列表
function GenUIComponentRenderer({ components, isProcessing }: Props) {
  const thoughtLogs = components.filter(c => c.widgetType === 'ThoughtLogItem');
  const enhancedPrompts = components.filter(c => c.widgetType === 'EnhancedPromptView');
  const images = components.filter(c => c.widgetType === 'ImageView');

  return (
    <div className="space-y-6">
      {/* 思考日志 - 时间轴布局 */}
      {thoughtLogs.length > 0 && (
        <div className="pl-2">
          <TimelineHeader isProcessing={isProcessing} />
          <div className="ml-1 pl-4 border-l-2">
            {thoughtLogs.map((component, index) => (
              <GenUIRenderer
                key={component.id}
                component={{
                  ...component,
                  props: { ...component.props, isLast: index === thoughtLogs.length - 1 },
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 增强 Prompt */}
      {enhancedPrompts.map(component => (
        <GenUIRenderer key={component.id} component={component} />
      ))}

      {/* 图片结果 */}
      {images.map(component => (
        <GenUIRenderer key={component.id} component={component} />
      ))}
    </div>
  );
}
```

## 7. 工具函数

### 7.1 验证器

```typescript
// components/genui/utils/validators.ts

export function validateImageViewProps(props: ImageViewProps): boolean {
  return typeof props.imageUrl === 'string' && props.imageUrl.length > 0;
}

export function validateThoughtLogItemProps(props: ThoughtLogItemProps): boolean {
  return typeof props.node === 'string' && typeof props.message === 'string';
}
```

### 7.2 转换器

```typescript
// components/genui/utils/transformers.ts

export function transformImageViewProps(props: any): ImageViewProps {
  // 兼容旧版本的 url 属性
  if (!props.imageUrl && props.url) {
    return { ...props, imageUrl: props.url };
  }
  return props;
}
```

### 7.3 辅助函数

```typescript
// components/genui/utils/helpers.ts

export function generateComponentId(prefix: string = 'genui'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function findComponentsByType(
  components: GenUIComponent[],
  widgetType: string
): GenUIComponent[] {
  return components.filter(c => c.widgetType === widgetType);
}
```

## 8. 扩展新组件

### 8.1 添加新组件步骤

1. **定义类型** (`lib/types/genui.ts`)
   ```typescript
   export interface NewComponentProps {
     // 定义属性
   }
   ```

2. **实现组件** (`components/genui/components/NewComponent.tsx`)
   ```typescript
   export function NewComponent(props: NewComponentProps) {
     // 实现渲染逻辑
   }
   ```

3. **添加验证器** (`components/genui/utils/validators.ts`)
   ```typescript
   export function validateNewComponentProps(props: NewComponentProps): boolean {
     // 验证逻辑
   }
   ```

4. **注册组件** (`components/genui/index.ts`)
   ```typescript
   const defaultComponentDefinitions: ComponentDefinition[] = [
     // ...
     { type: 'NewComponent', component: NewComponent, validate: validateNewComponentProps },
   ];
   ```

5. **更新协议文档** (`docs/gen_ui_protocol.md`)

## 9. 相关文档

- [GenUI 协议文档](../../../../docs/gen_ui_protocol.md) - 前后端统一协议
- [智能画布组件](./SMART_CANVAS.md) - SmartCanvas 详细文档
- [SSE 客户端实现](../api/SSE_CLIENT.md) - SSE 连接和事件处理
- [类型定义](../api/TYPES.md) - TypeScript 类型详解
