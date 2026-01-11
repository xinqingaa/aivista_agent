# 数据模型设计文档 (Data Models Design)

## 1. 目标

本文档详细定义 AiVista 后端的所有数据模型，包括 Agent 状态、GenUI 组件、请求/响应格式等，确保前后端数据结构的一致性。

**核心目标：**
- 定义完整的 TypeScript 接口
- 确保类型安全
- 提供数据验证规则
- 支持序列化和反序列化

## 2. Agent 状态模型 (AgentState)

### 2.1 完整定义

```typescript
/**
 * Agent 工作流的状态结构
 * 这是 LangGraph 状态图的核心数据结构
 */
interface AgentState {
  // ========== 消息历史 ==========
  messages: Message[];
  
  // ========== 用户输入 ==========
  userInput: UserInput;
  
  // ========== Planner 节点输出 ==========
  intent: Intent | null;
  
  // ========== RAG 节点输出 ==========
  enhancedPrompt: EnhancedPrompt | null;
  
  // ========== Executor 节点输出 ==========
  executionResult: ExecutionResult | null;
  
  // ========== Critic 节点输出 ==========
  qualityCheck: QualityCheck | null;
  
  // ========== GenUI 组件 ==========
  uiComponents: GenUIComponent[];
  
  // ========== 错误信息 ==========
  error: AppError | null;
  
  // ========== 工作流元数据 ==========
  metadata: WorkflowMetadata;
}

/**
 * 消息结构
 */
interface Message {
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
 * 用户输入
 */
interface UserInput {
  text: string;
  maskData?: MaskData;
  context?: UserContext;
  preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';
}

/**
 * 蒙版数据（用于局部重绘）
 */
interface MaskData {
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
interface Point {
  x: number;
  y: number;
}

/**
 * 用户上下文
 */
interface UserContext {
  currentImageUrl?: string;     // 当前画布显示的图片
  previousActions?: string[];   // 历史操作
  sessionState?: Record<string, any>; // 会话状态
}

/**
 * 用户意图（Planner 节点输出）
 */
interface Intent {
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
interface EnhancedPrompt {
  original: string;             // 原始用户输入
  retrieved: RetrievedStyle[]; // 检索到的风格
  final: string;               // 增强后的完整 Prompt
}

/**
 * 检索到的风格
 */
interface RetrievedStyle {
  style: string;               // 风格名称
  prompt: string;              // 风格提示词
  similarity: number;         // 相似度 (0-1)
}

/**
 * 执行结果（Executor 节点输出）
 */
interface ExecutionResult {
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
interface QualityCheck {
  passed: boolean;             // 是否通过
  score: number;               // 质量得分 (0-1)
  feedback?: string;           // 反馈信息
  suggestions?: string[];      // 改进建议
}

/**
 * 工作流元数据
 */
interface WorkflowMetadata {
  sessionId: string;           // 会话 ID
  currentNode: string;         // 当前节点名称
  startTime: number;           // 开始时间戳
  retryCount: number;         // 重试次数
  executionTime?: number;     // 执行时间（毫秒）
}
```

## 3. GenUI 组件模型

### 3.1 基础组件接口

```typescript
/**
 * GenUI 组件基础接口
 */
interface GenUIComponent {
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
type ComponentProps = 
  | SmartCanvasProps 
  | ImageViewProps
  | AgentMessageProps 
  | ActionPanelProps;
```

### 3.2 SmartCanvas 组件

```typescript
/**
 * 智能画布组件属性
 */
interface SmartCanvasProps {
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
```

### 3.3 ImageView 组件

```typescript
/**
 * 图片展示组件属性（纯图片展示，不包含画布功能）
 */
interface ImageViewProps {
  imageUrl: string;            // 图片 URL
  width?: number;              // 显示宽度（可选）
  height?: number;             // 显示高度（可选）
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scaleDown';  // 图片适应方式
}
```

### 3.4 AgentMessage 组件

```typescript
/**
 * Agent 消息组件属性
 */
interface AgentMessageProps {
  state?: 'success' | 'loading' | 'failed'; // 状态
  text: string;               // 消息文本
  isThinking?: boolean;       // 是否显示思考动画
  metadata?: {
    node?: string;            // 来源节点
    timestamp?: number;       // 时间戳
    [key: string]: any;
  };
}
```

### 3.5 ActionPanel 组件

```typescript
/**
 * 操作面板组件属性
 */
interface ActionPanelProps {
  actions: ActionItem[];       // 操作项列表
  metadata?: {
    taskId?: string;          // 关联的任务 ID
    [key: string]: any;
  };
}

/**
 * 操作项
 */
interface ActionItem {
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
interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}
```

## 4. 请求/响应模型

### 4.1 聊天请求 (ChatRequest)

