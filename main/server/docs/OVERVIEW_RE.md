# AiVista 后端实现文档

## 目录

1. [架构概述](#架构概述)
2. [核心模块实现](#核心模块实现)
3. [技术实现细节](#技术实现细节)
4. [API 接口设计](#api-接口设计)
5. [数据流与状态管理](#数据流与状态管理)
6. [部署与运维](#部署与运维)
7. [总结](#总结)

---

## 架构概述

### 1.1 整体架构

AiVista 后端基于 **NestJS** 框架构建，使用 **LangGraph** 实现 Agent 工作流编排。架构设计遵循模块化、可扩展、易维护的原则。

```
┌─────────────────────────────────────────────────────────────┐
│                     NestJS Application                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Agent    │  │ Knowledge  │  │   Image    │  Modules  │
│  │  Module    │  │  Module    │  │  Module    │           │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │
│        │                │                │                  │
│  ┌─────▼────────────────▼────────────────▼──────┐          │
│  │        Core Services Layer                    │          │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────────┐   │          │
│  │  │   LLM   │ │Embedding│ │ LangGraph    │   │          │
│  │  │ Service │ │ Service │ │   Workflow   │   │          │
│  │  └─────────┘ └─────────┘ └──────────────┘   │          │
│  └───────────────────────────────────────────────┘          │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────┐          │
│  │         External Services Layer               │          │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │          │
│  │  │ Aliyun  │ │DeepSeek │ │    LanceDB      │ │          │
│  │  │  API    │ │  API    │ │  Vector Store   │ │          │
│  │  └─────────┘ └─────────┘ └─────────────────┘ │          │
│  └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| TypeScript | 5.x | 开发语言 |
| NestJS | 10.x | 后端框架 |
| LangGraph | Latest | Agent 编排 |
| LangChain | Latest | LLM 框架 |
| LanceDB | Latest | 向量数据库 |
| pnpm | 8.x | 包管理器 |

### 1.3 目录结构

```
server/
├── src/
│   ├── agent/              # Agent 工作流模块
│   │   ├── nodes/          # LangGraph 节点
│   │   │   ├── planner.node.ts
│   │   │   ├── rag.node.ts
│   │   │   ├── executor.node.ts
│   │   │   └── critic.node.ts
│   │   ├── interfaces/
│   │   │   └── agent-state.interface.ts
│   │   ├── agent.service.ts
│   │   ├── agent.controller.ts
│   │   ├── agent.module.ts
│   │   └── agent.graph.ts
│   ├── llm/                # LLM 服务适配层
│   │   ├── interfaces/
│   │   │   └── llm-service.interface.ts
│   │   ├── services/
│   │   │   ├── aliyun-llm.service.ts
│   │   │   ├── deepseek-llm.service.ts
│   │   │   └── llm-provider-factory.service.ts
│   │   └── llm.module.ts
│   ├── knowledge/          # 知识库模块
│   │   ├── knowledge.service.ts
│   │   ├── knowledge.controller.ts
│   │   └── knowledge.module.ts
│   ├── image/              # 图像服务模块
│   │   ├── interfaces/
│   │   │   └── image-service.interface.ts
│   │   ├── services/
│   │   │   ├── aliyun-image.service.ts
│   │   │   └── mock-image.service.ts
│   │   └── image.module.ts
│   └── main.ts
├── data/                   # 数据目录
│   └── lancedb/           # LanceDB 数据文件
├── docs/                  # 文档目录
├── test/                  # 测试目录
├── .env                   # 环境变量
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 核心模块实现

### 2.1 Agent 工作流模块

#### 2.1.1 模块概述

Agent 模块是整个系统的核心，负责：
1. 接收用户请求
2. 通过 LangGraph 编排工作流
3. 流式返回执行结果（SSE）

#### 2.1.2 LangGraph 状态定义

**文件位置**：`src/agent/interfaces/agent-state.interface.ts`

```typescript
interface AgentState {
  // 用户输入
  userInput: {
    text: string;                      // 用户文本
    maskData?: {                       // 蒙版数据（局部重绘）
      base64: string;
      imageUrl: string;
    };
    preferredModel?: string;           // 首选模型
    previousPrompts?: string[];        // 历史提示词（多轮）
  };

  // 意图识别结果
  intent?: {
    action: 'generate_image' | 'inpainting' | 'adjust_parameters';
    subject?: string;
    style?: string;
    confidence: number;
  };

  // RAG 增强结果
  enhancedPrompt?: {
    original: string;
    retrieved: Array<{
      style: string;
      prompt: string;
      similarity: number;
    }>;
    final: string;
  };

  // 执行结果
  executionResult?: {
    imageUrl: string;
    taskType: string;
    metadata?: any;
  };

  // UI 组件列表
  uiComponents?: GenUIComponent[];

  // 思考日志
  thoughtLogs?: ThoughtLog[];

  // 错误信息
  error?: {
    code: string;
    message: string;
    node?: string;
  };

  // 元数据
  sessionId: string;
  metadata?: {
    currentNode: string;
    retryCount: number;
    startTime: number;
  };
}
```

#### 2.1.3 节点实现

**1. Planner Node（规划节点）**

**文件位置**：`src/agent/nodes/planner.node.ts`

```typescript
@Injectable()
export class PlannerNode {
  constructor(
    @Inject('LLM_SERVICE')
    private readonly llmService: ILlmService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    // 1. 构建系统提示词
    const systemPrompt = `
你是一个专业的 AI 图像生成助手。请分析用户的输入，识别用户的意图。

可能的意图类型：
- generate_image: 用户想要生成新图片
- inpainting: 用户想要修改图片的某个区域（通常伴随蒙版数据）
- adjust_parameters: 用户想要调整生成参数

请以 JSON 格式返回分析结果。
`;

    // 2. 调用 LLM
    const intent = await this.llmService.chatWithJson<IntentResult>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: state.userInput.text }
      ],
      { temperature: 0.3, jsonMode: true }
    );

    // 3. 如果有蒙版，强制设置为 inpainting
    if (state.userInput.maskData && intent.action !== 'inpainting') {
      intent.action = 'inpainting';
    }

    // 4. 返回状态更新
    return {
      intent,
      thoughtLogs: [{
        node: 'planner',
        message: `已识别意图：${intent.action}`,
        timestamp: Date.now()
      }]
    };
  }
}
```

**2. RAG Node（检索增强节点）**

**文件位置**：`src/agent/nodes/rag.node.ts`

```typescript
@Injectable()
export class RagNode {
  constructor(
    private readonly knowledgeService: KnowledgeService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.intent) {
      throw new Error('Intent is required for RAG node');
    }

    // 1. 构建检索查询
    const queryText = [
      state.intent.style,
      state.intent.subject,
      state.userInput.text
    ].filter(Boolean).join(' ');

    // 2. 向量检索
    const results = await this.knowledgeService.search(queryText, {
      limit: 3,
      minSimilarity: 0.4
    });

    // 3. 构建增强 Prompt
    const originalPrompt = state.userInput.text;
    const retrievedPrompts = results.map(r => r.prompt).join(', ');
    const finalPrompt = retrievedPrompts
      ? `${originalPrompt}, ${retrievedPrompts}`
      : originalPrompt;

    // 4. 返回增强结果
    return {
      enhancedPrompt: {
        original: originalPrompt,
        retrieved: results,
        final: finalPrompt
      },
      thoughtLogs: [{
        node: 'rag',
        message: results.length > 0
          ? `检索到 ${results.length} 条相关风格`
          : '未检索到匹配的风格',
        timestamp: Date.now()
      }]
    };
  }
}
```

**3. Executor Node（执行节点）**

**文件位置**：`src/agent/nodes/executor.node.ts`

```typescript
@Injectable()
export class ExecutorNode {
  constructor(
    @Inject('IMAGE_SERVICE')
    private readonly imageService: IImageService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.intent || !state.enhancedPrompt) {
      throw new Error('Intent and enhancedPrompt are required');
    }

    const { action } = state.intent;
    const prompt = state.enhancedPrompt.final;

    let executionResult;

    switch (action) {
      case 'generate_image':
        executionResult = await this.imageService.generateImage({
          prompt,
          model: state.userInput.preferredModel
        });
        break;

      case 'inpainting':
        if (!state.userInput.maskData) {
          throw new Error('Inpainting requires maskData');
        }
        executionResult = await this.imageService.inpaint({
          prompt,
          image: state.userInput.maskData.imageUrl,
          mask: state.userInput.maskData.base64
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // 生成 GenUI 组件
    const uiComponents: GenUIComponent[] = [{
      widgetType: 'ImageView',
      props: {
        imageUrl: executionResult.imageUrl,
        width: 800,
        height: 600
      },
      timestamp: Date.now()
    }];

    return {
      executionResult,
      uiComponents,
      thoughtLogs: [{
        node: 'executor',
        message: '图片生成完成',
        timestamp: Date.now()
      }]
    };
  }
}
```

**4. Critic Node（审查节点，可选）**

**文件位置**：`src/agent/nodes/critic.node.ts`

```typescript
@Injectable()
export class CriticNode {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.executionResult) {
      throw new Error('Execution result is required');
    }

    // 基于 confidence 和随机因素评估
    const baseScore = state.intent?.confidence || 0.7;
    const randomFactor = Math.random() * 0.2;
    const finalScore = Math.min(1.0, baseScore + randomFactor);
    const passed = finalScore > 0.7;

    return {
      qualityCheck: {
        passed,
        score: finalScore,
        feedback: passed ? '质量符合要求' : '建议重新生成'
      },
      thoughtLogs: [{
        node: 'critic',
        message: `质量评分：${finalScore.toFixed(2)}`,
        timestamp: Date.now()
      }]
    };
  }
}
```

#### 2.1.4 LangGraph 图构建

**文件位置**：`src/agent/agent.graph.ts`

```typescript
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';

// 定义状态注释
const AgentStateAnnotation = Annotation.Root({
  userInput: Annotation<AgentState['userInput']>(),
  intent: Annotation<IntentResult>(),
  enhancedPrompt: Annotation<AgentState['enhancedPrompt']>(),
  executionResult: Annotation<AgentState['executionResult']>(),
  uiComponents: Annotation<GenUIComponent[]>(),
  thoughtLogs: Annotation<ThoughtLog[]>(),
  error: Annotation<AgentState['error']>(),
  sessionId: Annotation<string>(),
  metadata: Annotation<AgentState['metadata']>(),
});

export function createAgentGraph(
  plannerNode: PlannerNode,
  ragNode: RagNode,
  executorNode: ExecutorNode,
) {
  const graph = new StateGraph(AgentStateAnnotation);

  // 添加节点
  graph.addNode('planner', plannerNode.execute.bind(plannerNode));
  graph.addNode('rag', ragNode.execute.bind(ragNode));
  graph.addNode('executor', executorNode.execute.bind(executorNode));

  // 设置入口点
  graph.addEdge(START, 'planner');

  // 添加条件边
  graph.addConditionalEdges(
    'planner',
    (state) => {
      if (state.error || state.intent?.action === 'unknown') {
        return END;
      }
      return 'rag';
    }
  );

  graph.addEdge('rag', 'executor');
  graph.addEdge('executor', END);

  return graph.compile();
}
```

#### 2.1.5 Agent Service

**文件位置**：`src/agent/agent.service.ts`

```typescript
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @Inject('AGENT_GRAPH')
    private readonly graph: any,
  ) {}

  async *executeWorkflow(initialState: AgentState): AsyncGenerator<any> {
    try {
      // 流式执行
      const stream = await this.graph.stream(initialState, {
        streamMode: 'updates',
      });

      let currentState = initialState;
      let hasError = false;

      // 遍历流式更新
      for await (const chunk of stream) {
        for (const [nodeName, stateUpdate] of Object.entries(chunk)) {
          const update = stateUpdate as Partial<AgentState>;
          currentState = { ...currentState, ...update };

          // 推送思考日志
          if (update.thoughtLogs) {
            for (const log of update.thoughtLogs) {
              yield {
                type: 'thought_log',
                timestamp: log.timestamp,
                data: {
                  node: log.node,
                  message: log.message,
                },
              };
            }
          }

          // 推送 GenUI 组件
          if (update.uiComponents) {
            for (const component of update.uiComponents) {
              yield {
                type: 'gen_ui_component',
                timestamp: component.timestamp || Date.now(),
                data: component,
              };
            }
          }

          // 检查错误
          if (update.error) {
            hasError = true;
            yield {
              type: 'error',
              timestamp: Date.now(),
              data: update.error,
            };
            break;
          }
        }

        if (hasError) break;
      }

      // 流结束
      if (!hasError) {
        yield {
          type: 'stream_end',
          timestamp: Date.now(),
          data: {
            sessionId: currentState.sessionId,
            summary: '任务完成',
          },
        };
      }
    } catch (error) {
      this.logger.error(`Workflow execution error: ${error.message}`);
      yield {
        type: 'error',
        timestamp: Date.now(),
        data: {
          code: 'WORKFLOW_ERROR',
          message: '工作流执行错误',
          details: error.message,
        },
      };
    }
  }
}
```

#### 2.1.6 Agent Controller

**文件位置**：`src/agent/agent.controller.ts`

```typescript
@Controller('api/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  @Sse() // 使用自定义 SSE 装饰
  async chat(@Body() request: ChatRequest, @Res() res: Response) {
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 生成 sessionId
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 推送连接确认
    res.write(`event: connection\n`);
    res.write(`data: ${JSON.stringify({
      type: 'connection',
      timestamp: Date.now(),
      data: { status: 'connected', sessionId }
    })}\n\n`);

    // 执行工作流
    const initialState: AgentState = {
      sessionId,
      userInput: {
        text: request.text,
        maskData: request.maskData,
        preferredModel: request.preferredModel,
        previousPrompts: request.previousPrompts
      },
      metadata: {
        startTime: Date.now(),
        currentNode: 'start',
        retryCount: 0
      }
    };

    try {
      for await (const event of this.agentService.executeWorkflow(initialState)) {
        res.write(`event: ${event.type}\n`);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        timestamp: Date.now(),
        data: { code: 'EXECUTION_ERROR', message: error.message }
      })}\n\n`);
    } finally {
      res.end();
    }
  }
}
```

---

### 2.2 LLM 服务适配层

#### 2.2.1 接口定义

**文件位置**：`src/llm/interfaces/llm-service.interface.ts`

```typescript
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage } from '@langchain/core/messages';

export interface ChatOptions {
  temperature?: number;
  jsonMode?: boolean;
  modelName?: string;
}

export interface ILlmService {
  getModel(options?: ChatOptions): BaseChatModel;

  chat(messages: BaseMessage[], options?: ChatOptions): Promise<string>;

  chatWithJson<T>(
    messages: BaseMessage[],
    options?: ChatOptions
  ): Promise<T>;
}
```

#### 2.2.2 阿里云实现

**文件位置**：`src/llm/services/aliyun-llm.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ChatAlibabaTongyi } from '@langchain/community/chat_models/alibaba_tongyi';
import { BaseMessage } from '@langchain/core/messages';
import { ILlmService, ChatOptions } from '../interfaces/llm-service.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AliyunLlmService implements ILlmService {
  constructor(private readonly configService: ConfigService) {}

  getModel(options?: ChatOptions) {
    return new ChatAlibabaTongyi({
      alibabaApiKey: this.configService.get('DASHSCOPE_API_KEY'),
      modelName: options?.modelName || this.configService.get('ALIYUN_MODEL_NAME'),
      temperature: options?.temperature ?? 0.3,
      enableSearch: false,
    });
  }

  async chat(messages: BaseMessage[], options?: ChatOptions): Promise<string> {
    const model = this.getModel(options);
    const response = await model.invoke(messages);
    return response.content as string;
  }

  async chatWithJson<T>(
    messages: BaseMessage[],
    options?: ChatOptions
  ): Promise<T> {
    const model = this.getModel(options);
    const response = await model.invoke(messages);
    const content = response.content as string;

    // 解析 JSON
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${content}`);
    }
  }
}
```

#### 2.2.3 DeepSeek 实现

**文件位置**：`src/llm/services/deepseek-llm.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
import { ILlmService, ChatOptions } from '../interfaces/llm-service.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeepSeekLlmService implements ILlmService {
  constructor(private readonly configService: ConfigService) {}

  getModel(options?: ChatOptions) {
    return new ChatOpenAI({
      openAIApiKey: this.configService.get('DEEPSEEK_API_KEY'),
      configuration: {
        baseURL: this.configService.get('DEEPSEEK_BASE_URL'),
      },
      modelName: options?.modelName || 'deepseek-chat',
      temperature: options?.temperature ?? 0.3,
    });
  }

  async chat(messages: BaseMessage[], options?: ChatOptions): Promise<string> {
    const model = this.getModel(options);
    const response = await model.invoke(messages);
    return response.content as string;
  }

  async chatWithJson<T>(
    messages: BaseMessage[],
    options?: ChatOptions
  ): Promise<T> {
    const model = this.getModel({ ...options, temperature: 0 });
    const response = await model.invoke(messages);
    const content = response.content as string;

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${content}`);
    }
  }
}
```

#### 2.2.4 工厂模式

**文件位置**：`src/llm/services/llm-provider-factory.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmService } from '../interfaces/llm-service.interface';
import { AliyunLlmService } from './aliyun-llm.service';
import { DeepSeekLlmService } from './deepseek-llm.service';

