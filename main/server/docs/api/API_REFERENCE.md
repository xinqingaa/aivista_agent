# API 接口参考文档 (API Reference)

本文档详细说明 AiVista 后端提供的所有 REST API 接口。

## 基础信息

- **Base URL**: `http://localhost:3000`
- **API 版本**: `1.0.0`
- **文档格式**: OpenAPI 3.0 (Swagger)
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs-json`

## 目录

- [Agent API](#agent-api)
  - [GET /api/agent](#get-apigent)
  - [POST /api/agent/chat](#post-apigentchat)
- [Knowledge API](#knowledge-api)
  - [GET /api/knowledge/styles](#get-apiknowledgestyles)
  - [GET /api/knowledge/styles/:id](#get-apiknowledgestylesid)
  - [GET /api/knowledge/search](#get-apiknowledgesearch)
  - [GET /api/knowledge/stats](#get-apiknowledgestats)
  - [POST /api/knowledge/styles](#post-apiknowledgestyles)
  - [PATCH /api/knowledge/styles/:id](#patch-apiknowledgestylesid)
  - [DELETE /api/knowledge/styles/:id](#delete-apiknowledgestylesid)
  - [POST /api/knowledge/styles/batch-delete](#post-apiknowledgestylesbatch-delete)

---

## Agent API

### GET /api/agent

获取 API 使用说明和健康检查信息。

**请求**

```http
GET /api/agent HTTP/1.1
Host: localhost:3000
```

**响应**

```json
{
  "service": "AiVista Agent API",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "chat": {
      "method": "POST",
      "path": "/api/agent/chat",
      "description": "Agent 对话接口（SSE 流式响应）",
      "request": {
        "text": "string (required) - 用户输入的文本",
        "maskData": "object (optional) - 蒙版数据，用于局部重绘",
        "sessionId": "string (optional) - 会话 ID，用于多轮对话"
      },
      "response": "Server-Sent Events (SSE) 流式响应",
      "example": {
        "curl": "curl -N -X POST http://localhost:3000/api/agent/chat \\\n  -H \"Content-Type: application/json\" \\\n  -H \"Accept: text/event-stream\" \\\n  -d '{\"text\":\"生成一只赛博朋克风格的猫\"}'"
      }
    }
  },
  "note": "请使用 POST 请求访问 /api/agent/chat 端点，浏览器直接访问会返回此说明页面"
}
```

**状态码**

- `200 OK`: 成功返回 API 信息

**示例**

```bash
curl http://localhost:3000/api/agent
```

---

### POST /api/agent/chat

Agent 对话接口，通过 Server-Sent Events (SSE) 流式返回执行过程。

**工作流步骤：**

1. **Planner Node**: 识别用户意图（generate_image/inpainting/adjust_parameters）
2. **RAG Node**: 检索相关风格，增强 Prompt
3. **Executor Node**: 执行任务（如生成图片）
4. **Critic Node**: 质量审查（可选）
5. 流式推送思考日志、增强 Prompt 信息、GenUI 组件和结果

**请求**

```http
POST /api/agent/chat HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Accept: text/event-stream
```

**请求体**

```typescript
{
  text: string;                    // 必需：用户输入的文本
  maskData?: {                     // 可选：蒙版数据，用于局部重绘
    base64: string;                // Base64 编码的蒙版图片数据
    imageUrl: string;              // 原图 URL
  };
  sessionId?: string;              // 可选：会话 ID，用于多轮对话
  preferredModel?: string;         // 可选：首选图片生成模型
                                    // 可选值: 'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo'
}
```

**请求示例**

基础示例（文生图）：

```json
{
  "text": "生成一只赛博朋克风格的猫"
}
```

带蒙版数据（局部重绘）：

```json
{
  "text": "将背景改为星空",
  "maskData": {
    "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "imageUrl": "https://example.com/image.jpg"
  }
}
```

指定模型：

```json
{
  "text": "生成一只猫",
  "preferredModel": "qwen-image-max"
}
```

**响应**

响应类型：`text/event-stream`

**响应头**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**响应事件类型**

1. **connection** - 连接确认
2. **thought_log** - 思考日志（Agent 执行过程）
3. **enhanced_prompt** - 增强后的 Prompt 信息（包含检索到的风格和相似度）
4. **gen_ui_component** - GenUI 组件（前端渲染指令）
5. **error** - 错误信息
6. **stream_end** - 流结束

**响应示例**

```
event: connection
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
data: {"type":"stream_end","timestamp":1234567890,"data":{"sessionId":"session_1234567890","summary":"任务完成"}}
```

**事件数据结构**

**connection 事件**

```json
{
  "type": "connection",
  "timestamp": 1234567890,
  "data": {
    "status": "connected",
    "sessionId": "session_1234567890"
  }
}
```

**thought_log 事件**

```json
{
  "type": "thought_log",
  "timestamp": 1234567890,
  "data": {
    "node": "planner" | "rag" | "executor" | "critic",
    "message": "已识别意图：generate_image"
  }
}
```

**enhanced_prompt 事件**

```json
{
  "type": "enhanced_prompt",
  "timestamp": 1234567891,
  "data": {
    "original": "生成一只赛博朋克风格的猫",
    "retrieved": [
      {
        "style": "Cyberpunk",
        "prompt": "neon lights, high tech, low life...",
        "similarity": 0.48
      }
    ],
    "final": "生成一只赛博朋克风格的猫, neon lights, high tech..."
  }
}
```

**gen_ui_component 事件**

```json
{
  "type": "gen_ui_component",
  "timestamp": 1234567890,
  "data": {
    "widgetType": "ImageView" | "AgentMessage" | "ActionPanel" | "SmartCanvas",
    "props": {
      // 根据 widgetType 不同而变化
    }
  }
}
```

**error 事件**

```json
{
  "type": "error",
  "timestamp": 1234567890,
  "data": {
    "code": "WORKFLOW_ERROR",
    "message": "工作流执行错误",
    "details": "具体错误信息"
  }
}
```

**stream_end 事件**

```json
{
  "type": "stream_end",
  "timestamp": 1234567890,
  "data": {
    "sessionId": "session_1234567890",
    "summary": "任务完成"
  }
}
```

**状态码**

- `200 OK`: 成功建立 SSE 连接并开始流式推送
- `400 Bad Request`: 请求参数错误（如缺少 text 字段）
- `500 Internal Server Error`: 服务器内部错误

**错误处理**

如果发生错误，会推送 `error` 事件，然后关闭连接。错误信息包含：

- `code`: 错误代码
- `message`: 错误消息
- `details`: 详细错误信息（可选）

**测试方法**

使用 curl：

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只赛博朋克风格的猫"}'
```

