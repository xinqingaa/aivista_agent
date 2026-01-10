import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as lancedb from 'vectordb';
import * as path from 'path';
import * as fs from 'fs/promises';
import { IEmbeddingService } from './interfaces/embedding-service.interface';
import { INITIAL_STYLES, StyleData } from './data/initial-styles';

/**
 * 检索到的风格数据
 */
export interface RetrievedStyle {
  style: string;
  prompt: string;
  similarity: number;
  metadata?: Record<string, any>;
}

/**
 * 检索选项
 */
export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
}

/**
 * 知识库服务
 * 
 * @Injectable() - 标记为可注入的服务类
 * @OnModuleInit() - 实现模块初始化钩子，启动时自动初始化知识库
 * 
 * 职责：
 * - LanceDB 数据库管理
 * - 风格数据的 CRUD 操作
 * - 向量检索功能
 * - 启动时自动初始化数据
 */
@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private db: any = null;
  private table: any = null;
  private readonly dbPath: string;
  private readonly tableName = 'styles';
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject('EMBEDDING_SERVICE')
    private readonly embeddingService: IEmbeddingService,
  ) {
    // 获取数据库路径
    this.dbPath = this.configService.get<string>('VECTOR_DB_PATH') || './data/lancedb';
  }

  /**
   * 模块初始化时自动执行
   */
  async onModuleInit() {
    await this.initialize();
  }

  /**
   * 初始化知识库
   * - 检查数据库是否存在
   * - 如果不存在或强制初始化，创建数据库并加载初始数据
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 确保目录存在
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });

      // 检查数据库是否已存在
      const dbExists = await this.checkDatabaseExists();
      const forceInit = this.configService.get<string>('FORCE_INIT_KNOWLEDGE_BASE') === 'true';

      if (dbExists && !forceInit) {
        this.logger.log('Knowledge base already exists, skipping initialization');
        await this.openDatabase();
        this.isInitialized = true;
        return;
      }

      if (forceInit) {
        this.logger.log('Force initialization enabled, reinitializing knowledge base...');
        // 删除现有数据库
        try {
          await fs.rm(this.dbPath, { recursive: true, force: true });
        } catch (error) {
          // 忽略删除错误
        }
      }

      // 创建数据库并初始化数据
      await this.createDatabase();
      await this.insertInitialStyles();

      this.isInitialized = true;
      this.logger.log(`Knowledge base initialized successfully with ${INITIAL_STYLES.length} styles`);
    } catch (error) {
      this.logger.error(`Failed to initialize knowledge base: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查数据库是否存在
   */
  private async checkDatabaseExists(): Promise<boolean> {
    try {
      await fs.access(this.dbPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 打开现有数据库
   */
  private async openDatabase(): Promise<void> {
    try {
      this.db = await lancedb.connect(this.dbPath);
      this.table = await this.db.openTable(this.tableName);
      this.logger.log('Knowledge base database opened successfully');
    } catch (error) {
      this.logger.error(`Failed to open database: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建新数据库
   */
  private async createDatabase(): Promise<void> {
    try {
      this.db = await lancedb.connect(this.dbPath);
      this.logger.log('Knowledge base database connection established');
    } catch (error) {
      this.logger.error(`Failed to create database: ${error.message}`);
      throw error;
    }
  }

  /**
   * 插入初始风格数据
   */
  private async insertInitialStyles(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.logger.log(`Generating embeddings for ${INITIAL_STYLES.length} styles...`);

      // 生成向量嵌入
      const texts = INITIAL_STYLES.map(
        (style) => `${style.style} ${style.prompt} ${style.description || ''}`,
      );
      const embeddings = await this.embeddingService.embedBatch(texts);

      // 准备数据
      const data = INITIAL_STYLES.map((style, index) => ({
        id: style.id,
        style: style.style,
        prompt: style.prompt,
        description: style.description || '',
        tags: style.tags || [],
        metadata: JSON.stringify(style.metadata || {}),
        vector: embeddings[index],
      }));

      // 创建表并插入数据
      this.table = await this.db.createTable(this.tableName, data);
      this.logger.log(`Created table and inserted ${data.length} styles into knowledge base`);
    } catch (error) {
      this.logger.error(`Failed to insert initial styles: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 向量检索
   * 
   * @param query - 查询文本
   * @param options - 检索选项
   * @returns 检索到的风格列表
   */
  async search(query: string, options: SearchOptions = {}): Promise<RetrievedStyle[]> {
    if (!this.table) {
      this.logger.warn('Knowledge base not initialized, returning empty results');
      return [];
    }

    try {
      const limit = options.limit || 3;
      const minSimilarity = options.minSimilarity || 0.6;

      // 生成查询向量
      const queryVector = await this.embeddingService.embed(query);

      // 执行向量搜索（使用余弦相似度）
      // 注意：vectordb 使用距离（越小越相似），我们需要将距离转换为相似度
      const results = await this.table
        .search(queryVector)
        .limit(limit * 2) // 获取更多结果，因为后续会过滤
        .toArray() as any[];

      // 转换结果格式
      // vectordb 返回的结果包含向量和距离信息
      const retrievedStyles: RetrievedStyle[] = results
        .map((result: any) => {
          // 计算余弦相似度
          const similarity = this.cosineSimilarity(queryVector, result.vector || []);
          return {
            style: result.style,
            prompt: result.prompt,
            similarity,
            metadata: result.metadata ? (typeof result.metadata === 'string' ? JSON.parse(result.metadata) : result.metadata) : {},
          };
        })
        .filter((item) => item.similarity >= minSimilarity) // 过滤低于阈值的
        .sort((a, b) => b.similarity - a.similarity) // 按相似度降序排序
        .slice(0, limit); // 限制返回数量

      this.logger.debug(`Retrieved ${retrievedStyles.length} styles for query: ${query}`);
      return retrievedStyles;
    } catch (error) {
      this.logger.error(`Vector search failed: ${error.message}`, error.stack);
      // 检索失败时返回空数组，不中断工作流
      return [];
    }
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * 添加新风格
   */
  async addStyle(style: StyleData): Promise<void> {
    if (!this.table) {
      throw new Error('Knowledge base not initialized');
    }

    try {
      // 生成向量嵌入
      const text = `${style.style} ${style.prompt} ${style.description || ''}`;
      const vector = await this.embeddingService.embed(text);

      // 插入数据
      await this.table.add([
        {
          id: style.id,
          style: style.style,
          prompt: style.prompt,
          description: style.description || '',
          tags: style.tags || [],
          metadata: JSON.stringify(style.metadata || {}),
          vector,
        },
      ]);

      this.logger.log(`Added new style: ${style.style}`);
    } catch (error) {
      this.logger.error(`Failed to add style: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取风格数量
   */
  async count(): Promise<number> {
    if (!this.table) {
      return 0;
    }

    try {
      const count = await this.table.countRows();
      return count;
    } catch (error) {
      this.logger.error(`Failed to count styles: ${error.message}`);
      return 0;
    }
  }
}
