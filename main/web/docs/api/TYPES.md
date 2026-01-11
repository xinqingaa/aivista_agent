# TypeScript 类型定义 (Type Definitions)

## 1. 概述

本文档定义前端使用的所有 TypeScript 类型，与后端数据模型保持一致，确保前后端类型安全。

## 2. 类型文件组织

```
lib/types/
├── agent.ts          # Agent 相关类型
├── knowledge.ts      # Knowledge 相关类型
├── genui.ts          # GenUI 组件类型
├── sse.ts            # SSE 事件类型
└── index.ts          # 统一导出
```

## 3. Agent 相关类型

### 3.1 基础类型

```typescript
// lib/types/agent.ts

/**
 * 用户输入
 */
export interface UserInput {
  text: string;
  maskData?: MaskData;
  context?: UserContext;
  preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';
}

/**
 * 蒙版数据（用于局部重绘）
 */
export interface MaskData {
  base64: string;              // Base64 编码的蒙版图片
  imageUrl: string;             // 原图 URL
  coordinates?: Point[];        // 蒙版路径点（可选，用于调试）
  bounds?: {                    // 蒙版边界框（可选）
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * 坐标点
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 用户上下文
 */
export interface UserContext {
  currentImageUrl?: string;     // 当前画布显示的图片
  previousActions?: string[];   // 历史操作
  sessionState?: Record<string, any>; // 会话状态
}

/**
 * 用户意图（Planner 节点输出）
 */
export interface Intent {
  action: 'generate_image' | 'inpainting' | 'adjust_parameters' | 'unknown';
  subject?: string;            // 主要对象
  style?: string;              // 风格关键词
  confidence: number;          // 置信度 (0-1)
  rawResponse: string;         // LLM 原始响应
  reasoning?: string;          // 分析理由
  parameters?: {               // 提取的参数（如果 action 是 adjust_parameters）
    styleStrength?: number;
    imageSize?: { width: number; height: number };
    [key: string]: any;
  };
}

/**
 * 增强后的 Prompt（RAG 节点输出）
 */
export interface EnhancedPrompt {
  original: string;             // 原始用户输入
  retrieved: RetrievedStyle[]; // 检索到的风格
  final: string;               // 增强后的完整 Prompt
}

/**
 * 检索到的风格
 */
export interface RetrievedStyle {
  style: string;               // 风格名称
  prompt: string;              // 风格提示词
  similarity: number;         // 相似度 (0-1)
}

/**
 * 执行结果（Executor 节点输出）
 */
export interface ExecutionResult {
  imageUrl: string;            // 生成的图片 URL
  taskType: 'text_to_image' | 'inpainting' | 'parameter_adjustment';
  metadata?: {
    prompt?: string;
    seed?: number | string;
    baseImageUrl?: string;     // 原图 URL（inpainting 时使用）
    maskSize?: number;         // 蒙版大小（inpainting 时使用）
    [key: string]: any;
  };
}

/**
 * 质量审查结果（Critic 节点输出）
 */
export interface QualityCheck {
  passed: boolean;             // 是否通过
  score: number;               // 质量得分 (0-1)
  feedback?: string;           // 反馈信息
  suggestions?: string[];      // 改进建议
}

/**
 * 工作流元数据
 */
export interface WorkflowMetadata {
  sessionId: string;           // 会话 ID
  currentNode: string;         // 当前节点名称
  startTime: number;           // 开始时间戳
  retryCount: number;         // 重试次数
  executionTime?: number;     // 执行时间（毫秒）
}

/**
 * 消息结构
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    imageUrl?: string;
    action?: string;
    [key: string]: any;
  };
}

/**
 * Agent 状态（完整状态，用于调试和状态管理）
 */
export interface AgentState {
  messages: Message[];
  userInput: UserInput;
  intent: Intent | null;
  enhancedPrompt: EnhancedPrompt | null;
  executionResult: ExecutionResult | null;
  qualityCheck: QualityCheck | null;
  uiComponents: GenUIComponent[];
  error: AppError | null;
  metadata: WorkflowMetadata;
}

/**
 * 应用错误
 */
export interface AppError {
  code: string;
  category: ErrorCategory;
  level: ErrorLevel;
  message: string;
  details?: string;
  stack?: string;
  node?: string;
  timestamp: number;
  sessionId?: string;
  recoverable: boolean;
  retryable: boolean;
  retryAfter?: number;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

export enum ErrorCategory {
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  BUSINESS_ERROR = 'business_error',
  RESOURCE_ERROR = 'resource_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}

export enum ErrorLevel {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}
```

