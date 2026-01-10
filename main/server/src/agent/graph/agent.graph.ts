import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { AgentState, IntentResult } from '../interfaces/agent-state.interface';
import { GenUIComponent } from '../../common/types/genui-component.interface';
import { PlannerNode } from '../nodes/planner.node';
import { RagNode } from '../nodes/rag.node';
import { ExecutorNode } from '../nodes/executor.node';

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
 * 工作流: planner → rag → executor → END
 * 
 * @param plannerNode - Planner 节点实例
 * @param ragNode - RAG 节点实例
 * @param executorNode - Executor 节点实例
 * @returns 编译后的 LangGraph 图实例
 */
export function createAgentGraph(
  plannerNode: PlannerNode,
  ragNode: RagNode,
  executorNode: ExecutorNode,
) {
  const graph = new StateGraph(AgentStateAnnotation);

  // 添加节点
  graph.addNode('planner', async (state: typeof AgentStateAnnotation.State) => {
    return await plannerNode.execute(state as AgentState);
  });

  graph.addNode('rag', async (state: typeof AgentStateAnnotation.State) => {
    return await ragNode.execute(state as AgentState);
  });

  graph.addNode('executor', async (state: typeof AgentStateAnnotation.State) => {
    return await executorNode.execute(state as AgentState);
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

  // executor → END
  graph.addEdge('executor' as any, END);

  // 编译图
  return graph.compile();
}
