# 错误处理设计文档 (Error Handling Design)

## 1. 目标

本文档详细定义 AiVista 后端的错误处理策略，确保系统在各种异常情况下能够优雅降级，提供友好的用户反馈，并支持自动恢复和重试机制。

**核心目标：**
- 完善的错误分类和处理策略
- 友好的用户错误提示
- 自动重试和降级机制
- 详细的错误日志记录

## 2. 错误分类体系

### 2.1 错误层级

```typescript
enum ErrorLevel {
  CRITICAL = 'critical',    // 系统级错误，需要立即处理
  ERROR = 'error',          // 业务逻辑错误
  WARNING = 'warning',      // 警告，不影响主流程
  INFO = 'info'             // 信息提示
}
```

### 2.2 错误类别

```typescript
enum ErrorCategory {
  // API 调用错误
  API_ERROR = 'api_error',
  
  // 输入验证错误
  VALIDATION_ERROR = 'validation_error',
  
  // 业务逻辑错误
  BUSINESS_ERROR = 'business_error',
  
  // 系统资源错误
  RESOURCE_ERROR = 'resource_error',
  
  // 网络错误
  NETWORK_ERROR = 'network_error',
  
  // 未知错误
  UNKNOWN_ERROR = 'unknown_error'
}
```

### 2.3 错误代码定义

| 错误代码 | 类别 | 级别 | 说明 | 可恢复 | 可重试 |
|---------|------|------|------|--------|--------|
| `LLM_API_ERROR` | API_ERROR | ERROR | LLM API 调用失败 | 是 | 是 |
| `LLM_RATE_LIMIT` | API_ERROR | WARNING | LLM API 速率限制 | 是 | 是 |
| `LLM_TIMEOUT` | API_ERROR | ERROR | LLM API 超时 | 是 | 是 |
| `INVALID_INPUT_EMPTY` | VALIDATION_ERROR | WARNING | 用户输入为空 | 是 | 否 |
| `INVALID_INPUT_FORMAT` | VALIDATION_ERROR | WARNING | 输入格式无效 | 是 | 否 |
| `MASK_DATA_MISSING` | BUSINESS_ERROR | WARNING | 局部重绘缺少蒙版数据 | 是 | 否 |
| `MASK_DATA_INVALID` | BUSINESS_ERROR | WARNING | 蒙版数据格式无效 | 是 | 否 |
| `INTENT_UNKNOWN` | BUSINESS_ERROR | WARNING | 无法识别用户意图 | 是 | 否 |
| `EXECUTION_FAILED` | BUSINESS_ERROR | ERROR | 任务执行失败 | 是 | 是 |
| `EXECUTION_TIMEOUT` | RESOURCE_ERROR | ERROR | 执行超时 | 是 | 是 |
| `VECTOR_DB_ERROR` | RESOURCE_ERROR | ERROR | 向量数据库错误 | 是 | 是 |
| `VECTOR_DB_TIMEOUT` | RESOURCE_ERROR | ERROR | 向量数据库超时 | 是 | 是 |
| `WORKFLOW_ERROR` | BUSINESS_ERROR | ERROR | 工作流执行错误 | 否 | 是 |
| `SSE_CONNECTION_ERROR` | NETWORK_ERROR | ERROR | SSE 连接错误 | 是 | 是 |
| `SESSION_EXPIRED` | BUSINESS_ERROR | WARNING | 会话过期 | 是 | 否 |
| `UNKNOWN_ERROR` | UNKNOWN_ERROR | CRITICAL | 未知错误 | 否 | 否 |

## 3. 错误数据结构

### 3.1 标准错误对象

```typescript
interface AppError {
  // 错误标识
  code: string;                    // 错误代码
  category: ErrorCategory;         // 错误类别
  level: ErrorLevel;               // 错误级别
  
  // 错误信息
  message: string;                 // 用户友好的错误消息
  details?: string;                // 详细错误信息（用于调试）
  stack?: string;                  // 错误堆栈（仅开发环境）
  
  // 上下文信息
  node?: string;                   // 出错的节点名称
  timestamp: number;                // 错误发生时间
  sessionId?: string;              // 会话 ID
  
  // 恢复信息
  recoverable: boolean;            // 是否可恢复
  retryable: boolean;               // 是否可重试
  retryAfter?: number;             // 重试等待时间（秒）
  maxRetries?: number;             // 最大重试次数
  
  // 元数据
  metadata?: Record<string, any>;  // 其他元数据
}
```

