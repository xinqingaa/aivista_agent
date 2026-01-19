/**
 * GenUI 类型定义
 * 严格对应后端 gen_ui_protocol 定义的组件类型
 */

/**
 * GenUI 组件类型
 * 严格对应后端 gen_ui_protocol 定义的组件类型
 */
export type GenUIWidgetType =
  | 'SmartCanvas'
  | 'ImageView'
  | 'AgentMessage'
  | 'ActionPanel'
  | 'EnhancedPromptView'
  | 'ThoughtLogItem';

/**
 * 组件更新模式
 */
export type GenUIUpdateMode = 'append' | 'replace' | 'update';

/**
 * GenUI 组件基础接口
 */
export interface GenUIComponent {
  id?: string;
  widgetType: GenUIWidgetType;
  props: GenUIComponentProps;
  updateMode?: GenUIUpdateMode;
  targetId?: string;
  timestamp?: number;
}

/**
 * 组件属性联合类型
 */
export type GenUIComponentProps =
  | SmartCanvasProps
  | ImageViewProps
  | AgentMessageProps
  | ActionPanelProps
  | EnhancedPromptViewProps
  | ThoughtLogItemProps;

/**
 * SmartCanvas 组件属性
 */
export interface SmartCanvasProps {
  imageUrl: string;
  mode: 'view' | 'draw_mask';
  ratio?: number;
  onMaskComplete?: (maskData: MaskData) => void;
  onCanvasAction?: (action: CanvasAction) => void;
}

/**
 * ImageView 组件属性
 */
export interface ImageViewProps {
  imageUrl: string;
  prompt?: string;
  alt?: string;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill';
  actions?: ActionItem[];
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * AgentMessage 组件属性
 */
export interface AgentMessageProps {
  text: string;
  state?: 'success' | 'loading' | 'failed';
  isThinking?: boolean;
  metadata?: {
    node?: string;
    confidence?: number;
    [key: string]: any;
  };
}

/**
 * ActionPanel 组件属性
 */
export interface ActionPanelProps {
  actions: ActionItem[];
  metadata?: {
    context?: string;
    [key: string]: any;
  };
  onAction?: (action: ActionItem) => void;
}

/**
 * EnhancedPromptView 组件属性
 */
export interface EnhancedPromptViewProps {
  original: string;
  retrieved: Array<{
    style: string;
    prompt: string;
    similarity: number;
  }>;
  final: string;
}

/**
 * ThoughtLogItem 组件属性
 */
export interface ThoughtLogItemProps {
  node: 'planner' | 'rag' | 'executor' | 'critic' | 'genui';
  message: string;
  progress?: number;
  metadata?: {
    action?: string;
    confidence?: number;
    [key: string]: any;
  };
  timestamp?: number;
  isLast?: boolean;
}

/**
 * ActionItem 类型
 */
export interface ActionItem {
  id: string;
  label: string;
  type: 'button' | 'slider' | 'select' | 'input';
  buttonType?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  value?: any;
  min?: number;
  max?: number;
  step?: number;
  inputType?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  options?: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  onClick?: () => void;
}

/**
 * MaskData 类型
 */
export interface MaskData {
  base64: string;
  imageUrl: string;
  coordinates?: Array<{ x: number; y: number }>;
}

/**
 * CanvasAction 类型
 */
export interface CanvasAction {
  type: 'draw_mask' | 'clear_mask' | 'undo' | 'redo';
  data?: any;
}

// ============================================================================
// 类型守卫函数
// ============================================================================

/**
 * SmartCanvas 类型守卫
 */
export function isSmartCanvasProps(
  props: GenUIComponentProps
): props is SmartCanvasProps {
  return 'imageUrl' in props && 'mode' in props;
}

/**
 * ImageView 类型守卫
 */
export function isImageViewProps(
  props: GenUIComponentProps
): props is ImageViewProps {
  return 'imageUrl' in props && !('mode' in props);
}

/**
 * AgentMessage 类型守卫
 */
export function isAgentMessageProps(
  props: GenUIComponentProps
): props is AgentMessageProps {
  return 'text' in props && !('imageUrl' in props) && !('node' in props);
}

/**
 * ActionPanel 类型守卫
 */
export function isActionPanelProps(
  props: GenUIComponentProps
): props is ActionPanelProps {
  return 'actions' in props && Array.isArray(props.actions);
}

/**
 * EnhancedPromptView 类型守卫
 */
export function isEnhancedPromptViewProps(
  props: GenUIComponentProps
): props is EnhancedPromptViewProps {
  return 'original' in props && 'retrieved' in props && 'final' in props;
}

/**
 * ThoughtLogItem 类型守卫
 */
export function isThoughtLogItemProps(
  props: GenUIComponentProps
): props is ThoughtLogItemProps {
  return 'node' in props && 'message' in props;
}
