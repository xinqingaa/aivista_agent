import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmModule } from './llm/llm.module';
import { AgentModule } from './agent/agent.module';
import { validateEnvironment } from './config/configuration';

/**
 * 根模块 - 定义应用的整体结构
 * 
 * @Module() - 装饰器标记为 NestJS 模块，用于组织应用结构
 * 
 * imports - 导入子模块:
 *   - ConfigModule: 加载环境变量配置（.env 文件）
 *   - LlmModule: LLM 服务模块（提供多模型支持）
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
    LlmModule, // LLM 服务模块
    AgentModule, // Agent 工作流模块
  ],
})
export class AppModule {}

