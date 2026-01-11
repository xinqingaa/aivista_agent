# 图片生成服务设计文档 (Image Service Design)

## 1. 概述

本文档详细定义 AiVista 后端图片生成服务的架构设计，支持文生图和局部重绘功能，实现 Mock 和真实服务的无缝切换。

**核心目标：**
- 提供统一的图片生成服务接口（IImageService）
- 支持阿里云 DashScope 图片生成服务（qwen-image、qwen-image-max、qwen-image-plus、z-image-turbo、qwen-image-edit-plus）
- 支持 Mock 服务（用于测试和开发）
- 通过配置开关在 Mock 和真实服务间切换

## 2. 架构设计

### 2.1 服务接口

```typescript
export interface IImageService {
  // 文生图
  generateImage(prompt: string, options?: ImageGenerationOptions): Promise<string>;
  
  // 局部重绘
  editImage(prompt: string, options: ImageEditOptions): Promise<string>;
}
```

### 2.2 实现架构

```
Executor Node
    ↓
IImageService (接口)
    ↓
┌─────────────────┬─────────────────┐
│ AliyunImageService │ MockImageService │
│ (HTTP Request)      │ (Picsum Photos)  │
└─────────────────┴─────────────────┘
```

### 2.3 模块结构

```
src/image/
├── interfaces/
│   └── image-service.interface.ts  # 服务接口定义
├── services/
│   ├── aliyun-image.service.ts     # 阿里云服务实现
│   └── mock-image.service.ts      # Mock 服务实现
└── image.module.ts                 # 模块定义
```

## 3. 服务实现

### 3.1 AliyunImageService

**技术栈：**
- 使用 HTTP 请求调用 DashScope API
- 通过 `fetch` API 发送 POST 请求
- 支持多地域配置（中国内地、新加坡等）

**支持的模型：**
- `qwen-image`: 基础模型
- `qwen-image-max`: 0.5元/张（100张免费额度，90天内有效）
- `qwen-image-plus`: 0.2元/张（默认模型）
- `z-image-turbo`: 快速模型（prompt_extend 默认为 false）
- `qwen-image-edit-plus`: 用于局部重绘（价格需确认）

**模型特性：**
- `qwen-image`、`qwen-image-max`、`qwen-image-plus`: 默认 `prompt_extend=true`
- `z-image-turbo`: 默认 `prompt_extend=false`（性能优化）

**API 调用方式：**

使用 HTTP POST 请求调用 DashScope 多模态生成 API：

```typescript
const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'qwen-image-plus',
    input: {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: 'a cat in cyberpunk style',
            },
          ],
        },
      ],
    },
    parameters: {
      size: '1024*1024',
      n: 1,
      result_format: 'message',
      stream: false,
      watermark: false,
      prompt_extend: true,
    },
  }),
});

const data = await response.json();
const imageUrl = data.output.results[0].url;
```

**API Endpoint 配置：**
- 基础 URL：`DASHSCOPE_BASE_URL`（默认：`https://dashscope.aliyuncs.com/api/v1`）
- 图片生成端点：`DASHSCOPE_IMAGE_ENDPOINT`（默认：`/services/aigc/multimodal-generation/generation`）
- 完整端点：`${DASHSCOPE_BASE_URL}${DASHSCOPE_IMAGE_ENDPOINT}`

### 3.2 MockImageService

**功能：**
- 保持现有的 Mock 逻辑
- 基于 Prompt 的哈希值生成固定的图片 URL
- 模拟 2-3 秒延迟
- 使用 `picsum.photos` 作为图片源

## 4. 配置说明

### 4.1 环境变量

```bash
# 是否使用真实图片生成服务（默认 false，使用 Mock）
USE_REAL_IMAGE_SERVICE=false

# DashScope API 配置
# 基础 URL（支持不同地域）
# 中国内地: https://dashscope.aliyuncs.com/api/v1
# 新加坡: https://dashscope-intl.aliyuncs.com/api/v1
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# 图片生成 API endpoint
DASHSCOPE_IMAGE_ENDPOINT=/services/aigc/multimodal-generation/generation

# DashScope API Key（与 LLM 服务共用）
DASHSCOPE_API_KEY=your-api-key

# 阿里云图片生成模型（默认 qwen-image-plus）
# 可选值: qwen-image | qwen-image-max | qwen-image-plus | z-image-turbo
ALIYUN_IMAGE_MODEL=qwen-image-plus

# 图片生成尺寸（默认 1024x1024）
ALIYUN_IMAGE_SIZE=1024x1024

# 图片生成参数
ALIYUN_IMAGE_PROMPT_EXTEND=true  # z-image-turbo 使用 false
ALIYUN_IMAGE_WATERMARK=false      # 是否添加水印（默认 false）
```

