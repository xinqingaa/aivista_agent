# LLM 服务适配层设计 (LLM Service Design)
## 目标

为了支持多模型切换（阿里云通义千问、DeepSeek、OpenAI 等），我们需要在应用层与模型层之间构建一个适配层（Adapter Layer）。
**核心原则：** 业务逻辑（Planner/Critic）不应感知具体使用的是哪个大模型。

## 接口定义 (ILlmService)
```typescript
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
```

## 配置管理
在 .env 中管理模型配置：
```bash
# LLM 提供商: 'aliyun' | 'deepseek' | 'openai'
LLM_PROVIDER=aliyun

# 阿里云配置
DASHSCOPE_API_KEY=sk-xxxxxx
ALIYUN_MODEL_NAME=qwen-turbo

# DeepSeek 配置
DEEPSEEK_API_KEY=sk-xxxxxx
DEEPSEEK_BASE_URL=[https://api.deepseek.com](https://api.deepseek.com)
```

## 实现策略 (Implementation)
### 阿里云通义千问实现 (AliyunLlmService)
使用 @langchain/community 中的 ChatAlibabaTongyi。
```typescript
@Injectable()
export class AliyunLlmService implements ILlmService {
  constructor(private configService: ConfigService) {}

  getModel(options?: ChatOptions): BaseChatModel {
    return new ChatAlibabaTongyi({
      alibabaApiKey: this.configService.get('DASHSCOPE_API_KEY'),
      modelName: options?.modelName || this.configService.get('ALIYUN_MODEL_NAME'),
      temperature: options?.temperature ?? 0.3,
      // 通义千问支持 JSON mode 的配置
      enableSearch: false, // 关闭联网搜索以提高速度
    });
  }
  // ... 实现其他接口
}
```
### DeepSeek 实现 (DeepSeekLlmService)
使用 @langchain/openai (DeepSeek 兼容 OpenAI 协议)。
```typescript
@Injectable()
  export class DeepSeekLlmService implements ILlmService {
    // ... 使用 ChatOpenAI 封装
  }
```
## 工厂模式 (LlmFactory)
```typescript
@Injectable()
export class LlmProviderFactory {
  create(provider: string): ILlmService {
    switch(provider) {
      case 'aliyun': return new AliyunLlmService(...);
      case 'deepseek': return new DeepSeekLlmService(...);
      default: throw new Error('Unsupported LLM Provider');
    }
  }
}
```
## 对 Agent 工作流的影响
所有 Node（Planner, Critic）不再直接注入 DeepSeekService，而是注入 ILlmService。
修改前：
```typescript
constructor(private deepSeek: DeepSeekService) {}
```
修改后：
```typescript
constructor(@Inject('LLM_SERVICE') private llm: ILlmService) {}
```