### 3.2 请求/响应类型

```typescript
/**
 * 聊天请求（SSE 端点）
 */
export interface ChatRequest {
  text: string;               // 用户文本输入
  maskData?: MaskData;        // 可选的蒙版数据
  sessionId?: string;         // 会话 ID（用于多轮对话）
  preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';
  context?: UserContext;     // 上下文信息
}

/**
 * Agent API 信息响应
 */
export interface AgentInfo {
  service: string;
  version: string;
  status: string;
  endpoints: {
    chat: {
      method: string;
      path: string;
      description: string;
      request: {
        text: string;
        maskData?: MaskData;
        sessionId?: string;
      };
      response: string;
      example: {
        curl: string;
      };
    };
  };
  note: string;
}
```

## 4. Knowledge 相关类型

```typescript
// lib/types/knowledge.ts

/**
 * 风格数据（存储在向量数据库）
 */
export interface StyleData {
  id: string;                 // 唯一标识
  style: string;              // 风格名称（如 "Cyberpunk"）
  prompt: string;             // 风格提示词
  description?: string;       // 风格描述
  tags?: string[];           // 标签
  metadata?: {
    category?: string;        // 分类
    popularity?: number;      // 流行度分数
    [key: string]: any;
  };
  createdAt?: number;          // 创建时间戳
  updatedAt?: number;          // 更新时间戳
}

/**
 * 向量检索结果
 */
export interface VectorSearchResult {
  id: string;
  style: string;
  prompt: string;
  similarity: number;         // 相似度 (0-1)
  metadata?: Record<string, any>;
}

/**
 * 知识库统计信息
 */
export interface KnowledgeStats {
  count: number;
  dimension: number;
  dbPath: string;
  tableName: string;
  initialized: boolean;
  dbExists: boolean;
  tableInitialized: boolean;
}

/**
 * 创建风格请求
 */
export interface CreateStyleRequest {
  id: string;
  style: string;
  prompt: string;
  description?: string;
  tags?: string[];
  metadata?: {
    category?: string;
    popularity?: number;
    [key: string]: any;
  };
}

/**
 * 创建风格响应
 */
export interface CreateStyleResponse {
  message: string;
  id: string;
}

/**
 * 搜索选项
 */
export interface SearchOptions {
  query: string;
  limit?: number;
  minSimilarity?: number;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  style: string;
  prompt: string;
  similarity: number;
  metadata?: Record<string, any>;
}
```

## 5. GenUI 组件类型

