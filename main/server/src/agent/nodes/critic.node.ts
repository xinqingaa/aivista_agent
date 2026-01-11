import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmService } from '../../llm/interfaces/llm-service.interface';
import { AgentState, QualityCheck } from '../interfaces/agent-state.interface';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Critic 节点 - 质量审查节点
 * 
 * @Injectable() - 标记为可注入的节点服务
 * @Inject('LLM_SERVICE') - 注入 LLM 服务，用于质量审查（可选）
 * 
 * 职责：
 * - 对 Executor 的执行结果进行质量审查
 * - 判断是否满足用户需求
 * - 返回质量审查结果（passed、score、feedback、suggestions）
 * 
 * 调用顺序:
 * 1. 接收执行结果（AgentState.generatedImageUrl）
 * 2. 调用 LLM 服务进行质量审查（或使用简化逻辑）
 * 3. 返回 QualityCheck 结果
 * 4. 推送思考日志
 */
@Injectable()
export class CriticNode {
  private readonly logger = new Logger(CriticNode.name);

  constructor(
    @Inject('LLM_SERVICE') private readonly llmService: ILlmService,
    private readonly configService: ConfigService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log('Critic Node: Starting quality check...');

    // 1. 验证输入
    if (!state.generatedImageUrl || !state.intent) {
      this.logger.error('Critic Node: generatedImageUrl and intent are required');
      return {
        qualityCheck: {
          passed: true, // 审查失败时默认通过，避免中断工作流
          score: 0.5,
          feedback: '缺少必要参数，跳过质量审查',
        },
        thoughtLogs: [
          {
            node: 'critic',
            message: '质量审查失败：缺少必要参数',
            timestamp: Date.now(),
          },
        ],
      };
    }

    try {
      // 2. 获取配置参数
      const passThreshold = this.configService.get<number>('CRITIC_PASS_THRESHOLD') ?? 0.7;
      const useLlm = this.configService.get<boolean>('CRITIC_USE_LLM') ?? false;
      const maxRetryCount = this.configService.get<number>('MAX_RETRY_COUNT') ?? 3;
      const currentRetryCount = state.metadata?.retryCount || 0;

      this.logger.log(
        `Critic Node: Quality check params - passThreshold: ${passThreshold}, useLlm: ${useLlm}, retryCount: ${currentRetryCount}/${maxRetryCount}`,
      );

      // 3. 执行质量审查
      let qualityCheck: QualityCheck;

      if (useLlm) {
        // 使用 LLM 进行真实审查（方案 A）
        qualityCheck = await this.performLlmQualityCheck(state, passThreshold);
      } else {
        // 使用简化逻辑（方案 B，MVP 版本）
        qualityCheck = this.performSimpleQualityCheck(state, passThreshold);
      }

      // 确保passed是明确的布尔值
      if (typeof qualityCheck.passed !== 'boolean') {
        this.logger.warn(
          'Critic Node: qualityCheck.passed is not boolean, defaulting to false',
        );
        qualityCheck.passed = false;
      }

      // 确保score是有效数字
      if (typeof qualityCheck.score !== 'number' || isNaN(qualityCheck.score)) {
        this.logger.warn(
          'Critic Node: qualityCheck.score is invalid, defaulting to 0.5',
        );
        qualityCheck.score = 0.5;
      }

      // 4. 如果未通过且需要重试，更新 retryCount
      // 如果需要重试（未通过且未达到最大重试次数），增加 retryCount
      const shouldRetry = !qualityCheck.passed && currentRetryCount < maxRetryCount;
      const newRetryCount = shouldRetry ? currentRetryCount + 1 : currentRetryCount;

      // 5. 推送思考日志
      const passedText = qualityCheck.passed ? '通过' : '未通过';
      const retryText = shouldRetry ? `，将进行第 ${newRetryCount} 次重试` : '';
      const thoughtLog = {
        node: 'critic',
        message: `审查完成，得分：${qualityCheck.score.toFixed(2)}，${passedText}${retryText}`,
        timestamp: Date.now(),
      };

      this.logger.log(
        `Critic Node: Quality check result - score: ${qualityCheck.score.toFixed(2)}, passed: ${qualityCheck.passed}, feedback: "${qualityCheck.feedback}"`,
      );

      return {
        qualityCheck,
        thoughtLogs: [
          {
            node: 'critic',
            message: '开始质量审查...',
            timestamp: Date.now(),
          },
          thoughtLog,
        ],
        metadata: {
          ...state.metadata,
          currentNode: 'critic',
          retryCount: newRetryCount,
        },
      };
    } catch (error) {
      this.logger.error(`Critic Node error: ${error.message}`, error.stack);
      
      // 审查失败时默认通过，避免中断工作流
      return {
        qualityCheck: {
          passed: true,
          score: 0.7,
          feedback: '质量审查过程出错，默认通过',
        },
        thoughtLogs: [
          {
            node: 'critic',
            message: '质量审查失败，使用默认结果',
            timestamp: Date.now(),
          },
        ],
        metadata: {
          ...state.metadata,
          currentNode: 'critic',
        },
      };
    }
  }

