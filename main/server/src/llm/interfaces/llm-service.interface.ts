import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage } from '@langchain/core/messages';

export interface ChatOptions {
  temperature?: number;
  jsonMode?: boolean; // 是否强制 JSON 输出
  modelName?: string; // 覆盖默认模型
}

export interface ILlmService {
  /**
   * 获取底层的 LangChain Model 实例
   * 用于 LangGraph 节点直接调用
   */
  getModel(options?: ChatOptions): BaseChatModel;

  /**
   * 通用对话接口 (简化版)
   */
  chat(messages: BaseMessage[], options?: ChatOptions): Promise<string>;

  /**
   * 结构化输出接口 (用于 Planner/Critic)
   */
  chatWithJson<T>(messages: BaseMessage[], schema?: any): Promise<T>;
}

