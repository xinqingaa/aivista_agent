import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { PlannerNode } from './nodes/planner.node';
import { ExecutorNode } from './nodes/executor.node';
import { createAgentGraph } from './graph/agent.graph';
import { CompiledStateGraph } from '@langchain/langgraph';

/**
 * Agent 模块
 * 
 * 提供 Agent 工作流相关的服务：
 * - AgentController: SSE 端点
 * - AgentService: 工作流执行服务
 * - PlannerNode: 意图解析节点
 * - ExecutorNode: 任务执行节点
 * - AGENT_GRAPH: LangGraph 状态图实例
 */
@Module({
  imports: [LlmModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    PlannerNode,
    ExecutorNode,
    {
      provide: 'AGENT_GRAPH',
      useFactory: (plannerNode: PlannerNode, executorNode: ExecutorNode) => {
        return createAgentGraph(plannerNode, executorNode);
      },
      inject: [PlannerNode, ExecutorNode],
    },
  ],
})
export class AgentModule {}

