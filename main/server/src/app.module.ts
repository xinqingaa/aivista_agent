import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmModule } from './llm/llm.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { AgentModule } from './agent/agent.module';
import { ConversationModule } from './conversation/conversation.module';
import { databaseConfig } from './config/database.config';
import { validateEnvironment } from './config/configuration';

/**
 * 根模块 - 定义应用的整体结构
 * 
 * @Module() - 装饰器标记为 NestJS 模块，用于组织应用结构
 * 
 * imports - 导入子模块:
 *   - ConfigModule: 加载环境变量配置（.env 文件）
 *   - LlmModule: LLM 服务模块（提供多模型支持）
 *   - KnowledgeModule: 知识库模块（LanceDB 向量数据库）
 *   - AgentModule: Agent 工作流模块（包含控制器和服务）
 */
@Module({
  imports: [
    // ConfigModule.forRoot() - 加载环境变量配置，全局可用
    ConfigModule.forRoot({
      isGlobal: true, // 全局模块，所有模块都可以使用 ConfigService
      envFilePath: '.env', // 环境变量文件路径
      validate: validateEnvironment, // 验证环境变量格式和必填项
    }),
    databaseConfig, // 数据库配置（TypeORM）
    LlmModule, // LLM 服务模块
    KnowledgeModule, // 知识库模块
    AgentModule, // Agent 工作流模块
    ConversationModule, // 会话管理模块
  ],
})
export class AppModule {}