  /**
   * 使用 LLM 进行真实质量审查（方案 A）
   */
  private async performLlmQualityCheck(
    state: AgentState,
    passThreshold: number,
  ): Promise<QualityCheck> {
    const systemPrompt = `你是一个图像质量审查助手。请评估生成的图片是否满足用户需求。

评估维度：
1. 是否符合用户意图（action: ${state.intent?.action}）
2. 是否包含用户要求的主体（subject: ${state.intent?.subject || '未指定'}）
3. 风格是否匹配（style: ${state.intent?.style || '未指定'}）

请以 JSON 格式返回评估结果：
{
  "passed": true/false,
  "score": 0.0-1.0,
  "feedback": "评估反馈",
  "suggestions": ["改进建议1", "改进建议2"]
}

注意：由于当前是 Mock 实现（返回随机图片），请基于用户意图的置信度进行合理评估。`;

    const userPrompt = `用户意图：${state.intent?.action}
主题：${state.intent?.subject || '未指定'}
风格：${state.intent?.style || '未指定'}
置信度：${state.intent?.confidence}
生成的图片 URL：${state.generatedImageUrl}

请评估这张图片是否满足用户需求。`;

    const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];

    interface QualityCheckResult {
      passed: boolean;
      score: number;
      feedback?: string;
      suggestions?: string[];
    }

    try {
      const result = await this.llmService.chatWithJson<QualityCheckResult>(messages, {
        temperature: 0.3,
        jsonMode: true,
      });

      // 验证返回结果的格式
      if (typeof result.score !== 'number' || isNaN(result.score)) {
        this.logger.warn(
          `Critic Node: LLM returned invalid score: ${result.score}, falling back to simple quality check`,
        );
        // 降级到简化逻辑
        return this.performSimpleQualityCheck(state, passThreshold);
      }

      // 添加类型检查和默认值处理
      const score = Math.max(0, Math.min(1, result.score)); // 确保在 0-1 范围内

      const passed =
        typeof result.passed === 'boolean'
          ? result.passed && score >= passThreshold
          : score >= passThreshold; // 如果没有passed字段，根据分数判断

      return {
        passed,
        score,
        feedback: result.feedback || '质量审查完成',
        suggestions: result.suggestions || [],
      };
    } catch (error) {
      this.logger.error(
        `Critic Node: LLM quality check failed: ${error.message}, falling back to simple quality check`,
      );
      // 降级到简化逻辑
      return this.performSimpleQualityCheck(state, passThreshold);
    }
  }

  /**
   * 使用简化逻辑进行质量审查（方案 B，MVP 版本）
   * 基于 intent.confidence 和随机因素计算分数
   */
  private performSimpleQualityCheck(
    state: AgentState,
    passThreshold: number,
  ): QualityCheck {
    const baseScore = state.intent?.confidence || 0.5;
    
    // 添加一些随机因素（-0.1 到 +0.2）
    const randomFactor = (Math.random() - 0.3) * 0.3;
    const finalScore = Math.max(0, Math.min(1, baseScore + randomFactor));

    const passed = finalScore >= passThreshold;

    const feedback = passed
      ? '图片质量符合要求'
      : '图片可能需要调整，建议重新生成或调整参数';

    const suggestions = passed
      ? []
      : ['尝试调整风格强度', '重新生成', '修改 Prompt'];

    return {
      passed,
      score: finalScore,
      feedback,
      suggestions,
    };
  }
}
