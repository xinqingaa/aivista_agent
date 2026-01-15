import { Injectable, Logger, OnModuleInit, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as lancedb from '@lancedb/lancedb';
import * as path from 'path';
import * as fs from 'fs/promises';
import { IEmbeddingService } from './interfaces/embedding-service.interface';
import { INITIAL_STYLES, StyleData } from './data/initial-styles';
import { UpdateStyleDto } from './dto/update-style.dto';

/**
 * 系统内置样式ID列表
 * 这些样式不可删除，只能修改部分字段
 */
export const SYSTEM_STYLE_IDS = [
  'style_001', // Cyberpunk
  'style_002', // Watercolor
  'style_003', // Minimalist
  'style_004', // Oil Painting
  'style_005', // Anime
] as const;

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
    
    // 数据库迁移已废弃
    // 新初始化的数据库schema已正确，无需迁移
    // await this.migrateDatabase();
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
      this.logger.error(`Failed to open database at ${this.dbPath}: ${error.message}`, error.stack);
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

      // 准备数据
      const data = INITIAL_STYLES.map((style, index) => ({
        id: style.id,
        style: style.style,
        prompt: style.prompt,
        description: style.description || '',
        tags: style.tags || [],
        metadata: JSON.stringify(style.metadata || {}),
        vector: embeddings[index],
        isSystem: style.isSystem || false,
        createdAt: style.createdAt || new Date(),
        updatedAt: style.updatedAt || new Date(),
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
      // 检查数据库状态
      const dbCount = await this.count();
      if (dbCount === 0) {
        this.logger.warn('Knowledge base is empty! Please reinitialize by setting FORCE_INIT_KNOWLEDGE_BASE=true');
        return [];
      }

      const limit = options.limit || 3;
      const minSimilarity = options.minSimilarity || 0.4;

      // 生成查询向量
      const queryVector = await this.embeddingService.embed(query);

      // 执行向量搜索
      // @lancedb/lancedb API: search() 返回一个查询对象，可以链式调用 limit() 和 toArray()
      // 显式选择需要的字段，包括 vector 字段用于计算相似度
      const searchQuery = this.table.search(queryVector);
      const limitedQuery = searchQuery
        .select(['id', 'style', 'prompt', 'description', 'tags', 'metadata', 'vector']) // 显式选择字段，包括 vector
        .limit(limit * 2); // 获取更多结果，因为后续会过滤
      const results = await limitedQuery.toArray();

      if (results.length === 0) {
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
          } 
          // 使用距离字段转换为相似度（LanceDB 的标准方式）
          else if (result._distance !== undefined || result.distance !== undefined) {
            const distance = result._distance || result.distance;
            // L2 距离转换为相似度
            // 使用归一化方法：similarity = 1 / (1 + distance / scale_factor)
            const scaleFactor = 10000; // 基于观察到的距离值范围（7000-17000）
            similarity = 1 / (1 + distance / scaleFactor);
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

      const similarities = filteredStyles.map((r) => r.similarity.toFixed(2)).join(', ');
      this.logger.log(
        `Retrieved ${filteredStyles.length} styles for query: "${query}" (similarities: ${similarities})`,
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
   * 将数据库记录转换为StyleData对象
   * 处理JSON序列化的字段
   */
  private mapDbRecordToStyleData(record: any): StyleData {
    return {
      id: record.id,
      style: record.style,
      prompt: record.prompt,
      description: record.description || '',
      tags: record.tags || [],
      metadata: typeof record.metadata === 'string' 
        ? JSON.parse(record.metadata) 
        : record.metadata,
      isSystem: record.isSystem || false,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
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
          isSystem: style.isSystem || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      this.logger.log(`Added new style: ${style.style}`);
    } catch (error) {
      this.logger.error(`Failed to add style "${style.style}": ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除单个风格
   * @param id 风格ID
   * @throws ForbiddenException 如果是系统内置风格
   */
  async deleteStyle(id: string): Promise<void> {
    if (!this.table) {
      throw new Error('Knowledge base not initialized');
    }

    try {
      // 检查是否为系统内置
      if (await this.isSystemStyle(id)) {
        throw new ForbiddenException('Cannot delete system built-in style');
      }
      
      // 从数据库删除
      await this.table.delete(`id = '${id}'`);
      this.logger.log(`Deleted style: ${id}`);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to delete style "${id}": ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量删除风格
   * @param ids 风格ID数组
   */
  async deleteStyles(ids: string[]): Promise<{ deleted: number; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
      try {
        await this.deleteStyle(id);
        deleted.push(id);
      } catch (error) {
        failed.push(id);
        this.logger.warn(`Failed to delete style ${id}: ${error.message}`);
      }
    }

    return { deleted: deleted.length, failed };
  }

  /**
   * 更新单个风格
   * @param id 风格ID
   * @param updateData 更新数据
   * @throws ForbiddenException 如果是系统内置风格且尝试修改核心字段
   */
  async updateStyle(id: string, updateData: UpdateStyleDto): Promise<StyleData> {
    if (!this.table) {
      throw new Error('Knowledge base not initialized');
    }

    try {
      // 获取现有数据
      const existingStyles = await this.table
        .query()
        .where(`id = '${id}'`)
        .limit(1)
        .toArray();
      
      if (existingStyles.length === 0) {
        throw new NotFoundException(`Style with id ${id} not found`);
      }

      const existing = existingStyles[0];
      const isSystem = existing.isSystem || false;

      // 系统内置样式保护检查
      if (isSystem) {
        // 只允许更新 description、tags、metadata 字段
        const allowedFields = ['description', 'tags', 'metadata'];
        const restrictedFields = Object.keys(updateData).filter(
          key => !allowedFields.includes(key)
        );
        
        if (restrictedFields.length > 0) {
          throw new ForbiddenException(
            `Cannot modify system style fields: ${restrictedFields.join(', ')}`
          );
        }
      }

      // 检查 prompt 是否变化，如果变化需要重新计算向量
      let newVector = existing.vector;
      if (updateData.prompt && updateData.prompt !== existing.prompt) {
        const text = `${updateData.style || existing.style} ${updateData.prompt} ${updateData.description || existing.description || ''}`;
        newVector = await this.embeddingService.embed(text);
      }

      // 执行更新
      const updatedData = {
        ...existing,
        ...updateData,
        vector: newVector,
        updatedAt: new Date(),
      };

      // LanceDB 更新操作
      await this.table.update([updatedData]);
      this.logger.log(`Updated style: ${id}`);
      
      return updatedData;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update style "${id}": ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查是否为系统内置风格
   * @param id 风格ID
   */
  private async isSystemStyle(id: string): Promise<boolean> {
    // 首先检查是否在系统ID列表中
    if (SYSTEM_STYLE_IDS.includes(id as any)) {
      return true;
    }
    
    // 然后检查数据库中的 isSystem 标记
    try {
      const styles = await this.table
        .query()
        .where(`id = '${id}'`)
        .limit(1)
        .toArray();
      
      return styles.length > 0 && styles[0].isSystem === true;
    } catch (error) {
      this.logger.warn(`Failed to check system status for style ${id}: ${error.message}`);
      return false;
    }
  }

  /**
   * 数据库迁移：为现有数据添加系统标记
   */
  private async migrateDatabase(): Promise<void> {
    if (!this.table) {
      this.logger.warn('Table not initialized, skipping migration');
      return;
    }

    try {
      // 获取所有现有数据 - 使用零向量和大limit
      const dimension = this.embeddingService.getDimension();
      const zeroVector = new Array(dimension).fill(0);
      const allStyles = await this.table
        .search(zeroVector)
        .limit(10000)
        .toArray();
      
      if (!allStyles || allStyles.length === 0) {
        this.logger.log('No existing data to migrate');
        return;
      }

      // 识别系统内置样式
      const systemIds = SYSTEM_STYLE_IDS;
      
      // 批量更新
      const updates = allStyles.map(style => {
        const isSystemValue = systemIds.includes(style.id as any);
        return {
          ...style,
          isSystem: isSystemValue,
          createdAt: style.createdAt || new Date('2024-01-01'),
          updatedAt: new Date(),
        };
      });

      if (updates.length > 0) {
        await this.table.update(updates);
        this.logger.log(`Database migration completed: ${updates.length} styles updated`);
      }
    } catch (error) {
      this.logger.error('Database migration failed', error);
      // 不抛出错误，避免阻止服务启动
    }
  }

  /**
   * 获取所有风格
   */
  async getAllStyles(): Promise<StyleData[]> {
    if (!this.table) {
      this.logger.warn('Table not initialized');
      return [];
    }
    
    try {
      // 使用query()方法查询所有记录（不需要向量参数）
      const results = await this.table
        .query()
        .limit(10000)
        .toArray();
      
      this.logger.log(`Retrieved ${results.length} styles from database`);
      
      return results.map(result => this.mapDbRecordToStyleData(result));
    } catch (error) {
      this.logger.error(`Failed to get all styles: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 根据ID获取单个风格
   */
  async getStyleById(id: string): Promise<StyleData | null> {
    if (!this.table) {
      this.logger.warn('Table not initialized');
      return null;
    }
    
    try {
      const results = await this.table
        .query()
        .where(`id = '${id}'`)
        .limit(1)
        .toArray();
      
      if (results.length === 0) {
        this.logger.warn(`Style with id ${id} not found`);
        return null;
      }
      
      return this.mapDbRecordToStyleData(results[0]);
    } catch (error) {
      this.logger.error(`Failed to get style ${id}: ${error.message}`, error.stack);
      return null;
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