@Injectable()
export class LlmProviderFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly aliyunService: AliyunLlmService,
    private readonly deepseekService: DeepSeekLlmService,
  ) {}

  create(): ILlmService {
    const provider = this.configService.get('LLM_PROVIDER', 'aliyun');

    switch (provider) {
      case 'aliyun':
        return this.aliyunService;
      case 'deepseek':
        return this.deepseekService;
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
```

---

### 2.3 知识库模块

#### 2.3.1 Knowledge Service

**文件位置**：`src/knowledge/knowledge.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import lancedb from 'lancedb';
import { OpenAIEmbedding } from 'lancedb/embeddings/openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KnowledgeService {
  private readonly db;
  private readonly table;
  private readonly embedding;

  constructor(private readonly configService: ConfigService) {
    // 初始化 LanceDB
    const dbPath = this.configService.get('LANCEDB_PATH', './data/lancedb');
    this.db = await lancedb.connect(dbPath);

    // 初始化 Embedding 服务
    const embeddingProvider = this.configService.get('EMBEDDING_PROVIDER', 'aliyun');
    this.embedding = this.createEmbedding(embeddingProvider);

    // 获取或创建表
    const tableName = 'styles';
    const tables = await this.db.tableNames();
    if (!tables.includes(tableName)) {
      await this.initializeTable();
    }
    this.table = await this.db.openTable(tableName);
  }

  private createEmbedding(provider: string) {
    switch (provider) {
      case 'aliyun':
        return new OpenAIEmbedding({
          openAIApiKey: this.configService.get('DASHSCOPE_API_KEY'),
          configuration: {
            baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          },
        });
      default:
        throw new Error(`Unsupported embedding provider: ${provider}`);
    }
  }

  async initializeTable() {
    const initialData = [
      {
        id: 'style_001',
        style: 'Cyberpunk',
        prompt: 'neon lights, high tech, low life, dark city background',
        description: '赛博朋克风格：霓虹灯、高科技、低生活',
      },
      // ... 更多预置数据
    ];

    await this.db.createTable('styles', initialData);
  }

  async search(query: string, options: { limit?: number; minSimilarity?: number } = {}) {
    const { limit = 3, minSimilarity = 0.4 } = options;

    // 生成查询向量
    const queryVector = await this.embedding.embedQuery(query);

    // 向量检索
    const results = await this.table
      .vectorSearch(queryVector)
      .limit(limit)
      .distanceType('cosine')
      .toArray();

    // 过滤低相似度结果
    return results
      .filter(r => r._distance >= minSimilarity)
      .map(r => ({
        style: r.style,
        prompt: r.prompt,
        similarity: r._distance,
        metadata: r.metadata
      }));
  }
}
```

---

### 2.4 图像服务模块

#### 2.4.1 接口定义

**文件位置**：`src/image/interfaces/image-service.interface.ts`

```typescript
export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  size?: string;
}

