import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { PlannerNode } from './nodes/planner.node';
import { ExecutorNode } from './nodes/executor.node';

@Module({
  imports: [LlmModule],
  controllers: [AgentController],
  providers: [AgentService, PlannerNode, ExecutorNode],
})
export class AgentModule {}