```typescript
/**
 * 聊天请求（SSE 端点）
 */
interface ChatRequest {
  text: string;               // 用户文本输入
  maskData?: MaskData;        // 可选的蒙版数据
  sessionId?: string;         // 会话 ID（用于多轮对话）
  preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';  // 首选图片生成模型
  context?: UserContext;     // 上下文信息
}
```

### 4.2 SSE 事件模型

```typescript
/**
 * SSE 事件基础结构
 */
interface SSEEvent {
  type: 'thought_log' | 'gen_ui_component' | 'error' | 'progress' | 'stream_end' | 'heartbeat';
  timestamp: number;
  data: any;                  // 根据 type 变化
}

/**
 * 思考日志事件
 */
interface ThoughtLogEvent extends SSEEvent {
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
 * GenUI 组件事件
 */
interface GenUIComponentEvent extends SSEEvent {
  type: 'gen_ui_component';
  data: GenUIComponent;
}

/**
 * 错误事件
 */
interface ErrorEvent extends SSEEvent {
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
interface ProgressEvent extends SSEEvent {
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
interface StreamEndEvent extends SSEEvent {
  type: 'stream_end';
  data: {
    sessionId: string;
    summary?: string;
  };
}

/**
 * 心跳事件
 */
interface HeartbeatEvent extends SSEEvent {
  type: 'heartbeat';
  data: {
    timestamp: number;
  };
}
```

## 5. 知识库模型

### 5.1 风格数据模型

```typescript
/**
 * 风格数据（存储在向量数据库）
 */
interface StyleData {
  id: string;                 // 唯一标识
  style: string;              // 风格名称（如 "Cyberpunk"）
  prompt: string;             // 风格提示词
  description?: string;       // 风格描述
  tags?: string[];           // 标签
  vector?: number[];         // 向量嵌入（由 LanceDB 管理）
  metadata?: {
    category?: string;        // 分类
    popularity?: number;      //  popularity 分数
    [key: string]: any;
  };
  createdAt: number;          // 创建时间戳
  updatedAt: number;          // 更新时间戳
}
```

### 5.2 向量检索结果

```typescript
/**
 * 向量检索结果
 */
interface VectorSearchResult {
  id: string;
  style: string;
  prompt: string;
  similarity: number;         // 相似度 (0-1)
  metadata?: Record<string, any>;
}
```

## 6. 错误模型

### 6.1 应用错误

```typescript
/**
 * 应用错误（已在 ERROR_HANDLING_DESIGN.md 中定义，此处引用）
 */
interface AppError {
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

enum ErrorCategory {
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  BUSINESS_ERROR = 'business_error',
  RESOURCE_ERROR = 'resource_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

enum ErrorLevel {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}
```

## 7. 数据验证

### 7.1 使用 class-validator

```typescript
import { IsString, IsOptional, IsUrl, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 聊天请求验证类
 */
export class ChatRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MaskDataDto)
  maskData?: MaskDataDto;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsEnum(['qwen-image', 'qwen-image-max', 'qwen-image-plus', 'z-image-turbo'])
  preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';

  @IsOptional()
  @ValidateNested()
  @Type(() => UserContextDto)
  context?: UserContextDto;
}

/**
 * 蒙版数据验证类
 */
export class MaskDataDto {
  @IsString()
  base64: string;

  @IsUrl()
  imageUrl: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  coordinates?: PointDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BoundsDto)
  bounds?: BoundsDto;
}

/**
 * 坐标点验证类
 */
export class PointDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

/**
 * 边界框验证类
 */
export class BoundsDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;
}
```

### 7.2 自定义验证器

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * 验证 Base64 字符串
 */
export function IsBase64(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isBase64',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          try {
            const buffer = Buffer.from(value, 'base64');
            return buffer.length > 0 && buffer.length <= 10 * 1024 * 1024; // 最大 10MB
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return 'Invalid base64 string or size exceeds 10MB';
        }
      }
    });
  };
}

// 使用
export class MaskDataDto {
  @IsBase64()
  base64: string;
  // ...
}
```

## 8. 数据转换与序列化

### 8.1 AgentState 序列化

```typescript
/**
 * AgentState 序列化（用于持久化或传输）
 */
class AgentStateSerializer {
  static serialize(state: AgentState): string {
    // 移除不可序列化的字段（如函数、循环引用）
    const serializable = {
      ...state,
      // 确保所有日期转换为时间戳
      messages: state.messages.map(msg => ({
        ...msg,
        timestamp: typeof msg.timestamp === 'number' 
          ? msg.timestamp 
          : new Date(msg.timestamp).getTime()
      }))
    };
    return JSON.stringify(serializable);
  }

  static deserialize(json: string): AgentState {
    const parsed = JSON.parse(json);
    // 可以在这里进行数据迁移或验证
    return parsed as AgentState;
  }
}
```

### 8.2 GenUI 组件构建器

```typescript
/**
 * GenUI 组件构建器（工厂模式）
 */
