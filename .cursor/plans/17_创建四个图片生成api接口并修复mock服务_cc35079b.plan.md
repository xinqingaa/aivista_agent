---
name: 方式B：保持Agent工作流，通过参数选择模型
overview: 保持Agent工作流架构，在ChatRequestDto中添加preferredModel参数，Executor Node根据用户指定或配置选择模型，修复MockImageService，并提供完整的.env配置文件
todos:
  - id: fix-mock-service
    content: 修复MockImageService：实现四个新方法（generateImageQwenImage, generateImageQwenImageMax, generateImageQwenImagePlus, generateImageZImageTurbo）
    status: completed
  - id: update-agent-state
    content: 更新AgentState接口：在userInput中添加preferredModel字段（可选）
    status: completed
  - id: update-chat-dto
    content: 更新ChatRequestDto：添加preferredModel可选参数，包含Swagger文档
    status: completed
  - id: update-controller
    content: 更新AgentController：将preferredModel传递到AgentState
    status: completed
  - id: update-executor
    content: 更新Executor Node：优先使用userInput.preferredModel，否则使用环境变量默认值
    status: completed
  - id: update-env
    content: 更新.env文件：添加完整的图片生成服务配置
    status: completed
  - id: update-env-example
    content: 更新.env.example文件：添加配置示例
    status: completed
---

# 方式B：保持Agent工作流，通过参数选择模型

## 一、目标

1. **保持Agent工作流架构完整性**，所有请求仍经过完整的Planner → RAG → Executor → Critic流程
2. **在ChatRequestDto中添加preferredModel参数**（可选），允许用户指定模型
3. **Executor Node优先使用用户指定模型**，否则使用环境变量默认值
4. **修复MockImageService**，实现四个新方法以符合接口定义
5. **提供完整的.env和.env.example配置文件**，包含所有图片生成服务配置

## 二、架构设计

### 2.1 数据流设计

```
前端请求 (ChatRequestDto + preferredModel?)
    ↓
AgentController (传递preferredModel到AgentState)
    ↓
Agent工作流 (Planner → RAG → Executor → Critic)
    ↓
Executor Node (优先使用userInput.preferredModel，否则使用环境变量)
    ↓
IImageService (调用对应的模型方法)
    ↓
返回结果 (通过SSE流式推送)
```

### 2.2 模型选择逻辑

**优先级（从高到低）：**

1. `userInput.preferredModel`（用户指定）
2. `ALIYUN_IMAGE_MODEL`（环境变量配置）
3. `'qwen-image-plus'`（代码默认值）

**代码示例：**

```typescript
// Executor Node 中
const model = state.userInput.preferredModel 
  || this.configService.get<'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo'>('ALIYUN_IMAGE_MODEL')
  || 'qwen-image-plus';
```

### 2.3 与现有架构的关系

- **保持完整Agent工作流**：所有请求仍经过Planner、RAG、Critic节点
- **保持核心价值**：意图识别、风格检索、质量审查功能全部保留
- **灵活模型选择**：用户可以通过参数指定模型，或使用默认配置
- **向后兼容**：如果不提供preferredModel，行为与之前完全一致

## 三、实施任务

### 任务1: 修复MockImageService

**文件**: `main/server/src/image/services/mock-image.service.ts`

**变更内容**:

- 实现四个新方法：`generateImageQwenImage`, `generateImageQwenImageMax`, `generateImageQwenImagePlus`, `generateImageZImageTurbo`
- 每个方法调用内部的 `generateImage` 方法（保持Mock逻辑一致）

**代码结构**:

```typescript
async generateImageQwenImage(prompt: string, options?: Omit<ImageGenerationOptions, 'model'>): Promise<string> {
  return this.generateImage(prompt, { ...options, model: 'qwen-image' });
}

async generateImageQwenImageMax(prompt: string, options?: Omit<ImageGenerationOptions, 'model'>): Promise<string> {
  return this.generateImage(prompt, { ...options, model: 'qwen-image-max' });
}

async generateImageQwenImagePlus(prompt: string, options?: Omit<ImageGenerationOptions, 'model'>): Promise<string> {
  return this.generateImage(prompt, { ...options, model: 'qwen-image-plus' });
}

async generateImageZImageTurbo(prompt: string, options?: Omit<ImageGenerationOptions, 'model'>): Promise<string> {
  return this.generateImage(prompt, { ...options, model: 'z-image-turbo' });
}
```

