# 集成 Swagger 文档并配置 Apifox 调试

## 目标

1. 集成 Swagger/OpenAPI 到 NestJS 项目
2. 为所有接口添加 Swagger 装饰器和文档注释
3. 配置 Swagger UI 访问路径
4. 提供 Apifox 批量导入指导
5. 提供 SSE 流式对话调试指导
6. 说明调试通过后的下一步工作

## 实施步骤

### 1. 安装 Swagger 依赖

在 `package.json` 中添加：

- `@nestjs/swagger` - NestJS Swagger 集成包

### 2. 配置 Swagger 模块

在 `main.ts` 中：

- 导入 `SwaggerModule` 和 `DocumentBuilder`
- 创建 Swagger 文档配置（标题、描述、版本、标签等）
- 设置 Swagger UI 路径为 `/api-docs`

### 3. 为接口添加 Swagger 装饰器

#### 3.1 `agent.controller.ts`

**GET /api/agent** - API 信息接口

- `@ApiOperation()` - 接口描述
- `@ApiResponse()` - 响应示例
- `@ApiTags('Agent')` - 接口分组

**POST /api/agent/chat** - SSE 流式对话接口

- `@ApiOperation()` - 接口描述，说明 SSE 特性
- `@ApiBody()` - 请求体示例（ChatRequestDto）
- `@ApiResponse()` - SSE 响应说明
- `@ApiTags('Agent')` - 接口分组
- 注意：SSE 接口需要特殊说明，因为 Swagger UI 无法直接测试 SSE

#### 3.2 DTO 类添加 Swagger 装饰器

**ChatRequestDto**

- `@ApiProperty()` - 字段描述和示例
- `@ApiPropertyOptional()` - 可选字段

**MaskDataDto**

- `@ApiProperty()` - 字段描述

### 4. 创建 Apifox 导入文档

创建 `docs/APIFOX_IMPORT.md`，包含：

- Swagger JSON 导出路径
- Apifox 导入步骤（截图说明）
- 环境变量配置
- 测试用例配置

### 5. 创建 SSE 调试指导文档

创建 `docs/SSE_DEBUG_GUIDE.md`，包含：

- Apifox 中测试 SSE 的方法
- curl 命令示例
- 预期响应格式
- 常见问题排查

### 6. 说明下一步开发计划

在调试通过后，下一步应该：

1. 实现 RAG 节点（知识库检索）
2. 实现 Critic 节点（结果评估）
3. 完善错误处理和重试机制
4. 添加单元测试和集成测试
5. 前端集成（Flutter 应用）

## 文件修改清单

1. `package.json` - 添加 `@nestjs/swagger` 依赖
2. `main.ts` - 配置 Swagger 模块
3. `src/agent/agent.controller.ts` - 添加 Swagger 装饰器
4. `docs/APIFOX_IMPORT.md` - Apifox 导入指导（新建）
5. `docs/SSE_DEBUG_GUIDE.md` - SSE 调试指导（新建）
6. `README.md` - 更新文档，添加 Swagger UI 访问说明

## Swagger 配置示例

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('AiVista Agent API')
  .setDescription('AiVista AI Agent 后端 API 文档')
  .setVersion('1.0')
  .addTag('Agent', 'Agent 工作流相关接口')
  .addServer('http://localhost:3000', '开发环境')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```



## 接口文档结构

```javascript
/api-docs (Swagger UI)
  └── Agent
      ├── GET /api/agent - API 信息
      └── POST /api/agent/chat - SSE 流式对话
```



## Apifox 导入流程

1. 启动服务后访问 `http://localhost:3000/api-docs-json` 获取 OpenAPI JSON
2. 在 Apifox 中选择"导入" → "OpenAPI/Swagger"
3. 粘贴 JSON 或选择文件导入
4. 配置环境变量（baseUrl: http://localhost:3000）
5. 测试接口

## SSE 调试方法

### Apifox 方法

- 使用"实时响应"功能查看流式数据
- 或使用"脚本"功能解析 SSE 事件

### curl 方法

```bash






curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只猫"}'


```