import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmService } from '../interfaces/llm-service.interface';
import { AliyunLlmService } from './aliyun-llm.service';

@Injectable()
export class LlmProviderFactory {
  constructor(
    private configService: ConfigService,
    private aliyunLlmService: AliyunLlmService,
  ) {}

  create(): ILlmService {
    const provider = this.configService.get<string>('LLM_PROVIDER') || 'aliyun';

    switch (provider) {
      case 'aliyun':
        return this.aliyunLlmService;
      case 'deepseek':
        // TODO: 实现 DeepSeekLlmService
        throw new Error('DeepSeek provider not implemented yet');
      case 'openai':
        // TODO: 实现 OpenAILlmService
        throw new Error('OpenAI provider not implemented yet');
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}

