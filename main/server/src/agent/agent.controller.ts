import { Controller, Get, Post, Body, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { IsString, IsOptional, ValidateNested, IsObject, IsEnum } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProperty,
  ApiPropertyOptional
} from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { AgentState } from './interfaces/agent-state.interface';
import { ConversationService } from '../conversation/conversation.service';
import { MessageService } from '../conversation/message.service';
import { GenUIComponentService } from '../conversation/genui-component.service';
import { RAGContextService } from '../conversation/rag-context.service';

/**
 * 蒙版数据 DTO
 */
class MaskDataDto {
  @ApiProperty({
    description: 'Base64 编码的蒙版图片数据',
    example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  })
  @IsString()
  base64: string;

  @ApiProperty({
    description: '原图 URL',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  imageUrl: string;
}

/**
 * 对话请求 DTO
 */
class ChatRequestDto {
  @ApiProperty({
    description: '用户输入的文本',
    example: '生成一只赛博朋克风格的猫',
    required: true,
  })
  @IsString()
  text: string;

  @ApiPropertyOptional({
    description: '会话 ID，用于多轮对话（优先使用 conversationId）',
    example: 'conv_1737451200000_a3f8k2m9',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: '会话 ID（已弃用，请使用 conversationId，保留用于向后兼容）',
    example: 'session_1234567890',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: '蒙版数据，用于局部重绘（inpainting）',
    type: MaskDataDto,
  })
  @IsOptional()
  @IsObject()
  maskData?: MaskDataDto;

  @ApiPropertyOptional({
    description: '首选图片生成模型（可选），如果不指定则使用环境变量配置的默认模型',
    enum: ['qwen-image', 'qwen-image-max', 'qwen-image-plus', 'z-image-turbo'],
    example: 'qwen-image-plus',
  })
  @IsOptional()
  @IsEnum(['qwen-image', 'qwen-image-max', 'qwen-image-plus', 'z-image-turbo'])
  preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';
}

/**
 * Agent 控制器
 * 
 * 路由前缀: /api/agent
 * 调用顺序: POST /api/agent/chat → AgentController.chat() → AgentService.executeWorkflow() → SSE 流式推送
 */
@ApiTags('Agent')
@Controller('api/agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly genuiComponentService: GenUIComponentService,
    private readonly ragContextService: RAGContextService,
  ) {}

  /**
   * GET /api/agent - API 使用说明和健康检查
   * 
   * 用于浏览器访问时显示 API 使用说明，避免 404 错误
   */
  @Get()
  @ApiOperation({ 
    summary: '获取 API 信息',
    description: '返回 API 使用说明和健康状态，用于浏览器访问时显示信息' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API 信息',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'AiVista Agent API' },
        version: { type: 'string', example: '1.0.0' },
        status: { type: 'string', example: 'running' },
      },
    },
  })
  getApiInfo() {
    return {
      service: 'AiVista Agent API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        chat: {
          method: 'POST',
          path: '/api/agent/chat',
          description: 'Agent 对话接口（SSE 流式响应）',
          request: {
            text: 'string (required) - 用户输入的文本',
            maskData: 'object (optional) - 蒙版数据，用于局部重绘',
            sessionId: 'string (optional) - 会话 ID，用于多轮对话',
          },
          response: 'Server-Sent Events (SSE) 流式响应',
          example: {
            curl: `curl -N -X POST http://localhost:3000/api/agent/chat \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '{"text":"生成一只赛博朋克风格的猫"}'`,
          },
        },
      },
      note: '请使用 POST 请求访问 /api/agent/chat 端点，浏览器直接访问会返回此说明页面',
    };
  }

  /**
   * POST /api/agent/chat - Agent 对话接口（SSE 流式响应）
   * 
   * @Post('chat') - 处理 POST 请求，完整路径为 /api/agent/chat
   * @Body() - 自动解析请求体为 ChatRequestDto 对象，并进行验证
   * @Res() - 直接访问 Express Response 对象，用于 SSE 流式响应（不使用 NestJS 默认响应处理）
   * 
   * 调用流程:
   * 1. 接收 POST 请求，解析请求体
   * 2. 设置 SSE 响应头（Content-Type: text/event-stream）
   * 3. 构建初始 AgentState
   * 4. 调用 AgentService.executeWorkflow() 执行工作流
   * 5. 通过 for await 循环接收工作流产生的事件
   * 6. 将事件以 SSE 格式推送给客户端
   * 
   * 注意：此接口返回 Server-Sent Events (SSE) 流式响应，Swagger UI 无法直接测试。
   * 请使用 Apifox、curl 或其他支持 SSE 的工具进行测试。
   */
  @Post('chat')
  @ApiOperation({ 
    summary: 'Agent 对话接口（SSE 流式响应）',
    description: `接收用户输入，执行 Agent 工作流，通过 SSE 流式推送执行过程。
    
**工作流步骤：**
1. Planner Node: 识别用户意图（generate_image/inpainting/adjust_parameters）
2. RAG Node: 检索相关风格，增强 Prompt
3. Executor Node: 执行任务（如生成图片）
4. 流式推送思考日志、增强 Prompt 信息、GenUI 组件和结果

**响应事件类型：**
- \`connection\`: 连接确认
- \`thought_log\`: 思考日志（Agent 执行过程）
- \`enhanced_prompt\`: 增强后的 Prompt 信息（包含检索到的风格和相似度）
- \`gen_ui_component\`: GenUI 组件（前端渲染指令）
- \`error\`: 错误信息
- \`stream_end\`: 流结束

**测试方法：**
- 使用 Apifox 的"实时响应"功能查看流式数据
- 或使用 curl: \`curl -N -X POST http://localhost:3000/api/agent/chat -H "Content-Type: application/json" -H "Accept: text/event-stream" -d '{"text":"生成一只猫"}'\``,
  })
  @ApiBody({ 
    type: ChatRequestDto,
    description: '对话请求体',
    examples: {
      basic: {
        summary: '基础示例',
        value: {
          text: '生成一只赛博朋克风格的猫',
        },
      },
      withMask: {
        summary: '带蒙版数据（局部重绘）',
        value: {
          text: '将背景改为星空',
          maskData: {
            base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            imageUrl: 'https://example.com/image.jpg',
          },
        },
      },
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: 'SSE 流式响应',
    headers: {
      'Content-Type': {
        description: 'text/event-stream',
        schema: { type: 'string' },
      },
      'Cache-Control': {
        description: 'no-cache',
        schema: { type: 'string' },
      },
      'Connection': {
        description: 'keep-alive',
        schema: { type: 'string' },
      },
    },
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: `event: connection
data: {"status":"connected","sessionId":"session_1234567890"}

event: thought_log
data: {"type":"thought_log","timestamp":1234567890,"data":{"node":"planner","message":"已识别意图：generate_image"}}

event: thought_log
data: {"type":"thought_log","timestamp":1234567891,"data":{"node":"rag","message":"检索到 3 条相关风格：Cyberpunk、Anime、Minimalist"}}

event: enhanced_prompt
data: {"type":"enhanced_prompt","timestamp":1234567891,"data":{"original":"生成一只赛博朋克风格的猫","retrieved":[{"style":"Cyberpunk","prompt":"neon lights, high tech...","similarity":0.48}],"final":"生成一只赛博朋克风格的猫, neon lights, high tech..."}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1234567890,"data":{"widgetType":"ImageView","props":{"imageUrl":"https://picsum.photos/800/600","width":800,"height":600,"fit":"contain"}}}

event: stream_end
data: {"type":"stream_end","timestamp":1234567890,"data":{"sessionId":"session_1234567890","summary":"任务完成"}}`,
        },
      },
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: '请求参数错误',
  })
  @ApiResponse({ 
    status: 500, 
    description: '服务器内部错误',
  })
  async chat(@Body() request: ChatRequestDto, @Res() response: Response) {
    // 记录请求参数
    this.logger.log(
      `AgentController: Received request - text: "${request.text.substring(0, 50)}${request.text.length > 50 ? '...' : ''}", preferredModel: ${request.preferredModel || 'not specified'}, hasMaskData: ${!!request.maskData}`,
    );

    // === 新增：会话管理 ===
    // 优先使用 conversationId，兼容 sessionId
    const requestedConversationId = request.conversationId || request.sessionId;
    let conversation;

    if (requestedConversationId) {
      // 尝试获取现有会话
      try {
        conversation = await this.conversationService.findById(requestedConversationId);

        // 记录迁移警告（如果使用旧的 sessionId）
        if (request.sessionId && !request.conversationId) {
          this.logger.warn(`Using deprecated sessionId: ${request.sessionId}, please migrate to conversationId`);
        }
      } catch (error) {
        this.logger.error(`Conversation not found: ${requestedConversationId}`);
        return response.status(404).json({
          error: 'Conversation not found',
          conversationId: requestedConversationId,
        });
      }
    } else {
      // 创建新会话
      conversation = await this.conversationService.create({
        title: request.text.slice(0, 50) + (request.text.length > 50 ? '...' : ''),
        status: 'active',
      });
      this.logger.log(`Created new conversation: ${conversation.id}`);
    }

    // === 新增：保存用户消息 ===
    const userMessage = await this.messageService.create({
      conversationId: conversation.id,
      role: 'user',
      content: request.text,
      metadata: {
        maskData: request.maskData,
        preferredModel: request.preferredModel,
      },
    });

    // 设置 SSE 响应头
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');

    // === 修改：使用 conversationId ===
    const sessionId = conversation.id;

    // 构建初始状态
    const initialState: AgentState = {
      userInput: {
        text: request.text,
        maskData: request.maskData,
        preferredModel: request.preferredModel,
      },
      uiComponents: [],
      thoughtLogs: [],
      sessionId,
      timestamp: Date.now(),
      metadata: {
        retryCount: 0,
        startTime: Date.now(),
        conversationId: conversation.id, // 新增：记录 conversationId
      },
    };

    // 用于存储生成的组件
    const genUIComponents = [];

    try {
      // 发送连接确认（返回 conversationId）
      response.write(`event: connection\n`);
      response.write(`data: ${JSON.stringify({
        status: 'connected',
        sessionId,
        conversationId: conversation.id, // 新增：返回 conversationId 给前端
      })}\n\n`);

      // 执行工作流并流式推送
      for await (const event of this.agentService.executeWorkflow(initialState)) {
        // 检查客户端是否断开连接
        if (response.destroyed) {
          this.logger.warn(`Client disconnected, conversationId: ${conversation.id}`);
          break;
        }

        // === 新增：根据事件类型保存数据到数据库 ===
        if (event.type === 'thought_log') {
          // 保存思考日志为 GenUI 组件
          const component = await this.genuiComponentService.create({
            conversationId: conversation.id,
            messageId: userMessage.id,
            widgetType: 'ThoughtLogItem',
            props: {
              node: event.data.node,
              message: event.data.message,
              progress: event.data.progress,
              metadata: event.data.metadata,
              timestamp: Date.now(),
            },
          });
          genUIComponents.push(component);
        }

        if (event.type === 'enhanced_prompt') {
          // 保存 RAG 检索上下文
          await this.ragContextService.create({
            conversationId: conversation.id,
            messageId: userMessage.id,
            originalPrompt: event.data.original || '',
            retrievedContext: event.data.retrieved || {},
            finalPrompt: event.data.final || '',
          });

          // 同时保存为 GenUI 组件（用于前端展示）
          const component = await this.genuiComponentService.create({
            conversationId: conversation.id,
            messageId: userMessage.id,
            widgetType: 'EnhancedPromptView',
            props: event.data,
          });
          genUIComponents.push(component);
        }

        if (event.type === 'gen_ui_component') {
          // 保存 GenUI 组件
          const component = await this.genuiComponentService.create({
            conversationId: conversation.id,
            messageId: userMessage.id,
            widgetType: event.data.widgetType,
            props: event.data.props,
            updateMode: event.data.updateMode,
            targetId: event.data.targetId,
          });
          genUIComponents.push(component);
        }

        // 推送事件到前端
        response.write(`event: ${event.type}\n`);
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // === 新增：工作流完成后保存助手响应 ===
      const lastComponent = genUIComponents[genUIComponents.length - 1];
      if (lastComponent?.widgetType === 'ImageView') {
        await this.messageService.create({
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Image generated',
          metadata: {
            imageUrl: lastComponent.props?.imageUrl,
            componentIds: genUIComponents.map(c => c.id),
          },
        });
      }

      // 更新会话时间戳
      await this.conversationService.update(conversation.id, {
        updatedAt: Date.now(),
      });

      this.logger.log(`Workflow completed, conversationId: ${conversation.id}, components: ${genUIComponents.length}`);

    } catch (error) {
      this.logger.error(`Stream error: ${error.message}`);

      if (!response.destroyed) {
        response.write(`event: error\n`);
        response.write(`data: ${JSON.stringify({
          type: 'error',
          timestamp: Date.now(),
          data: {
            code: 'WORKFLOW_ERROR',
            message: '工作流执行错误',
            details: error.message,
          },
        })}\n\n`);
      }
    } finally {
      if (!response.destroyed) {
        response.end();
      }
    }
  }
}

