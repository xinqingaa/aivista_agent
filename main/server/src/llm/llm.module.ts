import { Module } from '@nestjs/common';
import { AliyunLlmService } from './services/aliyun-llm.service';
import { LlmProviderFactory } from './services/llm-provider-factory.service';
import { ILlmService } from './interfaces/llm-service.interface';

/**
 * LLM 模块 - 提供多模型 LLM 服务支持
 * 
 * @Module() - 定义 LLM 模块，管理 LLM 相关的服务提供者
 * 
 * providers:
 *   - AliyunLlmService: 阿里云通义千问服务实现
 *   - LlmProviderFactory: LLM 提供商工厂，根据环境变量选择对应的服务
 *   - 'LLM_SERVICE': 使用工厂模式创建 LLM 服务实例
 *     useFactory: 根据 LLM_PROVIDER 环境变量选择对应的 LLM 提供商（Aliyun/DeepSeek/OpenAI）
 * 
 * exports: 导出 'LLM_SERVICE'，供其他模块（如 AgentModule）使用
 */
@Module({
  providers: [
    AliyunLlmService,
    LlmProviderFactory,
    {
      // provide: 'LLM_SERVICE' - 使用字符串 token 提供 LLM 服务
      // useFactory - 工厂函数，根据环境变量动态创建对应的 LLM 服务实例
      provide: 'LLM_SERVICE',
      useFactory: (factory: LlmProviderFactory) => factory.create(),
      inject: [LlmProviderFactory],
    },
  ],
  exports: ['LLM_SERVICE', LlmProviderFactory],
})
export class LlmModule {}