使用 JavaScript (Fetch API)：

```javascript
const response = await fetch('http://localhost:3000/api/agent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  },
  body: JSON.stringify({
    text: '生成一只赛博朋克风格的猫',
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // 解析 SSE 事件
  console.log(chunk);
}
```

**注意事项**

1. 此接口返回 SSE 流式响应，Swagger UI 无法直接测试
2. 建议使用 Apifox、curl 或其他支持 SSE 的工具进行测试
3. 客户端需要正确处理 SSE 事件流
4. 连接断开时会自动清理资源

---

## Knowledge API

### GET /api/knowledge/styles

获取知识库中所有风格数据的列表。

**请求**

```http
GET /api/knowledge/styles HTTP/1.1
Host: localhost:3000
```

**响应**

```json
[
  {
    "id": "style_001",
    "style": "Cyberpunk",
    "prompt": "neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic",
    "description": "赛博朋克风格：霓虹灯、高科技、低生活、黑暗城市背景",
    "tags": ["cyberpunk", "futuristic", "neon"],
    "metadata": {
      "category": "digital",
      "popularity": 85
    }
  },
  {
    "id": "style_002",
    "style": "Watercolor",
    "prompt": "soft pastel colors, artistic fluidity, paper texture, watercolor painting",
    "description": "水彩画风格：柔和的粉彩色调、艺术流动性、纸张纹理",
    "tags": ["watercolor", "artistic", "pastel"],
    "metadata": {
      "category": "artistic",
      "popularity": 70
    }
  }
]
```

**状态码**

- `200 OK`: 成功返回风格列表

**示例**

```bash
curl http://localhost:3000/api/knowledge/styles
```

---

### GET /api/knowledge/styles/:id

根据 ID 获取单个风格的详细信息。

**请求**

```http
GET /api/knowledge/styles/style_001 HTTP/1.1
Host: localhost:3000
```

**路径参数**

- `id` (string, required): 风格 ID，例如 `style_001`

**响应**

```json
{
  "id": "style_001",
  "style": "Cyberpunk",
  "prompt": "neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic",
  "description": "赛博朋克风格：霓虹灯、高科技、低生活、黑暗城市背景",
  "tags": ["cyberpunk", "futuristic", "neon"],
  "metadata": {
    "category": "digital",
    "popularity": 85
  }
}
```

