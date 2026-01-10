import { Controller, Get, Post, Param, Query, Body, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { StyleData } from './data/initial-styles';

/**
 * 风格数据响应 DTO
 */
class StyleResponseDto {
  @ApiProperty({ description: '风格 ID', example: 'style_001' })
  id: string;

  @ApiProperty({ description: '风格名称', example: 'Cyberpunk' })
  style: string;

  @ApiProperty({ description: '风格提示词', example: 'neon lights, high tech, low life...' })
  prompt: string;

  @ApiProperty({ description: '风格描述', example: '赛博朋克风格：霓虹灯、高科技...', required: false })
  description?: string;

  @ApiProperty({ description: '标签列表', example: ['cyberpunk', 'futuristic'], required: false })
  tags?: string[];

  @ApiProperty({ description: '元数据', example: { category: 'digital', popularity: 85 }, required: false })
  metadata?: Record<string, any>;
}

/**
 * 检索结果响应 DTO
 */
class SearchResponseDto {
  @ApiProperty({ description: '风格名称', example: 'Cyberpunk' })
  style: string;

  @ApiProperty({ description: '风格提示词', example: 'neon lights, high tech...' })
  prompt: string;

  @ApiProperty({ description: '相似度分数', example: 0.85 })
  similarity: number;

  @ApiProperty({ description: '元数据', example: {}, required: false })
  metadata?: Record<string, any>;
}

/**
 * 统计信息响应 DTO
 */
class StatsResponseDto {
  @ApiProperty({ description: '风格总数', example: 5 })
  count: number;

  @ApiProperty({ description: '向量维度', example: 1536 })
  dimension: number;

  @ApiProperty({ description: '数据库路径', example: './data/lancedb' })
  dbPath: string;

  @ApiProperty({ description: '表名', example: 'styles' })
  tableName: string;

  @ApiProperty({ description: '是否已初始化（数据库文件存在且表有数据）', example: true })
  initialized: boolean;

  @ApiProperty({ description: '数据库文件是否存在', example: true })
  dbExists: boolean;

  @ApiProperty({ description: '表是否已初始化（有数据）', example: true })
  tableInitialized: boolean;
}

/**
 * 添加风格请求 DTO
 */
class AddStyleRequestDto {
  @ApiProperty({ description: '风格 ID', example: 'style_006' })
  id: string;

  @ApiProperty({ description: '风格名称', example: 'Impressionist' })
  style: string;

  @ApiProperty({ description: '风格提示词', example: 'impressionist painting, soft brushstrokes...' })
  prompt: string;

  @ApiProperty({ description: '风格描述', required: false })
  description?: string;

  @ApiProperty({ description: '标签列表', required: false })
  tags?: string[];

  @ApiProperty({ description: '元数据', required: false })
  metadata?: Record<string, any>;
}

/**
 * 知识库管理控制器
 * 
 * @ApiTags('Knowledge') - Swagger 标签
 * @Controller('api/knowledge') - 路由前缀
 * 
 * 提供知识库的查看、检索和管理功能
 */
@ApiTags('Knowledge')
@Controller('api/knowledge')
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);

  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * 获取所有风格列表
   * 
   * GET /api/knowledge/styles
   */
  @Get('styles')
  @ApiOperation({
    summary: '获取所有风格列表',
    description: '返回知识库中所有风格数据的列表',
  })
  @ApiResponse({
    status: 200,
    description: '风格列表',
    type: [StyleResponseDto],
  })
  async getAllStyles(): Promise<StyleResponseDto[]> {
    this.logger.log('Getting all styles');
    // 注意：当前 KnowledgeService 没有 getAllStyles 方法
    // 这里返回初始数据，实际应该从数据库读取
    // 为了演示，我们返回 INITIAL_STYLES
    const { INITIAL_STYLES } = await import('./data/initial-styles');
    return INITIAL_STYLES.map((style) => ({
      id: style.id,
      style: style.style,
      prompt: style.prompt,
      description: style.description,
      tags: style.tags,
      metadata: style.metadata,
    }));
  }

  /**
   * 获取单个风格详情
   * 
   * GET /api/knowledge/styles/:id
   */
  @Get('styles/:id')
  @ApiOperation({
    summary: '获取单个风格详情',
    description: '根据 ID 获取单个风格的详细信息',
  })
  @ApiParam({ name: 'id', description: '风格 ID', example: 'style_001' })
  @ApiResponse({
    status: 200,
    description: '风格详情',
    type: StyleResponseDto,
  })
  @ApiResponse({ status: 404, description: '风格不存在' })
  async getStyleById(@Param('id') id: string): Promise<StyleResponseDto> {
    this.logger.log(`Getting style by id: ${id}`);
    const { INITIAL_STYLES } = await import('./data/initial-styles');
    const style = INITIAL_STYLES.find((s) => s.id === id);
    if (!style) {
      throw new Error(`Style with id ${id} not found`);
    }
    return {
      id: style.id,
      style: style.style,
      prompt: style.prompt,
      description: style.description,
      tags: style.tags,
      metadata: style.metadata,
    };
  }

  /**
   * 测试检索功能
   * 
   * GET /api/knowledge/search?query=xxx
   */
  @Get('search')
  @ApiOperation({
    summary: '测试检索功能',
    description: '根据查询文本检索相关风格，用于调试和测试',
  })
  @ApiQuery({
    name: 'query',
    description: '查询文本',
    example: '赛博朋克',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    description: '返回数量限制',
    example: 3,
    required: false,
  })
  @ApiQuery({
    name: 'minSimilarity',
    description: '最小相似度阈值',
    example: 0.4,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: '检索结果',
    type: [SearchResponseDto],
  })
  async search(
    @Query('query') query: string,
    @Query('limit') limit?: string,
    @Query('minSimilarity') minSimilarity?: string,
  ): Promise<SearchResponseDto[]> {
    this.logger.log(`Searching styles with query: "${query}"`);
    const results = await this.knowledgeService.search(query, {
      limit: limit ? parseInt(limit, 10) : undefined,
      minSimilarity: minSimilarity ? parseFloat(minSimilarity) : undefined,
    });
    return results.map((r) => ({
      style: r.style,
      prompt: r.prompt,
      similarity: r.similarity,
      metadata: r.metadata,
    }));
  }

  /**
   * 获取知识库统计信息
   * 
   * GET /api/knowledge/stats
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取知识库统计信息',
    description: '返回知识库的统计信息，包括总数、维度、路径等',
  })
  @ApiResponse({
    status: 200,
    description: '统计信息',
    type: StatsResponseDto,
  })
  async getStats(): Promise<StatsResponseDto> {
    this.logger.log('Getting knowledge base stats');
    const count = await this.knowledgeService.count();
    // 使用 KnowledgeService 的公共方法获取信息
    const stats = await this.knowledgeService.getStats();
    
    // 检查数据库文件是否存在
    const fs = await import('fs/promises');
    let dbExists = false;
    try {
      await fs.access(stats.dbPath);
      dbExists = true;
    } catch {
      dbExists = false;
    }
    
    return {
      count,
      dimension: stats.dimension,
      dbPath: stats.dbPath,
      tableName: 'styles',
      initialized: count > 0 && dbExists,
      dbExists,
      tableInitialized: count > 0,
    };
  }

  /**
   * 添加新风格（可选，用于未来扩展）
   * 
   * POST /api/knowledge/styles
   */
  @Post('styles')
  @ApiOperation({
    summary: '添加新风格',
    description: '向知识库添加新的风格数据（需要生成向量嵌入）',
  })
  @ApiBody({ type: AddStyleRequestDto })
  @ApiResponse({
    status: 201,
    description: '风格添加成功',
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async addStyle(@Body() styleData: AddStyleRequestDto): Promise<{ message: string; id: string }> {
    this.logger.log(`Adding new style: ${styleData.style}`);
    await this.knowledgeService.addStyle(styleData as StyleData);
    return {
      message: 'Style added successfully',
      id: styleData.id,
    };
  }
}
