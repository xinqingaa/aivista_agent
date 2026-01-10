import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as lancedb from '@lancedb/lancedb';
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
      this.logger.debug(`Opening database at: ${this.dbPath}`);
      this.db = await lancedb.connect(this.dbPath);
      this.logger.debug(`Database connected, opening table: ${this.tableName}`);
      this.table = await this.db.openTable(this.tableName);
      this.logger.log('Knowledge base database opened successfully');
    } catch (error) {
      this.logger.error(`Failed to open database at ${this.dbPath}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建新数据库
   */
  private async createDatabase(): Promise<void> {
    try {
      this.logger.debug(`Creating database at: ${this.dbPath}`);
      this.db = await lancedb.connect(this.dbPath);
      this.logger.log('Knowledge base database connection established');
    } catch (error) {
      this.logger.error(`Failed to create database at ${this.dbPath}: ${error.message}`, error.stack);
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
      this.logger.debug(`Generated ${embeddings.length} embeddings, dimension: ${embeddings[0]?.length || 0}`);

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

      this.logger.debug(`Creating table "${this.tableName}" with ${data.length} records...`);
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
      // 检查数据库状态
      const dbCount = await this.count();
      if (dbCount === 0) {
        this.logger.warn('Knowledge base is empty! Please reinitialize by setting FORCE_INIT_KNOWLEDGE_BASE=true');
        return [];
      }
      this.logger.debug(`Knowledge base contains ${dbCount} styles`);

      const limit = options.limit || 3;
      const minSimilarity = options.minSimilarity || 0.4;

      // 生成查询向量
      const queryVector = await this.embeddingService.embed(query);
      this.logger.debug(`Search query: "${query}", vector dimension: ${queryVector.length}, first 3 values: [${queryVector.slice(0, 3).map(v => v.toFixed(4)).join(', ')}]`);

      // 执行向量搜索
      // @lancedb/lancedb API: search() 返回一个查询对象，可以链式调用 limit() 和 toArray()
      // 显式选择需要的字段，包括 vector 字段用于计算相似度
      const searchQuery = this.table.search(queryVector);
      const limitedQuery = searchQuery
        .select(['id', 'style', 'prompt', 'description', 'tags', 'metadata', 'vector']) // 显式选择字段，包括 vector
        .limit(limit * 2); // 获取更多结果，因为后续会过滤
      const results = await limitedQuery.toArray();

      this.logger.debug(`Raw search results count: ${results.length}`);

      // 调试：打印第一个结果的结构
      if (results.length > 0) {
        const firstResult = results[0];
        const resultKeys = Object.keys(firstResult);
        this.logger.debug(`First result keys: ${resultKeys.join(', ')}`);
        this.logger.debug(`First result sample (excluding vector): ${JSON.stringify(
          Object.fromEntries(
            Object.entries(firstResult).filter(([key]) => key !== 'vector')
          ),
          null,
          2
        ).substring(0, 500)}`);
        
        // 检查 vector 字段
        const hasVector = 'vector' in firstResult;
        const hasDistance = '_distance' in firstResult || 'distance' in firstResult;
        this.logger.debug(`Result has vector field: ${hasVector}, has distance field: ${hasDistance}`);
        
        if (hasVector) {
          const vectorLength = Array.isArray(firstResult.vector) ? firstResult.vector.length : 0;
          this.logger.debug(`Vector field length: ${vectorLength}`);
        }
        
        if (hasDistance) {
          const distance = firstResult._distance || firstResult.distance;
          this.logger.debug(`Distance value: ${distance}`);
        }
      } else {
        this.logger.warn(`No results returned from LanceDB search for query: "${query}"`);
      }

      // 转换结果格式
      // LanceDB 返回的结果包含向量和距离信息
      const retrievedStyles: RetrievedStyle[] = results
        .map((result: any) => {
          let similarity = 0;
          
          // 优先使用 vector 字段计算余弦相似度
          if (result.vector && Array.isArray(result.vector) && result.vector.length > 0) {
            if (result.vector.length !== queryVector.length) {
              this.logger.warn(
                `Vector dimension mismatch: query=${queryVector.length}, result=${result.vector.length}`,
              );
              return null;
            }
            similarity = this.cosineSimilarity(queryVector, result.vector);
            this.logger.debug(
              `Calculated cosine similarity for style "${result.style}": ${similarity.toFixed(4)}`,
            );
          } 
          // 使用距离字段转换为相似度（LanceDB 的标准方式）
          // 注意：从日志看，vector 字段虽然存在但长度为 0，而 _distance 字段总是存在
          // 所以我们直接使用距离字段
          else if (result._distance !== undefined || result.distance !== undefined) {
            const distance = result._distance || result.distance;
            // L2 距离转换为相似度
            // 使用归一化方法：similarity = 1 / (1 + distance / scale_factor)
            // scale_factor 需要根据实际距离范围调整
            const scaleFactor = 10000; // 基于观察到的距离值范围（7000-17000）
            similarity = 1 / (1 + distance / scaleFactor);
            this.logger.debug(
              `Using distance field for similarity calculation: distance=${distance.toFixed(2)}, similarity=${similarity.toFixed(4)}`,
            );
          } else {
            this.logger.warn(
              `Result missing both vector and distance fields: ${JSON.stringify(Object.keys(result))}`,
            );
            return null;
          }

          return {
            style: result.style,
            prompt: result.prompt,
            similarity,
            metadata: result.metadata
              ? typeof result.metadata === 'string'
                ? JSON.parse(result.metadata)
                : result.metadata
              : {},
          };
        });

      // 过滤掉 null 值，然后过滤低于阈值的，按相似度降序排序，限制返回数量
      const filteredStyles = retrievedStyles
        .filter((item): item is RetrievedStyle => item !== null) // 过滤掉 null
        .filter((item) => item.similarity >= minSimilarity) // 过滤低于阈值的
        .sort((a, b) => b.similarity - a.similarity) // 按相似度降序排序
        .slice(0, limit); // 限制返回数量

      this.logger.log(
        `Retrieved ${filteredStyles.length} styles for query: "${query}" (minSimilarity: ${minSimilarity}, raw results: ${results.length}, valid results: ${retrievedStyles.filter((item) => item !== null).length}, similarities: ${filteredStyles.map((r) => r.similarity.toFixed(2)).join(', ')})`,
      );
      
      if (filteredStyles.length === 0 && results.length > 0) {
        // 计算所有结果的相似度（包括被过滤的）
        const allSimilarities = results
          .map((r: any) => {
            if (r.vector && Array.isArray(r.vector) && r.vector.length > 0) {
              return this.cosineSimilarity(queryVector, r.vector);
            } else if (r._distance !== undefined) {
              const scaleFactor = 10000;
              return 1 / (1 + r._distance / scaleFactor);
            }
            return 0;
          })
          .filter((s) => !isNaN(s) && isFinite(s));
        
        const maxSimilarity = allSimilarities.length > 0 ? Math.max(...allSimilarities) : 0;
        this.logger.warn(
          `No styles passed similarity threshold (${minSimilarity}). Max similarity found: ${maxSimilarity.toFixed(3)}. Consider lowering RAG_MIN_SIMILARITY.`,
        );
      }
      
      return filteredStyles;
    } catch (error) {
      this.logger.error(
        `Vector search failed for query: "${query}": ${error.message}`,
        error.stack,
      );
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
      this.logger.debug(`Adding new style: ${style.style} (id: ${style.id})`);
      // 生成向量嵌入
      const text = `${style.style} ${style.prompt} ${style.description || ''}`;
      const vector = await this.embeddingService.embed(text);
      this.logger.debug(`Generated embedding for style "${style.style}", dimension: ${vector.length}`);

      // 插入数据
      // @lancedb/lancedb 使用 add() 方法添加数据
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
      this.logger.error(`Failed to add style "${style.style}": ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取风格数量
   */
  async count(): Promise<number> {
    if (!this.table) {
      this.logger.warn('Table not initialized, returning count 0');
      return 0;
    }

    try {
      const count = await this.table.countRows();
      this.logger.debug(`Knowledge base contains ${count} styles`);
      return count;
    } catch (error) {
      this.logger.error(`Failed to count styles: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 获取知识库统计信息
   */
  async getStats(): Promise<{ dimension: number; dbPath: string }> {
    const dimension = this.embeddingService.getDimension();
    return {
      dimension,
      dbPath: this.dbPath,
    };
  }
}