class GenUIComponentBuilder {
  static createSmartCanvas(props: SmartCanvasProps): GenUIComponent {
    return {
      widgetType: 'SmartCanvas',
      props,
      timestamp: Date.now()
    };
  }

  static createAgentMessage(
    text: string,
    options?: {
      state?: 'success' | 'loading' | 'failed';
      isThinking?: boolean;
      node?: string;
    }
  ): GenUIComponent {
    return {
      widgetType: 'AgentMessage',
      props: {
        text,
        state: options?.state || 'success',
        isThinking: options?.isThinking || false,
        metadata: {
          node: options?.node,
          timestamp: Date.now()
        }
      },
      timestamp: Date.now()
    };
  }

  static createActionPanel(actions: ActionItem[]): GenUIComponent {
    return {
      widgetType: 'ActionPanel',
      props: { actions },
      timestamp: Date.now()
    };
  }
}
```

## 9. 类型守卫

### 9.1 类型检查函数

```typescript
/**
 * 类型守卫：检查是否为 SmartCanvas 组件
 */
export function isSmartCanvas(component: GenUIComponent): component is GenUIComponent & {
  widgetType: 'SmartCanvas';
  props: SmartCanvasProps;
} {
  return component.widgetType === 'SmartCanvas';
}

/**
 * 类型守卫：检查是否为 ImageView 组件
 */
export function isImageView(component: GenUIComponent): component is GenUIComponent & {
  widgetType: 'ImageView';
  props: ImageViewProps;
} {
  return component.widgetType === 'ImageView';
}

/**
 * 类型守卫：检查是否为 AgentMessage 组件
 */
export function isAgentMessage(component: GenUIComponent): component is GenUIComponent & {
  widgetType: 'AgentMessage';
  props: AgentMessageProps;
} {
  return component.widgetType === 'AgentMessage';
}

/**
 * 类型守卫：检查是否为 ActionPanel 组件
 */
export function isActionPanel(component: GenUIComponent): component is GenUIComponent & {
  widgetType: 'ActionPanel';
  props: ActionPanelProps;
} {
  return component.widgetType === 'ActionPanel';
}
```

### 9.2 使用示例

```typescript
function processComponent(component: GenUIComponent) {
  if (isSmartCanvas(component)) {
    // TypeScript 现在知道 component.props 是 SmartCanvasProps
    console.log(component.props.imageUrl);
  } else if (isImageView(component)) {
    // TypeScript 现在知道 component.props 是 ImageViewProps
    console.log(component.props.imageUrl);
  } else if (isAgentMessage(component)) {
    // TypeScript 现在知道 component.props 是 AgentMessageProps
    console.log(component.props.text);
  } else if (isActionPanel(component)) {
    // TypeScript 现在知道 component.props 是 ActionPanelProps
    console.log(component.props.actions);
  }
}
```

## 10. 数据迁移

### 10.1 版本管理

```typescript
/**
 * 数据模型版本
 */
const DATA_MODEL_VERSION = '1.0.0';

/**
 * 带版本的数据结构
 */
interface VersionedData<T> {
  version: string;
  data: T;
  timestamp: number;
}

/**
 * 版本化序列化
 */
class VersionedSerializer {
  static serialize<T>(data: T): string {
    const versioned: VersionedData<T> = {
      version: DATA_MODEL_VERSION,
      data,
      timestamp: Date.now()
    };
    return JSON.stringify(versioned);
  }

  static deserialize<T>(json: string): T {
    const versioned: VersionedData<T> = JSON.parse(json);
    
    // 版本迁移逻辑
    if (versioned.version !== DATA_MODEL_VERSION) {
      return this.migrate(versioned.data, versioned.version, DATA_MODEL_VERSION);
    }
    
    return versioned.data;
  }

  private static migrate<T>(data: any, fromVersion: string, toVersion: string): T {
    // 实现版本迁移逻辑
    // 例如：从 1.0.0 迁移到 1.1.0
    return data as T;
  }
}
```

## 11. 导出与共享

### 11.1 类型导出文件

```typescript
// src/common/types/index.ts

// Agent 状态
export type { AgentState, Message, UserInput, Intent, EnhancedPrompt, ExecutionResult, QualityCheck };
export type { MaskData, Point, UserContext, WorkflowMetadata };

// GenUI 组件
export type { GenUIComponent, ComponentProps };
export type { SmartCanvasProps, ImageViewProps, AgentMessageProps, ActionPanelProps, ActionItem, SelectOption };

// 请求/响应
export type { ChatRequest };
export type { SSEEvent, ThoughtLogEvent, GenUIComponentEvent, ErrorEvent, ProgressEvent, StreamEndEvent };

// 知识库
export type { StyleData, VectorSearchResult };

// 错误
export type { AppError };
export { ErrorCategory, ErrorLevel };
```

### 11.2 与前端共享类型

```typescript
// 可以生成 TypeScript 定义文件供前端使用
// 或使用工具如 openapi-typescript 从 OpenAPI 规范生成
```

