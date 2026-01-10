import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { EmbeddingProviderFactory } from './services/embedding-provider-factory.service';
import { IEmbeddingService } from './interfaces/embedding-service.interface';

/**
 * 知识库模块
 * 
 * @Module() - 标记为 NestJS 模块
 * 
 * 职责：
 * - 注册 KnowledgeService 和 EmbeddingService（多 provider 支持）
 * - 在应用启动时自动初始化知识库
 * - 根据环境变量动态选择 Embedding 服务提供商
 * - 提供知识库管理 API（查看、检索、统计）
 * 
 * 注意：Embedding 服务实现类不在模块中注册，而是由工厂按需创建
 * 这样可以避免未使用的服务要求 API key 导致启动失败
 */
@Module({
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    // Embedding 提供商工厂（延迟创建服务实例）
    EmbeddingProviderFactory,
    // 使用工厂模式提供统一的 Embedding 服务接口
    {
      provide: 'EMBEDDING_SERVICE',
      useFactory: (factory: EmbeddingProviderFactory) => factory.create(),
      inject: [EmbeddingProviderFactory],
    },
  ],
  exports: ['EMBEDDING_SERVICE', KnowledgeService, EmbeddingProviderFactory],
})
export class KnowledgeModule {}