### 3.2 错误工厂

```typescript
class ErrorFactory {
  static createError(
    code: string,
    context?: {
      node?: string;
      sessionId?: string;
      details?: string;
      metadata?: Record<string, any>;
    }
  ): AppError {
    const errorDef = ERROR_DEFINITIONS[code];
    if (!errorDef) {
      return this.createUnknownError(context);
    }

    return {
      code,
      category: errorDef.category,
      level: errorDef.level,
      message: errorDef.message,
      details: context?.details,
      node: context?.node,
      timestamp: Date.now(),
      sessionId: context?.sessionId,
      recoverable: errorDef.recoverable,
      retryable: errorDef.retryable,
      retryAfter: errorDef.retryAfter,
      maxRetries: errorDef.maxRetries,
      metadata: context?.metadata
    };
  }

  static createUnknownError(context?: {
    details?: string;
    sessionId?: string;
  }): AppError {
    return {
      code: 'UNKNOWN_ERROR',
      category: ErrorCategory.UNKNOWN_ERROR,
      level: ErrorLevel.CRITICAL,
      message: '发生未知错误，请稍后重试',
      details: context?.details,
      timestamp: Date.now(),
      sessionId: context?.sessionId,
      recoverable: false,
      retryable: false
    };
  }
}

// 错误定义配置
const ERROR_DEFINITIONS: Record<string, {
  category: ErrorCategory;
  level: ErrorLevel;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  retryAfter?: number;
  maxRetries?: number;
}> = {
  LLM_API_ERROR: {
    category: ErrorCategory.API_ERROR,
    level: ErrorLevel.ERROR,
    message: 'AI 服务暂时不可用，请稍后重试',
    recoverable: true,
    retryable: true,
    retryAfter: 5,
    maxRetries: 3
  },
  LLM_RATE_LIMIT: {
    category: ErrorCategory.API_ERROR,
    level: ErrorLevel.WARNING,
    message: '请求过于频繁，请稍后再试',
    recoverable: true,
    retryable: true,
    retryAfter: 60,
    maxRetries: 1
  },
  LLM_TIMEOUT: {
    category: ErrorCategory.API_ERROR,
    level: ErrorLevel.ERROR,
    message: 'AI 服务响应超时，请重试',
    recoverable: true,
    retryable: true,
    retryAfter: 3,
    maxRetries: 2
  },
  INVALID_INPUT_EMPTY: {
    category: ErrorCategory.VALIDATION_ERROR,
    level: ErrorLevel.WARNING,
    message: '请输入您的需求',
    recoverable: true,
    retryable: false
  },
  MASK_DATA_MISSING: {
    category: ErrorCategory.BUSINESS_ERROR,
    level: ErrorLevel.WARNING,
    message: '请先绘制要修改的区域',
    recoverable: true,
    retryable: false
  },
  // ... 其他错误定义
};
```

## 4. 错误处理策略

### 4.1 API 调用失败处理

#### LLM API 错误

```typescript
class LlmService {
  async chat(params: ChatParams, retryCount = 0): Promise<ChatResponse> {
    try {
      // 使用 ILlmService 接口，支持多模型切换
      const response = await this.llmService.chat(params.messages, {
        temperature: params.temperature
      });
      return response;
    } catch (error) {
      // 判断错误类型
      if (error.status === 429) {
        // 速率限制
        throw ErrorFactory.createError('LLM_RATE_LIMIT', {
          details: error.message,
          metadata: { retryCount }
        });
      } else if (error.status >= 500) {
        // 服务器错误，可重试
        if (retryCount < 3) {
          await this.delay(5 * (retryCount + 1)); // 指数退避
          return this.chat(params, retryCount + 1);
        }
        throw ErrorFactory.createError('LLM_API_ERROR', {
          details: error.message,
          metadata: { retryCount }
        });
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        // 超时错误
        if (retryCount < 2) {
          await this.delay(3);
          return this.chat(params, retryCount + 1);
        }
        throw ErrorFactory.createError('LLM_TIMEOUT', {
          details: error.message,
          metadata: { retryCount }
        });
      } else {
        // 其他错误
        throw ErrorFactory.createError('LLM_API_ERROR', {
          details: error.message
        });
      }
    }
  }

  private delay(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}
```

