import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum LlmProvider {
  ALIYUN = 'aliyun',
  DEEPSEEK = 'deepseek',
  OPENAI = 'openai',
}

enum EmbeddingProvider {
  ALIYUN = 'aliyun',
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
}

class EnvironmentVariables {
  @IsEnum(LlmProvider)
  @IsNotEmpty()
  LLM_PROVIDER: LlmProvider;

  // Embedding 服务配置（可选，默认使用 LLM_PROVIDER 的值）
  @IsString()
  @IsOptional()
  EMBEDDING_PROVIDER?: string;

  // 阿里云配置
  @IsString()
  @IsOptional()
  DASHSCOPE_API_KEY?: string;

  @IsString()
  @IsOptional()
  ALIYUN_MODEL_NAME?: string;

  @IsNumber()
  @IsOptional()
  ALIYUN_TEMPERATURE?: number;

  @IsString()
  @IsOptional()
  ALIYUN_EMBEDDING_MODEL?: string;

  // DeepSeek 配置
  @IsString()
  @IsOptional()
  DEEPSEEK_API_KEY?: string;

  @IsString()
  @IsOptional()
  DEEPSEEK_BASE_URL?: string;

  @IsString()
  @IsOptional()
  DEEPSEEK_MODEL_NAME?: string;

  // OpenAI 配置（用于 Embedding 或 LLM）
  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  OPENAI_BASE_URL?: string;

  @IsString()
  @IsOptional()
  EMBEDDING_MODEL?: string;

  // 服务配置
  @IsNumber()
  @IsOptional()
  PORT?: number;

  @IsString()
  @IsOptional()
  NODE_ENV?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  // RAG 检索配置
  @IsNumber()
  @IsOptional()
  RAG_MIN_SIMILARITY?: number;

  @IsNumber()
  @IsOptional()
  RAG_SEARCH_LIMIT?: number;

  // Critic 节点配置
  @IsNumber()
  @IsOptional()
  CRITIC_TIMEOUT?: number;

  @IsNumber()
  @IsOptional()
  CRITIC_PASS_THRESHOLD?: number;

  @IsNumber()
  @IsOptional()
  MAX_RETRY_COUNT?: number;

  @IsOptional()
  CRITIC_USE_LLM?: boolean;

  // 图片生成服务配置
  @IsOptional()
  USE_REAL_IMAGE_SERVICE?: boolean;

  // DashScope API 配置
  @IsString()
  @IsOptional()
  DASHSCOPE_BASE_URL?: string;

  @IsString()
  @IsOptional()
  DASHSCOPE_IMAGE_ENDPOINT?: string;

  // 图片生成模型和参数
  @IsString()
  @IsOptional()
  ALIYUN_IMAGE_MODEL?: string;

  @IsString()
  @IsOptional()
  ALIYUN_IMAGE_SIZE?: string;

  @IsString()
  @IsOptional()
  ALIYUN_IMAGE_PROMPT_EXTEND?: string;

  @IsString()
  @IsOptional()
  ALIYUN_IMAGE_WATERMARK?: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  // 验证 LLM Provider 对应的 API Key
  if (validatedConfig.LLM_PROVIDER === LlmProvider.ALIYUN) {
    if (!validatedConfig.DASHSCOPE_API_KEY) {
      throw new Error('DASHSCOPE_API_KEY is required when LLM_PROVIDER=aliyun');
    }
  } else if (validatedConfig.LLM_PROVIDER === LlmProvider.DEEPSEEK) {
    if (!validatedConfig.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek');
    }
  }

  // 验证 Embedding Provider 对应的 API Key
  const embeddingProvider = validatedConfig.EMBEDDING_PROVIDER || validatedConfig.LLM_PROVIDER;
  if (embeddingProvider === 'aliyun') {
    if (!validatedConfig.DASHSCOPE_API_KEY) {
      throw new Error('DASHSCOPE_API_KEY is required when EMBEDDING_PROVIDER=aliyun (or LLM_PROVIDER=aliyun)');
    }
  } else if (embeddingProvider === 'openai' || embeddingProvider === 'deepseek') {
    if (!validatedConfig.OPENAI_API_KEY && !validatedConfig.DEEPSEEK_API_KEY) {
      throw new Error('OPENAI_API_KEY or DEEPSEEK_API_KEY is required when EMBEDDING_PROVIDER=openai/deepseek');
    }
  }

  return validatedConfig;
}

