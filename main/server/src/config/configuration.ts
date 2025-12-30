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

class EnvironmentVariables {
  @IsEnum(LlmProvider)
  @IsNotEmpty()
  LLM_PROVIDER: LlmProvider;

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

  return validatedConfig;
}

