import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { AgentState, IntentResult, QualityCheck } from '../interfaces/agent-state.interface';
import { GenUIComponent } from '../../common/types/genui-component.interface';
import { PlannerNode } from '../nodes/planner.node';
import { RagNode } from '../nodes/rag.node';
import { ExecutorNode } from '../nodes/executor.node';
import { CriticNode } from '../nodes/critic.node';

/**
 * LangGraph 状态通道定义
 * 
 * 使用 Annotation.Root 定义状态结构，每个字段对应一个通道
 * 每个通道需要定义 reducer 函数，用于合并状态更新
 */
const AgentStateAnnotation = Annotation.Root({
  // 用户输入 - 使用替换策略
  userInput: Annotation<AgentState['userInput']>({
    reducer: (current, update) => update ?? current,
    default: () => ({ text: '' }),
  }),

  // 意图结果 - 使用替换策略
  intent: Annotation<IntentResult | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),

  // 增强后的 Prompt - 使用替换策略（对象类型）
  enhancedPrompt: Annotation<AgentState['enhancedPrompt']>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),

  // 生成的图片 URL - 使用替换策略
  generatedImageUrl: Annotation<string | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),

  // 质量审查结果 - 使用替换策略
  qualityCheck: Annotation<QualityCheck | undefined>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),

  // 元数据 - 使用合并策略
  metadata: Annotation<AgentState['metadata']>({
    reducer: (current, update) => {
      if (!update) return current;
      return { ...current, ...update };
    },
    default: () => ({}),
  }),

  // UI 组件列表 - 使用追加策略
  uiComponents: Annotation<GenUIComponent[]>({
    reducer: (current, update) => {
      if (!update || update.length === 0) return current;
      return [...current, ...update];
    },
    default: () => [],
  }),

  // 思考日志 - 使用追加策略
  thoughtLogs: Annotation<AgentState['thoughtLogs']>({
    reducer: (current, update) => {
      if (!update || update.length === 0) return current;
      return [...current, ...update];
    },
    default: () => [],
  }),

  // 会话 ID - 使用替换策略
  sessionId: Annotation<string>({
    reducer: (current, update) => update ?? current,
    default: () => `session_${Date.now()}`,
  }),

  // 时间戳 - 使用替换策略
  timestamp: Annotation<number>({
    reducer: (current, update) => update ?? current,
    default: () => Date.now(),
  }),

  // 错误信息 - 使用替换策略
  error: Annotation<AgentState['error']>({
    reducer: (current, update) => update ?? current,
    default: () => undefined,
  }),
});

/**
 * 创建 Agent 工作流状态图
 * 
 * 工作流: planner → rag → executor → critic → (END 或 重试到 rag)
 * 
 * @param plannerNode - Planner 节点实例
 * @param ragNode - RAG 节点实例
 * @param executorNode - Executor 节点实例
 * @param criticNode - Critic 节点实例
 * @returns 编译后的 LangGraph 图实例
 */
export function createAgentGraph(
  plannerNode: PlannerNode,
  ragNode: RagNode,
  executorNode: ExecutorNode,
  criticNode: CriticNode,
) {
  const graph = new StateGraph(AgentStateAnnotation);

  // 添加节点
  graph.addNode('planner', async (state: typeof AgentStateAnnotation.State) => {
    return await plannerNode.execute(state as AgentState);
  });

  graph.addNode('rag', async (state: typeof AgentStateAnnotation.State) => {
    // 如果是从 critic 重试回来的，retryCount 已经在 critic 条件边中更新
    return await ragNode.execute(state as AgentState);
  });

  graph.addNode('executor', async (state: typeof AgentStateAnnotation.State) => {
    return await executorNode.execute(state as AgentState);
  });

  graph.addNode('critic', async (state: typeof AgentStateAnnotation.State) => {
    return await criticNode.execute(state as AgentState);
  });

  // 设置入口点：START → planner
  graph.addEdge(START, 'planner' as any);

  // 添加条件边：planner → rag（如果意图识别成功）
  graph.addConditionalEdges(
    'planner' as any,
    (state: typeof AgentStateAnnotation.State) => {
      // 如果意图识别失败或存在错误，直接结束
      if (state.error || state.intent?.action === 'unknown') {
        return END;
      }
      // 否则继续到 rag
      return 'rag';
    },
  );

  // rag → executor（RAG 节点总是继续，即使检索失败也使用原始 Prompt）
  graph.addEdge('rag' as any, 'executor' as any);

  // executor → critic（新增）
  graph.addConditionalEdges(
    'executor' as any,
    (state: typeof AgentStateAnnotation.State) => {
      if (state.error) return END;
      // 如果生成了图片，进入 critic
      if (state.generatedImageUrl) {
        return 'critic';
      }
      return END;
    },
  );

  // critic → (END 或 重试到 rag)（新增）
  graph.addConditionalEdges(
    'critic' as any,
    (state: typeof AgentStateAnnotation.State) => {
      if (state.error) return END;

      const qualityCheck = state.qualityCheck;
      const retryCount = state.metadata?.retryCount || 0;
      const maxRetryCount = 3; // 可以从配置读取

      // 如果通过，直接结束
      if (qualityCheck?.passed) {
        return END;
      }

      // 如果未通过且可重试，返回 rag（重试）
      // 注意：retryCount 已经在 critic 节点中更新（如果需要重试的话）
      if (retryCount <= maxRetryCount && !qualityCheck?.passed) {
        return 'rag';
      }

      // 即使未通过也返回结果（达到最大重试次数）
      return END;
    },
  );

  // 编译图
  return graph.compile();
}