**状态码**

- `200 OK`: 成功返回风格详情
- `404 Not Found`: 风格不存在

**示例**

```bash
curl http://localhost:3000/api/knowledge/styles/style_001
```

---

### GET /api/knowledge/search

根据查询文本检索相关风格，用于调试和测试。

**请求**

```http
GET /api/knowledge/search?query=赛博朋克&limit=3&minSimilarity=0.4 HTTP/1.1
Host: localhost:3000
```

**查询参数**

- `query` (string, required): 查询文本，例如 `赛博朋克`
- `limit` (number, optional): 返回数量限制，默认使用环境变量 `RAG_SEARCH_LIMIT`（默认 3）
- `minSimilarity` (number, optional): 最小相似度阈值，默认使用环境变量 `RAG_MIN_SIMILARITY`（默认 0.4）

**响应**

```json
[
  {
    "style": "Cyberpunk",
    "prompt": "neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic",
    "similarity": 0.85,
    "metadata": {
      "category": "digital",
      "popularity": 85
    }
  },
  {
    "style": "Futuristic",
    "prompt": "futuristic design, advanced technology, sci-fi elements",
    "similarity": 0.72,
    "metadata": {
      "category": "digital",
      "popularity": 60
    }
  }
]
```

**状态码**

- `200 OK`: 成功返回检索结果

**示例**

```bash
curl "http://localhost:3000/api/knowledge/search?query=赛博朋克&limit=3&minSimilarity=0.4"
```

---

### GET /api/knowledge/stats

获取知识库的统计信息，包括总数、维度、路径等。

**请求**

```http
GET /api/knowledge/stats HTTP/1.1
Host: localhost:3000
```

**响应**

```json
{
  "count": 5,
  "dimension": 1536,
  "dbPath": "./data/lancedb",
  "tableName": "styles",
  "initialized": true,
  "dbExists": true,
  "tableInitialized": true
}
```

**响应字段说明**

- `count`: 风格总数
- `dimension`: 向量维度（通常为 1536，取决于 Embedding 模型）
- `dbPath`: 数据库文件路径
- `tableName`: 表名（固定为 `styles`）
- `initialized`: 是否已初始化（数据库文件存在且表有数据）
- `dbExists`: 数据库文件是否存在
- `tableInitialized`: 表是否已初始化（有数据）

**状态码**

- `200 OK`: 成功返回统计信息

**示例**

```bash
curl http://localhost:3000/api/knowledge/stats
```

---

### POST /api/knowledge/styles

向知识库添加新的风格数据（需要生成向量嵌入）。

**请求**

```http
POST /api/knowledge/styles HTTP/1.1
Host: localhost:3000
Content-Type: application/json
```

**请求体**

```json
{
  "id": "style_006",
  "style": "Impressionist",
  "prompt": "impressionist painting, soft brushstrokes, light and color, artistic style",
  "description": "印象派风格：柔和的笔触、光影和色彩",
  "tags": ["impressionist", "artistic", "painting"],
  "metadata": {
    "category": "artistic",
    "popularity": 75
  }
}
```

**请求字段说明**

- `id` (string, required): 风格 ID，必须唯一
- `style` (string, required): 风格名称
- `prompt` (string, required): 风格提示词
- `description` (string, optional): 风格描述
- `tags` (string[], optional): 标签列表
- `metadata` (object, optional): 元数据

**响应**

```json
{
  "message": "Style added successfully",
  "id": "style_006"
}
```

**状态码**

- `201 Created`: 风格添加成功
- `400 Bad Request`: 请求参数错误（如缺少必需字段）

**示例**

```bash
curl -X POST http://localhost:3000/api/knowledge/styles \
  -H "Content-Type: application/json" \
  -d '{
    "id": "style_006",
    "style": "Impressionist",
    "prompt": "impressionist painting, soft brushstrokes, light and color, artistic style",
    "description": "印象派风格：柔和的笔触、光影和色彩",
    "tags": ["impressionist", "artistic", "painting"],
    "metadata": {
      "category": "artistic",
      "popularity": 75
    }
  }'
```

**注意事项**

1. 添加新风格时，系统会自动生成向量嵌入
2. 向量嵌入使用当前配置的 Embedding 服务（由 `EMBEDDING_PROVIDER` 或 `LLM_PROVIDER` 决定）
3. 如果风格 ID 已存在，可能会覆盖现有数据（取决于实现）

---

### PATCH /api/knowledge/styles/:id