### 4.2 配置优先级

1. 环境变量配置
2. 默认值（Mock 服务、qwen-image-plus、1024x1024）

## 5. 成本说明

### 5.1 模型定价（中国内地）

| 模型 | 价格 | 免费额度 | 说明 |
|------|------|---------|------|
| qwen-image | 待确认 | 待确认 | 基础模型 |
| qwen-image-max | 0.5元/张 | 100张（90天内有效） | 高质量模型 |
| qwen-image-plus | 0.2元/张 | 无 | 默认模型，性价比高 |
| z-image-turbo | 待确认 | 待确认 | 快速模型，prompt_extend=false |
| qwen-image-edit-plus | 待确认 | 待确认 | 局部重绘专用 |

### 5.2 成本控制策略

1. **默认使用 Mock**：避免测试时产生费用
2. **配置开关**：通过 `USE_REAL_IMAGE_SERVICE` 控制
3. **开发/生产分离**：开发环境使用 Mock，生产环境使用真实服务

## 6. 使用方式

### 6.1 在 Executor Node 中使用

```typescript
@Injectable()
export class ExecutorNode {
  constructor(
    @Inject('IMAGE_SERVICE') private readonly imageService: IImageService,
  ) {}

  async execute(state: AgentState) {
    // 文生图（统一入口，自动选择模型）
    const imageUrl = await this.imageService.generateImage(prompt, {
      model: 'qwen-image-plus',  // 可选：qwen-image | qwen-image-max | qwen-image-plus | z-image-turbo
      size: '1024x1024',
      n: 1,
      prompt_extend: true,        // z-image-turbo 默认为 false
      watermark: false,
    });

    // 或使用特定模型方法
    const imageUrl2 = await this.imageService.generateImageQwenImagePlus(prompt, {
      size: '1024x1024',
    });

    // 局部重绘
    const editedUrl = await this.imageService.editImage(prompt, {
      model: 'qwen-image-edit-plus',
      imageUrl: originalImageUrl,
      maskBase64: maskData,
      size: '1024x1024',
    });
  }
}
```

### 6.2 切换服务

**使用 Mock 服务（默认）：**
```bash
USE_REAL_IMAGE_SERVICE=false
```

**使用真实服务：**
```bash
USE_REAL_IMAGE_SERVICE=true
DASHSCOPE_API_KEY=your-api-key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1
DASHSCOPE_IMAGE_ENDPOINT=/services/aigc/multimodal-generation/generation
ALIYUN_IMAGE_MODEL=qwen-image-plus
ALIYUN_IMAGE_SIZE=1024x1024
ALIYUN_IMAGE_PROMPT_EXTEND=true
ALIYUN_IMAGE_WATERMARK=false
```

## 7. 错误处理

### 7.1 API 调用失败

- 记录详细错误日志
- 抛出友好的错误信息
- 不中断工作流（根据需求决定）

### 7.2 降级策略

- API 调用失败时，可选择降级到 Mock（可选实现）
- 或直接抛出错误，由上层处理

## 8. 测试策略

### 8.1 单元测试

- 测试 AliyunImageService 的 API 调用逻辑
- 测试 MockImageService 的返回结果
- 测试错误处理

### 8.2 集成测试

- 测试 Executor Node 集成图片服务
- 测试配置开关切换
- 测试文生图和局部重绘流程

### 8.3 真实服务测试

- 测试一次真实 API 调用（验证通过后切回 Mock）
- 验证返回的图片 URL 是否有效
- 验证错误处理逻辑

## 9. 后续优化

1. **缓存机制**：相同 Prompt 缓存生成的图片
2. **批量生成**：支持一次生成多张图片
3. **图片优化**：图片压缩、格式转换等
4. **成本监控**：记录 API 调用次数和费用
5. **异步处理**：图片生成改为异步任务（如需要）

## 10. 相关文档

- [工作流设计](../workflow/AGENT_WORKFLOW_DESIGN.md)
- [工作流指南](../workflow/WORKFLOW_GUIDE.md)
- [开发路线图](../development/DEVELOPMENT_ROADMAP.md)
