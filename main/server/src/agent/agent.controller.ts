import { Controller, Get, Post, Body, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { IsString, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { AgentService } from './agent.service';
import { AgentState } from './interfaces/agent-state.interface';

class MaskDataDto {
  @IsString()
  base64: string;

  @IsString()
  imageUrl: string;
}

class ChatRequestDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsObject()
  maskData?: MaskDataDto;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

/**
 * Agent 控制器
 * 
 * 路由前缀: /api/agent
 * 调用顺序: POST /api/agent/chat → AgentController.chat() → AgentService.executeWorkflow() → SSE 流式推送
 */
@Controller('api/agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  /**
   * GET /api/agent - API 使用说明和健康检查
   * 
   * 用于浏览器访问时显示 API 使用说明，避免 404 错误
   */
  @Get()
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
   */
  @Post('chat')
  async chat(@Body() request: ChatRequestDto, @Res() response: Response) {
    // 设置 SSE 响应头
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');

    const sessionId = request.sessionId || `session_${Date.now()}`;

    // 构建初始状态
    const initialState: AgentState = {
      userInput: {
        text: request.text,
        maskData: request.maskData,
      },
      uiComponents: [],
      thoughtLogs: [],
      sessionId,
      timestamp: Date.now(),
    };

    try {
      // 发送连接确认
      response.write(`event: connection\n`);
      response.write(`data: ${JSON.stringify({ status: 'connected', sessionId })}\n\n`);

      // 执行工作流并流式推送
      for await (const event of this.agentService.executeWorkflow(initialState)) {
        // 检查客户端是否断开连接
        if (response.destroyed) {
          this.logger.log('Client disconnected');
          break;
        }

        // 推送事件
        response.write(`event: ${event.type}\n`);
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }
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

