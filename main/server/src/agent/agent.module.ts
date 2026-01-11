import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ImageModule } from '../image/image.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { PlannerNode } from './nodes/planner.node';
import { RagNode } from './nodes/rag.node';
import { ExecutorNode } from './nodes/executor.node';
import { CriticNode } from './nodes/critic.node';
import { createAgentGraph } from './graph/agent.graph';

/**
 * Agent 模块
 * 
 * 提供 Agent 工作流相关的服务：
 * - AgentController: SSE 端点
 * - AgentService: 工作流执行服务
 * - PlannerNode: 意图解析节点
 * - RagNode: RAG 检索节点
 * - ExecutorNode: 任务执行节点
 * - CriticNode: 质量审查节点
 * - AGENT_GRAPH: LangGraph 状态图实例
 */
@Module({
  imports: [LlmModule, KnowledgeModule, ImageModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    PlannerNode,
    RagNode,
    ExecutorNode,
    CriticNode,
    {
      provide: 'AGENT_GRAPH',
      useFactory: (
        plannerNode: PlannerNode,
        ragNode: RagNode,
        executorNode: ExecutorNode,
        criticNode: CriticNode,
      ) => {
        return createAgentGraph(plannerNode, ragNode, executorNode, criticNode);
      },
      inject: [PlannerNode, RagNode, ExecutorNode, CriticNode],
    },
  ],
})
export class AgentModule {}

