import { Injectable, Logger } from '@nestjs/common';
import { PlannerNode } from './nodes/planner.node';
import { ExecutorNode } from './nodes/executor.node';
import { AgentState } from './interfaces/agent-state.interface';

/**
 * Agent 工作流服务
 * 
 * @Injectable() - 标记为可注入的服务类，NestJS 会自动管理其生命周期
 * 
 * 调用顺序:
 * 1. PlannerNode.execute() - 意图识别节点，调用 LLM 解析用户意图
 * 2. ExecutorNode.execute() - 执行节点，根据意图执行相应任务（如生成图片）
 * 3. 通过 yield 推送事件流 - 将工作流执行过程中的事件流式推送给客户端
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly plannerNode: PlannerNode,
    private readonly executorNode: ExecutorNode,
  ) {}

  /**
   * 执行 Agent 工作流（异步生成器函数）
   * 
   * async *executeWorkflow() - 异步生成器函数，用于流式推送事件
   * 通过 yield 关键字将事件推送给调用者（AgentController）
   * 
   * 工作流步骤:
   * 1. Planner Node: 识别用户意图（generate_image/inpainting/adjust_parameters）
   * 2. 推送思考日志（thought_log 事件）
   * 3. Executor Node: 执行任务（如生成图片）
   * 4. 推送 GenUI 组件（gen_ui_component 事件）
   * 5. 推送流结束事件（stream_end 事件）
   */
  async *executeWorkflow(initialState: AgentState): AsyncGenerator<any> {
    let state: AgentState = { ...initialState };

    // Planner Node
    this.logger.log('Executing Planner Node...');
    const plannerResult = await this.plannerNode.execute(state);
    state = { ...state, ...plannerResult };

    // 推送思考日志
    if (plannerResult.thoughtLogs) {
      for (const log of plannerResult.thoughtLogs) {
        yield {
          type: 'thought_log',
          timestamp: log.timestamp,
          data: {
            node: log.node,
            message: log.message,
          },
        };
      }
    }

    // 如果意图识别失败，直接返回错误
    if (state.intent?.action === 'unknown' || state.error) {
      yield {
        type: 'error',
        timestamp: Date.now(),
        data: {
          code: state.error?.code || 'INTENT_UNKNOWN',
          message: state.error?.message || '无法识别用户意图',
        },
      };
      return;
    }

    // Executor Node
    this.logger.log('Executing Executor Node...');
    yield {
      type: 'thought_log',
      timestamp: Date.now(),
      data: {
        node: 'executor',
        message: `开始执行任务：${this.getActionLabel(state.intent!.action)}...`,
        progress: 50,
      },
    };

    const executorResult = await this.executorNode.execute(state);
    state = { ...state, ...executorResult };

    // 推送思考日志
    if (executorResult.thoughtLogs) {
      for (const log of executorResult.thoughtLogs) {
        yield {
          type: 'thought_log',
          timestamp: log.timestamp,
          data: {
            node: log.node,
            message: log.message,
            progress: 100,
          },
        };
      }
    }

    // 推送 GenUI 组件
    if (executorResult.uiComponents) {
      for (const component of executorResult.uiComponents) {
        yield {
          type: 'gen_ui_component',
          timestamp: component.timestamp || Date.now(),
          data: component,
        };
      }
    }

    // 流结束
    yield {
      type: 'stream_end',
      timestamp: Date.now(),
      data: {
        sessionId: state.sessionId,
        summary: '任务完成',
      },
    };
  }

  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      generate_image: '生成图片',
      inpainting: '局部重绘',
      adjust_parameters: '参数调整',
    };
    return labels[action] || '处理';
  }
}