#### 降级策略

```typescript
class PlannerNode {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // 尝试调用 LLM 服务
      const response = await this.llmService.chat(/* ... */);
      return this.parseResponse(response);
    } catch (error) {
      if (error.retryable && error.code === 'LLM_API_ERROR') {
        // 如果重试失败，使用降级策略
        return this.fallbackIntentParsing(state);
      }
      throw error;
    }
  }

  // 降级：基于关键词的简单意图识别
  private fallbackIntentParsing(state: AgentState): Partial<AgentState> {
    const text = state.userInput.text.toLowerCase();
    
    let action: string = 'unknown';
    if (text.includes('生成') || text.includes('画') || text.includes('创建')) {
      action = 'generate_image';
    } else if (text.includes('修改') || text.includes('改') || text.includes('换')) {
      action = 'inpainting';
    }

    return {
      intent: {
        action: action as any,
        confidence: 0.6, // 降低置信度
        rawResponse: '降级模式：基于关键词识别'
      }
    };
  }
}
```

### 4.2 输入验证错误处理

```typescript
class InputValidator {
  validateChatRequest(request: ChatRequest): void {
    // 验证文本输入
    if (!request.text || request.text.trim().length === 0) {
      throw ErrorFactory.createError('INVALID_INPUT_EMPTY');
    }

    if (request.text.length > 1000) {
      throw ErrorFactory.createError('INVALID_INPUT_FORMAT', {
        details: '文本长度不能超过 1000 字符'
      });
    }

    // 验证蒙版数据
    if (request.maskData) {
      this.validateMaskData(request.maskData);
    }
  }

  private validateMaskData(maskData: MaskData): void {
    // 验证 Base64 格式
    try {
      const buffer = Buffer.from(maskData.base64, 'base64');
      if (buffer.length === 0) {
        throw ErrorFactory.createError('MASK_DATA_INVALID', {
          details: '蒙版数据为空'
        });
      }

      // 验证大小（限制 10MB）
      if (buffer.length > 10 * 1024 * 1024) {
        throw ErrorFactory.createError('MASK_DATA_INVALID', {
          details: '蒙版数据过大（最大 10MB）'
        });
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw ErrorFactory.createError('MASK_DATA_INVALID', {
        details: '蒙版数据格式无效'
      });
    }

    // 验证图片 URL
    if (!maskData.imageUrl || !this.isValidUrl(maskData.imageUrl)) {
      throw ErrorFactory.createError('MASK_DATA_INVALID', {
        details: '原图 URL 无效'
      });
    }
  }
}
```

### 4.3 业务逻辑错误处理

#### 无蒙版的局部重绘指令

```typescript
class ExecutorNode {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    if (state.intent?.action === 'inpainting') {
      if (!state.userInput.maskData) {
        // 生成友好的错误提示
        throw ErrorFactory.createError('MASK_DATA_MISSING', {
          node: 'executor',
          message: '要进行局部修改，请先在图片上绘制要修改的区域'
        });
      }
    }
    // ... 执行逻辑
  }
}
```

#### 无法识别意图

```typescript
class PlannerNode {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const intent = await this.parseIntent(state);
    
    if (intent.action === 'unknown' || intent.confidence < 0.5) {
      // 生成友好的提示，而不是直接报错
      return {
        intent,
        uiComponents: [{
          widgetType: 'AgentMessage',
          props: {
            state: 'success',
            text: '我没有完全理解您的需求。您可以尝试：\n1. 生成图片："生成一只猫"\n2. 修改图片：先绘制区域，然后说"改成..."'
          }
        }]
      };
    }
    
    return { intent };
  }
}
```

### 4.4 资源错误处理

#### 向量数据库错误

