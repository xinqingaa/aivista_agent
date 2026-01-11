import { GenUIComponent } from '../../common/types/genui-component.interface';

export interface IntentResult {
  action: 'generate_image' | 'inpainting' | 'adjust_parameters' | 'unknown';
  subject?: string;
  style?: string;
  prompt: string;
  confidence: number;
  rawResponse: string;
  parameters?: Record<string, any>;
}

/**
 * 质量审查结果（Critic 节点输出）
 */
export interface QualityCheck {
  passed: boolean;
  score: number; // 0-1
  feedback?: string;
  suggestions?: string[];
}

export interface AgentState {
  // 用户输入
  userInput: {
    text: string;
    maskData?: {
      base64: string;
      imageUrl: string;
    };
    preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';
  };

  // Agent 处理结果
  intent?: IntentResult;
  enhancedPrompt?: {
    original: string;
    retrieved: Array<{
      style: string;
      prompt: string;
      similarity: number;
    }>;
    final: string;
  };
  generatedImageUrl?: string;

  // Critic 节点输出
  qualityCheck?: QualityCheck;

  // UI 组件生成
  uiComponents: GenUIComponent[];
  thoughtLogs: Array<{
    node: string;
    message: string;
    timestamp: number;
  }>;

  // 元数据
  sessionId: string;
  timestamp: number;
  metadata?: {
    currentNode?: string;
    retryCount?: number;
    startTime?: number;
  };
  error?: {
    code: string;
    message: string;
    node?: string;
  };
}