### 任务2: 更新AgentState接口

**文件**: `main/server/src/agent/interfaces/agent-state.interface.ts`

**变更内容**:

- 在 `userInput` 接口中添加 `preferredModel?` 字段

**代码结构**:

```typescript
export interface AgentState {
  userInput: {
    text: string;
    maskData?: {
      base64: string;
      imageUrl: string;
    };
    preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';  // 新增
  };
  // ... 其他字段
}
```

### 任务3: 更新ChatRequestDto

**文件**: `main/server/src/agent/agent.controller.ts`

**变更内容**:

- 在 `ChatRequestDto` 类中添加 `preferredModel?` 字段
- 添加 `@ApiPropertyOptional` 装饰器和验证装饰器
- 添加Swagger文档说明

**代码结构**:

```typescript
class ChatRequestDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsObject()
  maskData?: MaskDataDto;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: '首选图片生成模型（可选），如果不指定则使用环境变量配置的默认模型',
    enum: ['qwen-image', 'qwen-image-max', 'qwen-image-plus', 'z-image-turbo'],
    example: 'qwen-image-plus',
  })
  @IsOptional()
  @IsEnum(['qwen-image', 'qwen-image-max', 'qwen-image-plus', 'z-image-turbo'])
  preferredModel?: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo';  // 新增
}
```

### 任务4: 更新AgentController

**文件**: `main/server/src/agent/agent.controller.ts`

**变更内容**:

- 在 `chat` 方法中，将 `request.preferredModel` 传递到 `initialState.userInput.preferredModel`

**代码结构**:

```typescript
const initialState: AgentState = {
  userInput: {
    text: request.text,
    maskData: request.maskData,
    preferredModel: request.preferredModel,  // 新增
  },
  // ... 其他字段
};
```

### 任务5: 更新Executor Node

**文件**: `main/server/src/agent/nodes/executor.node.ts`

**变更内容**:

- 在 `generate_image` 和 `adjust_parameters` case中，优先使用 `state.userInput.preferredModel`
- 简化模型选择逻辑，使用统一的优先级规则

**代码结构**:

```typescript
case 'generate_image':
  // 模型选择优先级：userInput.preferredModel > 环境变量 > 默认值
  const model = state.userInput.preferredModel 
    || (this.configService.get<'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo'>('ALIYUN_IMAGE_MODEL') as 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo')
    || 'qwen-image-plus';

  const size = this.configService.get<string>('ALIYUN_IMAGE_SIZE') || '1024x1024';

  // 根据模型选择对应的方法
  switch (model) {
    case 'qwen-image':
      imageUrl = await this.imageService.generateImageQwenImage(prompt, { size, n: 1 });
      break;
    case 'qwen-image-max':
      imageUrl = await this.imageService.generateImageQwenImageMax(prompt, { size, n: 1 });
      break;
    case 'qwen-image-plus':
      imageUrl = await this.imageService.generateImageQwenImagePlus(prompt, { size, n: 1 });
      break;
    case 'z-image-turbo':
      imageUrl = await this.imageService.generateImageZImageTurbo(prompt, { size, n: 1 });
      break;
    default:
      // 降级到统一入口方法
      imageUrl = await this.imageService.generateImage(prompt, { model, size, n: 1 });
  }
  break;
```

### 任务6: 更新.env配置文件

**文件**: `main/server/.env`

**新增配置**（添加到文件末尾）:

