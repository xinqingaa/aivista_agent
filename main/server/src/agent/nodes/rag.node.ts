import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentState } from '../interfaces/agent-state.interface';
import { KnowledgeService } from '../../knowledge/knowledge.service';

/**
 * RAG 节点 - 检索增强生成节点
 * 
 * @Injectable() - 标记为可注入的节点服务
 * 
 * 职责：
 * - 从向量数据库检索相关风格
 * - 增强用户输入的 Prompt
 * - 处理检索失败的情况（降级到原始 Prompt）
 * 
 * 调用顺序:
 * 1. 接收意图结果（AgentState.intent）
 * 2. 构建检索查询（style + subject + text）
 * 3. 调用 KnowledgeService.search() 进行向量检索
 * 4. 构建 enhancedPrompt 对象
 * 5. 推送思考日志
 * 6. 返回状态更新
 */
@Injectable()
export class RagNode {
  private readonly logger = new Logger(RagNode.name);

  // 风格名称映射（中文 → 英文）
  private readonly styleMap: Record<string, string> = {
    '赛博朋克': 'Cyberpunk',
    '水彩': 'Watercolor',
    '极简': 'Minimalist',
    '极简主义': 'Minimalist',
    '油画': 'Oil Painting',
    '动漫': 'Anime',
    '动画': 'Anime',
  };

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly configService: ConfigService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log('RAG Node: Starting style retrieval...');

    if (!state.intent) {
      this.logger.warn('RAG Node: intent is missing, skipping retrieval');
      // 如果没有意图，使用原始文本作为 Prompt
      return {
        enhancedPrompt: {
          original: state.userInput.text,
          retrieved: [],
          final: state.userInput.text,
        },
        thoughtLogs: [
          {
            node: 'rag',
            message: '未检测到意图，使用原始 Prompt',
            timestamp: Date.now(),
          },
        ],
      };
    }

    try {
      // 1. 构建检索查询
      // 优化策略：优先使用风格关键词（权重最高），减少通用词的干扰
      let queryText = '';
      let styleEnglish = '';

      // 如果存在风格关键词，优先使用风格进行检索
      if (state.intent.style) {
        styleEnglish = this.styleMap[state.intent.style] || '';
        // 构建加权查询：风格关键词（重复2次增加权重）+ 英文风格名称 + 主题
        // 不包含原始文本中的通用词（如"生成"、"一只"等），避免稀释风格关键词
        const queryParts = [
          state.intent.style, // 中文风格名称
          styleEnglish, // 英文风格名称（如果存在）
          styleEnglish, // 重复一次增加权重
          state.intent.subject, // 主题（如"猫"）
        ].filter(Boolean);
        queryText = queryParts.join(' ');
      } else {
        // 如果没有风格，使用 subject 和原始文本
        const queryParts = [
          state.intent.subject,
          state.userInput.text,
        ].filter(Boolean);
        queryText = queryParts.join(' ');
      }

      if (!queryText) {
        this.logger.warn('RAG Node: query text is empty, using original prompt');
        return {
          enhancedPrompt: {
            original: state.userInput.text,
            retrieved: [],
            final: state.userInput.text,
          },
          thoughtLogs: [
            {
              node: 'rag',
              message: '查询文本为空，使用原始 Prompt',
              timestamp: Date.now(),
            },
          ],
        };
      }

      // 2. 获取配置参数
      const minSimilarity = this.configService.get<number>('RAG_MIN_SIMILARITY') ?? 0.4;
      const searchLimit = this.configService.get<number>('RAG_SEARCH_LIMIT') ?? 3;

      // 3. 向量检索
      let results = await this.knowledgeService.search(queryText, {
        limit: searchLimit,
        minSimilarity,
      });

      // 4. 如果用户指定了特定风格，优先匹配该风格（过滤掉不相关的风格）
      if (state.intent.style && styleEnglish && results.length > 0) {
        const matchedStyle = results.find(
          (r) => r.style.toLowerCase() === styleEnglish.toLowerCase(),
        );
        if (matchedStyle) {
          // 如果找到了匹配的风格，优先使用它，但仍保留其他高相似度的风格
          // 但会过滤掉明显不相关的风格（相似度低于匹配风格相似度的 0.8 倍）
          const matchedSimilarity = matchedStyle.similarity;
          const threshold = matchedSimilarity * 0.8;
          results = results.filter((r) => r.similarity >= threshold);
          // 确保匹配的风格排在第一位
          results.sort((a, b) => {
            if (a.style.toLowerCase() === styleEnglish.toLowerCase()) return -1;
            if (b.style.toLowerCase() === styleEnglish.toLowerCase()) return 1;
            return b.similarity - a.similarity;
          });
        }
      }

      // 5. 如果第一次检索失败且存在中文风格名称，尝试仅使用英文风格名称再次检索
      if (results.length === 0 && styleEnglish) {
        results = await this.knowledgeService.search(styleEnglish, {
          limit: searchLimit,
          minSimilarity: minSimilarity * 0.8, // 降低阈值以便找到结果
        });
        if (results.length > 0) {
          this.logger.log(`RAG Node: Retry search succeeded with English style name only`);
        }
      }

      // 6. 构建增强后的 Prompt
      const originalPrompt = state.userInput.text;
      let finalPrompt = originalPrompt;

      if (results.length > 0) {
        // 提取检索到的 Prompt 关键词
        const retrievedPrompts = results.map((r) => r.prompt).join(', ');
        finalPrompt = `${originalPrompt}, ${retrievedPrompts}`;

        const styleNames = results.map((r) => r.style).join('、');
        const similarityScores = results.map((r) => r.similarity.toFixed(2)).join(', ');

        this.logger.log(
          `RAG Node: Retrieved ${results.length} styles: ${styleNames} (similarities: ${similarityScores})`,
        );
        this.logger.log(
          `RAG Node: Enhanced prompt - Original: "${originalPrompt}" -> Final: "${finalPrompt}"`,
        );

        return {
          enhancedPrompt: {
            original: originalPrompt,
            retrieved: results.map((r) => ({
              style: r.style,
              prompt: r.prompt,
              similarity: r.similarity,
            })),
            final: finalPrompt,
          },
          thoughtLogs: [
            {
              node: 'rag',
              message: `检索到 ${results.length} 条相关风格：${styleNames}`,
              timestamp: Date.now(),
            },
          ],
        };
      } else {
        // 未检索到匹配的风格，使用原始 Prompt
        this.logger.warn(
          `RAG Node: No matching styles found (query: "${queryText}", minSimilarity: ${minSimilarity}), using original prompt`,
        );
        return {
          enhancedPrompt: {
            original: originalPrompt,
            retrieved: [],
            final: originalPrompt,
          },
          thoughtLogs: [
            {
              node: 'rag',
              message: '未检索到匹配的风格，使用原始 Prompt',
              timestamp: Date.now(),
            },
          ],
        };
      }
    } catch (error) {
      // 检索失败时使用原始 Prompt，不中断工作流
      this.logger.error(`RAG Node error: ${error.message}`, error.stack);
      return {
        enhancedPrompt: {
          original: state.userInput.text,
          retrieved: [],
          final: state.userInput.text,
        },
        thoughtLogs: [
          {
            node: 'rag',
            message: '风格检索失败，使用原始 Prompt',
            timestamp: Date.now(),
          },
        ],
      };
    }
  }
}
