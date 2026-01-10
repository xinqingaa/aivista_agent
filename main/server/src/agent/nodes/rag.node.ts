import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly knowledgeService: KnowledgeService) {}

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
      // 优先使用 style，其次是 subject，最后是原始文本
      const queryParts = [
        state.intent.style,
        state.intent.subject,
        state.userInput.text,
      ].filter(Boolean);

      const queryText = queryParts.join(' ');

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

      // 2. 向量检索
      const results = await this.knowledgeService.search(queryText, {
        limit: 3, // 最多返回 3 条相关风格
        minSimilarity: 0.6, // 最小相似度阈值
      });

      // 3. 构建增强后的 Prompt
      const originalPrompt = state.userInput.text;
      let finalPrompt = originalPrompt;

      if (results.length > 0) {
        // 提取检索到的 Prompt 关键词
        const retrievedPrompts = results.map((r) => r.prompt).join(', ');
        finalPrompt = `${originalPrompt}, ${retrievedPrompts}`;

        this.logger.log(
          `RAG Node: Retrieved ${results.length} styles: ${results.map((r) => r.style).join(', ')}`,
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
              message: `检索到 ${results.length} 条相关风格：${results.map((r) => r.style).join('、')}`,
              timestamp: Date.now(),
            },
          ],
        };
      } else {
        // 未检索到匹配的风格，使用原始 Prompt
        this.logger.log('RAG Node: No matching styles found, using original prompt');
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