部分更新指定风格。只更新提供的字段，未提供的字段保持不变。

**注意**：
- ✅ 本接口用于部分更新（推荐使用）
- ✅ 所有字段都是可选的，只更新提供的字段
- ✅ 未提供的字段保持不变
- ✅ 对于系统内置风格，只能更新 `description`、`tags`、`metadata` 字段

**请求**

```http
PATCH /api/knowledge/styles/style_006 HTTP/1.1
Host: localhost:3000
Content-Type: application/json
```

**路径参数**

- `id` (string, required): 风格 ID，例如 `style_006`

**请求体**

```json
{
  "style": "Cyberpunk",
  "prompt": "neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic",
  "description": "赛博朋克风格：霓虹灯、高科技、低生活、未来主义城市背景",
  "tags": ["cyberpunk", "futuristic", "neon"],
  "metadata": {
    "category": "digital",
    "popularity": 85
  }
}
```

或者只更新部分字段：

```json
{
  "description": "更新后的描述"
}
```

**请求字段说明**

所有字段都是可选的，只更新提供的字段：

- `style` (string, optional): 风格名称
- `prompt` (string, optional): 风格提示词
- `description` (string, optional): 风格描述
- `tags` (string[], optional): 标签列表
- `metadata` (object, optional): 元数据

**响应**

- `204 No Content`: 更新成功
- `404 Not Found`: 风格不存在
- `403 Forbidden`: 不能修改系统内置风格的核心字段

**示例**

更新单个字段：

```bash
curl -X PATCH http://localhost:3000/api/knowledge/styles/style_006 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新后的描述"
  }'
```

更新多个字段：

```bash
curl -X PATCH http://localhost:3000/api/knowledge/styles/style_006 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新后的描述",
    "tags": ["cyberpunk", "futuristic"],
    "metadata": {
      "category": "digital",
      "popularity": 90
    }
  }'
```

**注意事项**

1. 未提供的字段不会修改
2. 对于系统内置风格，只能更新 `description`、`tags`、`metadata` 字段
3. 核心文本字段（style、prompt、description）变化时，会自动重新生成向量嵌入

---

### DELETE /api/knowledge/styles/:id

删除单个风格。

**请求**

```http
DELETE /api/knowledge/styles/style_006 HTTP/1.1
Host: localhost:3000
```

**路径参数**

- `id` (string, required): 风格 ID，例如 `style_006`

**响应**

- `204 No Content`: 删除成功
- `404 Not Found`: 风格不存在
- `403 Forbidden`: 不能删除系统内置风格

**示例**

```bash
curl -X DELETE http://localhost:3000/api/knowledge/styles/style_006
```

**注意事项**

1. 系统内置风格（style_001 ~ style_005）不能删除
2. 删除操作不可逆，请谨慎操作

---

### POST /api/knowledge/styles/batch-delete

批量删除多个风格。

**请求**

```http
POST /api/knowledge/styles/batch-delete HTTP/1.1
Host: localhost:3000
Content-Type: application/json
```

**请求体**

```json
{
  "ids": ["style_006", "style_007", "style_008"]
}
```

**请求字段说明**

- `ids` (string[], required): 要删除的风格 ID 列表

**响应**

```json
{
  "deleted": 2,
  "failed": ["style_001"]
}
```

**响应字段说明**

- `deleted` (number): 成功删除的数量
- `failed` (string[]): 删除失败的 ID 列表

**示例**

```bash
curl -X POST http://localhost:3000/api/knowledge/styles/batch-delete \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["style_006", "style_007", "style_008"]
  }'
```

**注意事项**

1. 如果某个风格不存在或无权删除（系统内置风格），该 ID 会在 `failed` 列表中返回
2. 部分失败不会影响其他风格的删除操作

---

## 错误处理

所有 API 接口在发生错误时都会返回标准的错误响应：

```json
{
  "statusCode": 400,
  "message": "错误消息",
  "error": "Bad Request"
}
```

**常见错误码**

- `400 Bad Request`: 请求参数错误
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

---

## 相关文档

- [Apifox 导入指南](./APIFOX_IMPORT.md) - 如何将 API 导入到 Apifox
- [SSE 调试指南](./SSE_DEBUG_GUIDE.md) - SSE 流式响应的调试方法
- [工作流设计](../workflow/AGENT_WORKFLOW_DESIGN.md) - Agent 工作流详细设计
- [数据模型设计](../design/DATA_MODELS_DESIGN.md) - 数据结构定义