```typescript
// lib/types/genui.ts

/**
 * GenUI 组件基础接口
 */
export interface GenUIComponent {
  id?: string;                 // 组件唯一 ID（用于更新）
  widgetType: 'SmartCanvas' | 'ImageView' | 'AgentMessage' | 'ActionPanel';
  props: ComponentProps;
  updateMode?: 'append' | 'replace' | 'update'; // 更新模式
  targetId?: string;           // 如果 updateMode 为 'update'，指定要更新的组件 ID
  timestamp?: number;          // 时间戳
}

/**
 * 组件属性（联合类型）
 */
export type ComponentProps =
  | SmartCanvasProps
  | ImageViewProps
  | AgentMessageProps
  | ActionPanelProps;

/**
 * 智能画布组件属性
 */
export interface SmartCanvasProps {
  imageUrl: string;            // 图片 URL
  mode: 'view' | 'draw_mask';  // 显示模式
  ratio?: number;              // 图片宽高比
  width?: number;              // 画布宽度（可选）
  height?: number;             // 画布高度（可选）
  metadata?: {
    originalImageUrl?: string; // 原图 URL（编辑模式时使用）
    maskData?: MaskData;      // 当前蒙版数据（如果有）
    [key: string]: any;
  };
}

/**
 * 图片展示组件属性（纯图片展示，不包含画布功能）
 */
export interface ImageViewProps {
  imageUrl: string;            // 图片 URL
  width?: number;              // 显示宽度（可选）
  height?: number;             // 显示高度（可选）
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scaleDown';  // 图片适应方式
}

/**
 * Agent 消息组件属性
 */
export interface AgentMessageProps {
  state?: 'success' | 'loading' | 'failed'; // 状态
  text: string;               // 消息文本
  isThinking?: boolean;       // 是否显示思考动画
  metadata?: {
    node?: string;            // 来源节点
    timestamp?: number;       // 时间戳
    [key: string]: any;
  };
}

/**
 * 操作面板组件属性
 */
export interface ActionPanelProps {
  actions: ActionItem[];       // 操作项列表
  metadata?: {
    taskId?: string;          // 关联的任务 ID
    [key: string]: any;
  };
}

/**
 * 操作项
 */
export interface ActionItem {
  id: string;                 // 操作 ID
  label: string;              // 显示标签
  type: 'button' | 'slider' | 'select' | 'input';
  
  // 按钮类型
  buttonType?: 'primary' | 'secondary' | 'danger';
  onClick?: string;           // 点击事件标识（前端处理）
  
  // 滑块类型
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  unit?: string;              // 单位（如 "%", "px"）
  
  // 选择器类型
  options?: SelectOption[];
  
  // 输入框类型
  placeholder?: string;
  inputType?: 'text' | 'number' | 'email';
  
  // 通用属性
  disabled?: boolean;
  tooltip?: string;           // 提示文本
}

/**
 * 选择器选项
 */
export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}

/**
 * 类型守卫函数
 */
export function isSmartCanvas(
  component: GenUIComponent
): component is GenUIComponent & {
  widgetType: 'SmartCanvas';
  props: SmartCanvasProps;
} {
  return component.widgetType === 'SmartCanvas';
}

export function isImageView(
  component: GenUIComponent
): component is GenUIComponent & {
  widgetType: 'ImageView';
  props: ImageViewProps;
} {
  return component.widgetType === 'ImageView';
}

export function isAgentMessage(
  component: GenUIComponent
): component is GenUIComponent & {
  widgetType: 'AgentMessage';
  props: AgentMessageProps;
} {
  return component.widgetType === 'AgentMessage';
}

export function isActionPanel(
  component: GenUIComponent
): component is GenUIComponent & {
  widgetType: 'ActionPanel';
  props: ActionPanelProps;
} {
  return component.widgetType === 'ActionPanel';
}
```

## 6. SSE 事件类型