```typescript
class RAGNode {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const results = await this.knowledgeService.search(/* ... */);
      return { enhancedPrompt: this.buildPrompt(results) };
    } catch (error) {
      // 向量数据库错误不影响主流程，使用原始 Prompt
      this.logger.warn('RAG retrieval failed, using original prompt', error);
      return {
        enhancedPrompt: {
          original: state.userInput.text,
          retrieved: [],
          final: state.userInput.text
        }
      };
    }
  }
}
```

#### 执行超时

```typescript
class ExecutorNode {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const timeout = 5000; // 5 秒超时
    
    try {
      const result = await Promise.race([
        this.executeTask(state),
        this.createTimeout(timeout)
      ]);
      return { executionResult: result };
    } catch (error) {
      if (error.code === 'EXECUTION_TIMEOUT') {
        throw ErrorFactory.createError('EXECUTION_TIMEOUT', {
          node: 'executor',
          details: `任务执行超过 ${timeout}ms`
        });
      }
      throw error;
    }
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(ErrorFactory.createError('EXECUTION_TIMEOUT'));
      }, ms);
    });
  }
}
```

## 5. 错误传播与处理

### 5.1 全局错误过滤器

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let appError: AppError;

    if (exception instanceof AppError) {
      appError = exception;
    } else if (exception instanceof HttpException) {
      appError = this.convertHttpException(exception);
    } else {
      appError = ErrorFactory.createUnknownError({
        details: exception instanceof Error ? exception.message : String(exception)
      });
    }

    // 记录错误日志
    this.logError(appError, request);

    // 如果是 SSE 响应，推送错误事件
    if (request.headers.accept?.includes('text/event-stream')) {
      response.write(`event: error\n`);
      response.write(`data: ${JSON.stringify({
        type: 'error',
        timestamp: Date.now(),
        data: this.sanitizeError(appError)
      })}\n\n`);
      return;
    }

    // 普通 HTTP 响应
    response.status(this.getHttpStatus(appError)).json({
      error: this.sanitizeError(appError)
    });
  }

  private sanitizeError(error: AppError): Partial<AppError> {
    // 生产环境不返回堆栈和详细信息
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      retryable: error.retryable,
      retryAfter: error.retryAfter,
      ...(isProduction ? {} : {
        details: error.details,
        stack: error.stack
      })
    };
  }

  private logError(error: AppError, request: Request): void {
    const logContext = {
      code: error.code,
      category: error.category,
      level: error.level,
      node: error.node,
      sessionId: error.sessionId,
      path: request.url,
      method: request.method
    };

    switch (error.level) {
      case ErrorLevel.CRITICAL:
        this.logger.error('Critical error', { ...logContext, error });
        break;
      case ErrorLevel.ERROR:
        this.logger.error('Error occurred', { ...logContext, error });
        break;
      case ErrorLevel.WARNING:
        this.logger.warn('Warning', { ...logContext, error });
        break;
      default:
        this.logger.log('Info', { ...logContext, error });
    }
  }
}
```

### 5.2 节点级错误处理

```typescript
class AgentWorkflow {
  async executeNode(
    nodeName: string,
    nodeFunction: (state: AgentState) => Promise<Partial<AgentState>>,
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      return await nodeFunction(state);
    } catch (error) {
      // 包装为 AppError
      const appError = error instanceof AppError
        ? error
        : ErrorFactory.createError('WORKFLOW_ERROR', {
          node: nodeName,
          details: error instanceof Error ? error.message : String(error)
        });

      // 根据错误类型决定是否继续
      if (appError.recoverable && appError.code !== 'WORKFLOW_ERROR') {
        // 可恢复的错误，返回错误状态但继续工作流
        return {
          error: appError,
          metadata: { ...state.metadata, currentNode: nodeName }
        };
      }

      // 不可恢复的错误，抛出
      throw appError;
    }
  }
}
```

## 6. 用户友好的错误消息

### 6.1 错误消息模板

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  LLM_API_ERROR: 'AI 服务暂时不可用，请稍后重试',
  LLM_RATE_LIMIT: '请求过于频繁，请稍后再试',
  LLM_TIMEOUT: 'AI 服务响应超时，请重试',
  INVALID_INPUT_EMPTY: '请输入您的需求',
  INVALID_INPUT_FORMAT: '输入格式不正确，请检查后重试',
  MASK_DATA_MISSING: '要进行局部修改，请先在图片上绘制要修改的区域',
  MASK_DATA_INVALID: '蒙版数据无效，请重新绘制',
  INTENT_UNKNOWN: '我没有完全理解您的需求，请尝试更具体的描述',
  EXECUTION_FAILED: '任务执行失败，请重试',
  EXECUTION_TIMEOUT: '任务执行超时，请重试',
  VECTOR_DB_ERROR: '风格库暂时不可用，将使用原始提示词',
  WORKFLOW_ERROR: '处理过程中出现错误，请重试',
  SSE_CONNECTION_ERROR: '连接中断，正在重连...',
  SESSION_EXPIRED: '会话已过期，请刷新页面',
  UNKNOWN_ERROR: '发生未知错误，请稍后重试或联系支持'
};
```

