import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAlibabaTongyi } from '@langchain/community/chat_models/alibaba_tongyi';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ILlmService, ChatOptions } from '../interfaces/llm-service.interface';

/**
 * 阿里云通义千问 LLM 服务实现
 * 
 * @Injectable() - 标记为可注入的服务
 * implements ILlmService - 实现 LLM 服务接口，支持多模型切换
 * 
 * 主要方法:
 * - getModel(): 创建 LangChain 模型实例（ChatAlibabaTongyi）
 * - chat(): 通用对话接口，返回文本响应
 * - chatWithJson(): 结构化输出接口，用于意图解析（Planner Node 使用）
 */
@Injectable()
export class AliyunLlmService implements ILlmService {
  private readonly apiKey: string;
  private readonly defaultModelName: string;
  private readonly defaultTemperature: number;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DASHSCOPE_API_KEY') || '';
    this.defaultModelName = this.configService.get<string>('ALIYUN_MODEL_NAME') || 'qwen-turbo';
    this.defaultTemperature = this.configService.get<number>('ALIYUN_TEMPERATURE') || 0.3;

    if (!this.apiKey) {
      throw new Error('DASHSCOPE_API_KEY is required for AliyunLlmService');
    }
  }

  /**
   * 创建 LangChain 模型实例
   * 
   * 返回 ChatAlibabaTongyi 实例，用于与通义千问 API 交互
   */
  getModel(options?: ChatOptions): BaseChatModel {
    return new ChatAlibabaTongyi({
      alibabaApiKey: this.apiKey,
      modelName: options?.modelName || this.defaultModelName,
      temperature: options?.temperature ?? this.defaultTemperature,
      enableSearch: false, // 关闭联网搜索以提高速度
    });
  }

  /**
   * 通用对话接口
   * 
   * 调用 LangChain 模型进行对话，返回文本响应
   */
  async chat(messages: BaseMessage[], options?: ChatOptions): Promise<string> {
    const model = this.getModel(options);
    const response = await model.invoke(messages);
    return response.content as string;
  }

  /**
   * 结构化输出接口（用于意图解析）
   * 
   * 调用 LangChain 模型，要求返回 JSON 格式，并自动解析为指定类型
   * 主要用于 Planner Node 的意图识别
   * 
   * @param messages - 消息列表（包含 system 和 user 消息）
   * @param schema - 可选的 JSON schema，用于约束输出格式
   * @returns 解析后的 JSON 对象
   */
  async chatWithJson<T>(messages: BaseMessage[], schema?: any): Promise<T> {
    // 通义千问支持 JSON mode，通过 system message 指定
    const systemPrompt = schema
      ? `请以 JSON 格式返回结果，严格遵循以下 schema：\n${JSON.stringify(schema, null, 2)}`
      : '请以 JSON 格式返回结果。';

    const messagesWithSystem = [
      new SystemMessage(systemPrompt),
      ...messages,
    ];

    const model = this.getModel({ jsonMode: true });
    const response = await model.invoke(messagesWithSystem);
    const content = response.content as string;

    try {
      // 尝试解析 JSON（可能包含 markdown 代码块）
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      return JSON.parse(jsonString) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${content}`);
    }
  }
}