```typescript
// lib/types/sse.ts

/**
 * SSE 事件基础结构
 */
export interface SSEEventBase {
  type: string;
  timestamp: number;
  data: any;
}

/**
 * 连接事件
 */
export interface ConnectionEvent extends SSEEventBase {
  type: 'connection';
  data: {
    status: 'connected';
    sessionId: string;
  };
}

/**
 * 思考日志事件
 */
export interface ThoughtLogEvent extends SSEEventBase {
  type: 'thought_log';
  data: {
    node: 'planner' | 'rag' | 'executor' | 'critic' | 'genui';
    message: string;
    progress?: number;        // 进度百分比 (0-100)
    metadata?: {
      action?: string;
      confidence?: number;
      [key: string]: any;
    };
  };
}

/**
 * 增强 Prompt 事件
 */
export interface EnhancedPromptEvent extends SSEEventBase {
  type: 'enhanced_prompt';
  data: {
    original: string;
    retrieved: Array<{
      style: string;
      prompt: string;
      similarity: number;
    }>;
    final: string;
  };
}

/**
 * GenUI 组件事件
 */
export interface GenUIComponentEvent extends SSEEventBase {
  type: 'gen_ui_component';
  data: GenUIComponent;
}

/**
 * 错误事件
 */
export interface ErrorEvent extends SSEEventBase {
  type: 'error';
  data: {
    code: string;
    message: string;
    node?: string;
    details?: string;
    recoverable?: boolean;
    retryable?: boolean;
    retryAfter?: number;
  };
}

/**
 * 进度事件
 */
export interface ProgressEvent extends SSEEventBase {
  type: 'progress';
  data: {
    task: string;
    progress: number;         // 进度百分比 (0-100)
    message?: string;
    estimatedTimeRemaining?: number; // 预计剩余时间（秒）
  };
}

/**
 * 流结束事件
 */
export interface StreamEndEvent extends SSEEventBase {
  type: 'stream_end';
  data: {
    sessionId: string;
    summary?: string;
  };
}

/**
 * 心跳事件
 */
export interface HeartbeatEvent extends SSEEventBase {
  type: 'heartbeat';
  data: {
    timestamp: number;
  };
}

/**
 * SSE 事件联合类型
 */
export type SSEEvent =
  | ConnectionEvent
  | ThoughtLogEvent
  | EnhancedPromptEvent
  | GenUIComponentEvent
  | ErrorEvent
  | ProgressEvent
  | StreamEndEvent
  | HeartbeatEvent;
```

## 7. 统一导出

```typescript
// lib/types/index.ts

// Agent 相关类型
export * from './agent';

// Knowledge 相关类型
export * from './knowledge';

// GenUI 组件类型
export * from './genui';

// SSE 事件类型
export * from './sse';
```

## 8. 使用示例

### 8.1 在组件中使用类型

```typescript
// components/genui/GenUIRenderer.tsx
import { GenUIComponent, isSmartCanvas, isAgentMessage } from '@/lib/types';

export function GenUIRenderer({ component }: { component: GenUIComponent }) {
  if (isSmartCanvas(component)) {
    return <SmartCanvas {...component.props} />;
  }

  if (isAgentMessage(component)) {
    return <AgentMessage {...component.props} />;
  }

  // ... 其他组件类型
}
```

### 8.2 在 API 调用中使用类型

```typescript
// lib/api/knowledge.ts
import { StyleData, CreateStyleRequest } from '@/lib/types';

export async function getStyles(): Promise<StyleData[]> {
  // ...
}

export async function createStyle(
  data: CreateStyleRequest
): Promise<CreateStyleResponse> {
  // ...
}
```

### 8.3 在 Hook 中使用类型

```typescript
// hooks/useAgentChat.ts
import { ChatRequest, Message } from '@/lib/types';

export function useAgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = async (request: ChatRequest) => {
    // ...
  };

  return { messages, sendMessage };
}
```

## 9. 类型验证

### 9.1 运行时类型检查（可选）

```typescript
// lib/utils/type-guards.ts
import { GenUIComponent, SmartCanvasProps } from '@/lib/types';

export function isValidGenUIComponent(
  data: unknown
): data is GenUIComponent {
  if (!data || typeof data !== 'object') return false;
  const component = data as Record<string, unknown>;
  
  if (!component.widgetType || !component.props) return false;
  
  const validTypes = ['SmartCanvas', 'ImageView', 'AgentMessage', 'ActionPanel'];
  if (!validTypes.includes(component.widgetType as string)) return false;
  
  return true;
}
```

## 10. 相关文档

- [API 集成指南](./API_INTEGRATION.md)
- [SSE 客户端实现](./SSE_CLIENT.md)
- [后端数据模型设计](../../../main/server/docs/design/DATA_MODELS_DESIGN.md)