### 6.2 动态错误消息生成

```typescript
class ErrorMessageGenerator {
  generateMessage(error: AppError, context?: {
    userInput?: string;
    previousActions?: string[];
  }): string {
    let message = ERROR_MESSAGES[error.code] || error.message;

    // 根据上下文定制消息
    if (error.code === 'INTENT_UNKNOWN' && context?.userInput) {
      message = `我没有完全理解"${context.userInput}"。您可以尝试：\n` +
        `1. 生成图片："生成一只猫"\n` +
        `2. 修改图片：先绘制区域，然后说"改成..."`;
    }

    if (error.retryable && error.retryAfter) {
      message += `（${error.retryAfter} 秒后可重试）`;
    }

    return message;
  }
}
```

## 7. 错误监控与日志

### 7.1 错误日志记录

```typescript
class ErrorLogger {
  log(error: AppError, context?: Record<string, any>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      code: error.code,
      category: error.category,
      level: error.level,
      message: error.message,
      node: error.node,
      sessionId: error.sessionId,
      recoverable: error.recoverable,
      retryable: error.retryable,
      ...context
    };

    // 根据级别选择日志方法
    switch (error.level) {
      case ErrorLevel.CRITICAL:
        this.logger.error('Critical error', logEntry);
        // 可以发送到监控系统（如 Sentry）
        break;
      case ErrorLevel.ERROR:
        this.logger.error('Error', logEntry);
        break;
      case ErrorLevel.WARNING:
        this.logger.warn('Warning', logEntry);
        break;
      default:
        this.logger.log('Info', logEntry);
    }
  }
}
```

### 7.2 错误统计

```typescript
class ErrorStatistics {
  private errorCounts = new Map<string, number>();
  private errorTimestamps = new Map<string, number[]>();

  recordError(error: AppError): void {
    // 统计错误次数
    const count = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, count + 1);

    // 记录错误时间戳（用于分析错误趋势）
    const timestamps = this.errorTimestamps.get(error.code) || [];
    timestamps.push(Date.now());
    // 只保留最近 1000 条
    if (timestamps.length > 1000) {
      timestamps.shift();
    }
    this.errorTimestamps.set(error.code, timestamps);
  }

  getErrorRate(code: string, timeWindow: number = 3600000): number {
    const timestamps = this.errorTimestamps.get(code) || [];
    const now = Date.now();
    const recentErrors = timestamps.filter(ts => now - ts < timeWindow);
    return recentErrors.length;
  }
}
```

## 8. 测试策略

### 8.1 错误场景测试

```typescript
describe('Error Handling', () => {
  it('should handle LLM API failure with retry', async () => {
    // Mock API 失败
    jest.spyOn(llmService, 'chat')
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({ content: 'success' });

    const result = await plannerNode.execute(mockState);
    expect(result.intent).toBeDefined();
    expect(llmService.chat).toHaveBeenCalledTimes(2);
  });

  it('should handle missing mask data gracefully', async () => {
    const state = {
      ...mockState,
      intent: { action: 'inpainting' },
      userInput: { text: '改成机械头盔' } // 无 maskData
    };

    await expect(executorNode.execute(state)).rejects.toMatchObject({
      code: 'MASK_DATA_MISSING'
    });
  });
});
```

