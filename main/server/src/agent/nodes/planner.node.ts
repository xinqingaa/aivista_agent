import { Injectable, Inject, Logger } from '@nestjs/common';
import { ILlmService } from '../../llm/interfaces/llm-service.interface';
import { AgentState, IntentResult } from '../interfaces/agent-state.interface';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

/**
 * Planner 节点 - 意图识别节点
 * 
 * @Injectable() - 标记为可注入的节点服务
 * @Inject('LLM_SERVICE') - 注入 LLM 服务，通过接口抽象支持多模型切换（Aliyun/DeepSeek/OpenAI）
 * 
 * 调用顺序:
 * 1. 接收用户输入（AgentState.userInput）
 * 2. 检查是否有蒙版数据（maskData），如果有则强制设置为 inpainting
 * 3. 调用 LLM 服务解析用户意图（llmService.chatWithJson()）
 * 4. 返回 IntentResult（包含 action, subject, style, prompt 等）
 */
@Injectable()
export class PlannerNode {
  private readonly logger = new Logger(PlannerNode.name);

  constructor(
    // @Inject('LLM_SERVICE') - 通过依赖注入获取 LLM 服务实例（由 LlmModule 提供）
    @Inject('LLM_SERVICE') private readonly llmService: ILlmService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log('Planner Node: Starting intent analysis...');

    // 如果有蒙版数据，强制设置为 inpainting
    if (state.userInput.maskData) {
      return {
        intent: {
          action: 'inpainting',
          prompt: state.userInput.text,
          confidence: 0.9,
          rawResponse: 'Mask data detected, forcing inpainting action',
        },
        thoughtLogs: [
          {
            node: 'planner',
            message: '检测到蒙版数据，已识别为局部重绘任务',
            timestamp: Date.now(),
          },
        ],
      };
    }

    // 构建系统提示词
    const systemPrompt = `你是一个专业的 AI 图像生成助手。请分析用户的输入，识别用户的意图。

可能的意图类型：
- generate_image: 用户想要生成新图片
- inpainting: 用户想要修改图片的某个区域（通常伴随蒙版数据）
- adjust_parameters: 用户想要调整生成参数（如风格强度、尺寸等）

请以 JSON 格式返回分析结果，格式如下：
{
  "action": "generate_image" | "inpainting" | "adjust_parameters" | "unknown",
  "subject": "主要对象（如：猫、城市、人物）",
  "style": "风格关键词（如：赛博朋克、水彩）",
  "prompt": "完整的英文提示词",
  "confidence": 0.0-1.0,
  "reasoning": "分析理由"
}`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(state.userInput.text),
      ];

      const intent = await this.llmService.chatWithJson<IntentResult>(messages);

      this.logger.log(`Planner Node: Intent parsed - ${intent.action}, confidence: ${intent.confidence}`);

      return {
        intent,
        thoughtLogs: [
          {
            node: 'planner',
            message: `已识别意图：${intent.action}。主题：${intent.subject || '未指定'}，风格：${intent.style || '未指定'}`,
            timestamp: Date.now(),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Planner Node error: ${error.message}`);
      return {
        intent: {
          action: 'unknown',
          prompt: state.userInput.text,
          confidence: 0,
          rawResponse: `Error: ${error.message}`,
        },
        error: {
          code: 'LLM_API_ERROR',
          message: '意图解析失败，请重试',
          node: 'planner',
        },
        thoughtLogs: [
          {
            node: 'planner',
            message: '意图解析失败',
            timestamp: Date.now(),
          },
        ],
      };
    }
  }
}