export interface InpaintOptions {
  prompt: string;
  image: string;
  mask: string;
}

export interface IImageService {
  generateImage(options: GenerateImageOptions): Promise<{ imageUrl: string }>;
  inpaint(options: InpaintOptions): Promise<{ imageUrl: string }>;
}
```

#### 2.4.2 阿里云实现

**文件位置**：`src/image/services/aliyun-image.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IImageService, GenerateImageOptions, InpaintOptions } from '../interfaces/image-service.interface';

@Injectable()
export class AliyunImageService implements IImageService {
  private readonly apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation';

  constructor(private readonly configService: ConfigService) {}

  async generateImage(options: GenerateImageOptions): Promise<{ imageUrl: string }> {
    const response = await axios.post(
      this.apiUrl,
      {
        model: options?.model || 'qwen-image-max',
        input: { prompt: options.prompt },
        parameters: { size: options?.size || '1024*1024' }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.configService.get('DASHSCOPE_API_KEY')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { imageUrl: response.data.output.results[0].url };
  }

  async inpaint(options: InpaintOptions): Promise<{ imageUrl: string }> {
    // 阿里云的局部重绘 API 调用
    // 实现类似 generateImage
  }
}
```

#### 2.4.3 Mock 实现

**文件位置**：`src/image/services/mock-image.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { IImageService, GenerateImageOptions, InpaintOptions } from '../interfaces/image-service.interface';

@Injectable()
export class MockImageService implements IImageService {
  async generateImage(options: GenerateImageOptions): Promise<{ imageUrl: string }> {
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 生成基于 prompt 的 seed
    const seed = this.hashString(options.prompt);
    const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;

    return { imageUrl };
  }

  async inpaint(options: InpaintOptions): Promise<{ imageUrl: string }> {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const seed = this.hashString(options.prompt + options.mask.substring(0, 20));
    const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;

    return { imageUrl };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
```

---

## 技术实现细节

### 3.1 SSE 流式响应

Server-Sent Events (SSE) 实现要点：

1. **响应头设置**：
   ```
   Content-Type: text/event-stream
   Cache-Control: no-cache
   Connection: keep-alive
   X-Accel-Buffering: no
   ```

2. **事件格式**：
   ```
   event: thought_log
   data: {"type":"thought_log","timestamp":1234567890,"data":{...}}

   event: gen_ui_component
   data: {"type":"gen_ui_component",...}
   ```

3. **连接管理**：
   - 使用异步生成器 (`async *`) 流式推送
   - 错误时自动关闭连接
   - 支持 `stream_end` 事件标记结束

### 3.2 多模型适配

通过 **工厂模式 + 接口抽象** 实现多模型适配：

- **接口层**：`ILlmService`, `IImageService`
- **实现层**：各供应商的具体实现
- **工厂层**：根据配置动态创建实例
- **调用层**：业务代码只依赖接口

### 3.3 向量检索

使用 **LanceDB** 实现本地向量数据库：

1. **初始化**：
   - 连接本地数据库文件
   - 创建表（如不存在）
   - 插入预置数据

2. **Embedding**：
   - 使用阿里云 DashScope API
   - 生成 1536 维向量
   - 支持多语言文本

3. **检索**：
   - 余弦相似度计算
   - 返回 Top-K 结果
   - 过滤低相似度结果

### 3.4 错误处理

统一错误处理策略：

1. **错误类型**：
   - `INVALID_INPUT_EMPTY`: 空输入
   - `INTENT_UNKNOWN`: 意图识别失败
   - `WORKFLOW_ERROR`: 工作流执行错误
   - `EXECUTION_ERROR`: 执行错误

2. **错误响应**：
   ```json
   {
     "type": "error",
     "timestamp": 1234567890,
     "data": {
       "code": "WORKFLOW_ERROR",
       "message": "错误描述",
       "details": "详细信息"
     }
   }
   ```

---

## API 接口设计

详见：[API 参考文档](./api/API_REFERENCE.md)

主要接口：

1. **POST /api/agent/chat** - Agent 对话接口（SSE）
2. **GET /api/knowledge/styles** - 获取风格列表
3. **GET /api/knowledge/search** - 搜索风格
4. **POST /api/knowledge/styles** - 添加风格
5. **PATCH /api/knowledge/styles/:id** - 更新风格
6. **DELETE /api/knowledge/styles/:id** - 删除风格

---

## 部署与运维

### 5.1 环境变量

```bash
# LLM 配置
LLM_PROVIDER=aliyun
DASHSCOPE_API_KEY=sk-xxxxx
ALIYUN_MODEL_NAME=qwen-turbo

# DeepSeek 配置
DEEPSEEK_API_KEY=sk-xxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Embedding 配置
EMBEDDING_PROVIDER=aliyun

# 数据库配置
LANCEDB_PATH=./data/lancedb

# RAG 配置
RAG_SEARCH_LIMIT=3
RAG_MIN_SIMILARITY=0.4

# 图像服务
IMAGE_SERVICE_PROVIDER=aliyun
```

### 5.2 启动命令

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

### 5.3 Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN pnpm install

COPY . .
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]
```

---

## 总结

### 6.1 技术亮点

1. **LangGraph 工作流编排**：清晰的状态图模式，易于扩展
2. **多模型适配**：通过接口抽象和工厂模式，支持灵活切换
3. **流式响应**：SSE 实时推送，提升用户体验
4. **向量检索**：本地 LanceDB，语义匹配提升生成质量
5. **模块化设计**：各模块职责清晰，低耦合高内聚

### 6.2 可扩展性

- **添加新节点**：实现新的 LangGraph 节点
- **接入新模型**：实现 `ILlmService` 接口
- **新增功能**：添加新的 NestJS 模块

### 6.3 性能优化

- 节点并行执行
- 结果缓存
- 连接池管理
- 异步处理

---

**文档版本**：v1.0
**最后更新**：2025-02-01
**维护者**：AiVista Backend Team
