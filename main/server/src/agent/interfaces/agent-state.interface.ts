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

export interface AgentState {
  // 用户输入
  userInput: {
    text: string;
    maskData?: {
      base64: string;
      imageUrl: string;
    };
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
  error?: {
    code: string;
    message: string;
    node?: string;
  };
}