```bash
# ============================================
# 图片生成服务配置
# ============================================
# 是否使用真实图片生成服务（默认 false，使用 Mock）
USE_REAL_IMAGE_SERVICE=true

# DashScope API 配置
# 基础 URL（支持不同地域）
# 中国内地: https://dashscope.aliyuncs.com/api/v1
# 新加坡: https://dashscope-intl.aliyuncs.com/api/v1
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# 图片生成 API endpoint
DASHSCOPE_IMAGE_ENDPOINT=/services/aigc/multimodal-generation/generation

# 默认图片生成模型（用于Agent工作流，当用户未指定preferredModel时使用）
# 可选值: qwen-image | qwen-image-max | qwen-image-plus | z-image-turbo
ALIYUN_IMAGE_MODEL=qwen-image-plus

# 图片生成尺寸（默认 1024x1024）
ALIYUN_IMAGE_SIZE=1024x1024

# 图片生成参数
ALIYUN_IMAGE_PROMPT_EXTEND=true  # z-image-turbo 使用 false
ALIYUN_IMAGE_WATERMARK=false
```

### 任务7: 更新.env.example配置文件

**文件**: `main/server/.env.example`

**新增配置**（添加到文件末尾，使用示例值）:

```bash
# ============================================
# 图片生成服务配置
# ============================================
# 是否使用真实图片生成服务（默认 false，使用 Mock）
USE_REAL_IMAGE_SERVICE=false

# DashScope API 配置
# 基础 URL（支持不同地域）
# 中国内地: https://dashscope.aliyuncs.com/api/v1
# 新加坡: https://dashscope-intl.aliyuncs.com/api/v1
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# 图片生成 API endpoint
DASHSCOPE_IMAGE_ENDPOINT=/services/aigc/multimodal-generation/generation

# 默认图片生成模型（用于Agent工作流，当用户未指定preferredModel时使用）
# 可选值: qwen-image | qwen-image-max | qwen-image-plus | z-image-turbo
ALIYUN_IMAGE_MODEL=qwen-image-plus

# 图片生成尺寸（默认 1024x1024）
ALIYUN_IMAGE_SIZE=1024x1024

# 图片生成参数
ALIYUN_IMAGE_PROMPT_EXTEND=true  # z-image-turbo 使用 false
ALIYUN_IMAGE_WATERMARK=false
```

## 四、技术要点

### 4.1 向后兼容性

- `preferredModel` 是可选参数，不影响现有代码
- 如果不提供 `preferredModel`，行为与之前完全一致（使用环境变量或默认值）
- Agent工作流逻辑保持不变

### 4.2 模型选择优先级

1. **用户指定** (`userInput.preferredModel`) - 最高优先级
2. **环境变量** (`ALIYUN_IMAGE_MODEL`) - 中等优先级
3. **代码默认值** (`'qwen-image-plus'`) - 最低优先级

### 4.3 扩展性

- 新增模型时，只需：

  1. 在类型定义中添加新模型
  2. 在 `IImageService` 接口中添加新方法（已完成）
  3. 在 `AliyunImageService` 和 `MockImageService` 中实现（Aliyun已完成，Mock待修复）
  4. 在 Executor Node 的 switch 语句中添加新的 case

### 4.4 架构优势

- **保持架构完整性**：所有请求仍经过完整的Agent工作流
- **保留核心价值**：意图识别、风格检索、质量审查功能全部保留
- **灵活模型选择**：用户可以通过参数指定模型，或使用默认配置
- **符合产品定位**：Agent是核心，图片生成是执行环节

## 五、实施顺序

1. 修复MockImageService（解决编译错误，优先级最高）
2. 更新AgentState接口（添加preferredModel字段）
3. 更新ChatRequestDto（添加preferredModel参数和验证）
4. 更新AgentController（传递preferredModel到AgentState）
5. 更新Executor Node（使用preferredModel选择模型）
6. 更新.env配置文件
7. 更新.env.example配置文件
8. 测试验证

## 六、注意事项

1. **保持向后兼容**：preferredModel是可选参数，不影响现有代码
2. **Mock服务一致性**：四个新方法都调用 `generateImage`，确保Mock行为一致
3. **配置说明**：在.env中添加详细注释，说明每个配置项的用途
4. **类型安全**：使用TypeScript枚举类型确保类型安全
5. **Swagger文档**：为preferredModel参数添加清晰的Swagger文档说明

## 七、测试建议

1. **不提供preferredModel**：验证使用环境变量或默认值
2. **提供preferredModel**：验证使用用户指定的模型
3. **无效的preferredModel值**：验证验证器是否正常工作
4. **Agent工作流完整性**：验证仍然经过Planner、RAG、Critic节点