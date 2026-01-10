import { Injectable, Inject, Logger } from '@nestjs/common';
import { AgentState } from './interfaces/agent-state.interface';

/**
 * Agent 工作流服务
 * 
 * @Injectable() - 标记为可注入的服务类，NestJS 会自动管理其生命周期
 * 
 * 使用 LangGraph 状态图执行工作流：
 * 1. 注入编译后的 LangGraph 图实例
 * 2. 使用 graph.stream() 进行流式执行
 * 3. 监听状态更新并转换为 SSE 事件
 * 4. 通过 yield 推送事件流给客户端
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @Inject('AGENT_GRAPH')
    private readonly graph: any, // LangGraph 编译后的图实例
  ) {}

  /**
   * 执行 Agent 工作流（异步生成器函数）
   * 
   * async *executeWorkflow() - 异步生成器函数，用于流式推送事件
   * 通过 yield 关键字将事件推送给调用者（AgentController）
   * 
   * 工作流步骤（由 LangGraph 编排）:
   * 1. Planner Node: 识别用户意图（generate_image/inpainting/adjust_parameters）
   * 2. Executor Node: 执行任务（如生成图片）
   * 3. 推送思考日志、GenUI 组件和流结束事件
   */
  async *executeWorkflow(initialState: AgentState): AsyncGenerator<any> {
    try {
      // 使用 LangGraph 的流式执行
      // streamMode: 'updates' 返回每个节点的状态更新
      const stream = await this.graph.stream(initialState, {
        streamMode: 'updates',
      });

      let currentState: AgentState = { ...initialState };
      let hasError = false;

      // 遍历流式更新
      for await (const chunk of stream) {
        // chunk 格式: { nodeName: Partial<AgentState> }
        // 例如: { planner: { intent: {...}, thoughtLogs: [...] } }
        
        for (const [nodeName, stateUpdate] of Object.entries(chunk)) {
          this.logger.log(`Node ${nodeName} executed, updating state...`);

          // 类型断言：stateUpdate 是 Partial<AgentState>
          const update = stateUpdate as Partial<AgentState>;

          // 合并状态更新
          currentState = { ...currentState, ...update };

          // 推送思考日志
          if (update.thoughtLogs && update.thoughtLogs.length > 0) {
            for (const log of update.thoughtLogs) {
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

          // 检查错误
          if (update.error) {
            hasError = true;
            yield {
              type: 'error',
              timestamp: Date.now(),
              data: {
                code: update.error.code,
                message: update.error.message,
                node: update.error.node || nodeName,
              },
            };
            break;
          }

          // 如果意图识别失败，推送错误并结束
          if (nodeName === 'planner' && update.intent?.action === 'unknown') {
            hasError = true;
            yield {
              type: 'error',
              timestamp: Date.now(),
              data: {
                code: 'INTENT_UNKNOWN',
                message: '无法识别用户意图',
                node: 'planner',
              },
            };
            break;
          }

          // Executor 节点执行时，推送进度提示
          if (nodeName === 'executor' && currentState.intent) {
            yield {
              type: 'thought_log',
              timestamp: Date.now(),
              data: {
                node: 'executor',
                message: `开始执行任务：${this.getActionLabel(currentState.intent.action)}...`,
                progress: 50,
              },
            };
          }

          // 推送 GenUI 组件
          if (update.uiComponents && update.uiComponents.length > 0) {
            for (const component of update.uiComponents) {
              yield {
                type: 'gen_ui_component',
                timestamp: component.timestamp || Date.now(),
                data: component,
              };
            }
          }
        }

        // 如果发生错误，提前结束
        if (hasError) {
          break;
        }
      }

      // 如果没有错误，推送流结束事件
      if (!hasError) {
        yield {
          type: 'stream_end',
          timestamp: Date.now(),
          data: {
            sessionId: currentState.sessionId,
            summary: '任务完成',
          },
        };
      }
    } catch (error) {
      this.logger.error(`Workflow execution error: ${error.message}`, error.stack);
      yield {
        type: 'error',
        timestamp: Date.now(),
        data: {
          code: 'WORKFLOW_ERROR',
          message: '工作流执行错误',
          details: error.message,
        },
      };
    }
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

