# AiVista 后端服务

## 快速开始

### 1. 安装依赖（使用 pnpm）

**方式1：使用自动安装脚本（推荐）**

```bash
./setup.sh
```

脚本会自动：
- 检查并安装 pnpm（如果未安装）
- 安装项目依赖
- 创建 .env 文件并配置 API Key

**方式2：手动安装**

```bash
# 全局安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install

# 创建 .env 文件
cp .env.example .env
# 然后编辑 .env 文件，填写 DASHSCOPE_API_KEY=sk-80cda2f2a44b4578b637b2dad2ab7b42
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写你的 API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写你的阿里云 DashScope API Key：

```bash
DASHSCOPE_API_KEY=your_actual_api_key_here
```

### 3. 启动服务

```bash
pnpm run start:dev
```

服务将在 `http://localhost:3000` 启动。

### 4. 测试 API

#### 使用 curl 测试 SSE 端点：

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只赛博朋克风格的猫"}'
```

#### 使用 Apifox 测试：

详细步骤请参考：[docs/APIFOX_IMPORT.md](docs/APIFOX_IMPORT.md) 和 [docs/SSE_DEBUG_GUIDE.md](docs/SSE_DEBUG_GUIDE.md)

## API 文档

### Swagger UI

启动服务后，访问 Swagger UI 查看完整的 API 文档：

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs-json

### 导入到 Apifox

1. 访问 `http://localhost:3000/api-docs-json` 获取 OpenAPI JSON
2. 在 Apifox 中选择"导入" → "OpenAPI/Swagger"
3. 粘贴 JSON 或使用 URL 导入
4. 配置环境变量：`baseUrl = http://localhost:3000`

详细步骤请参考：[docs/APIFOX_IMPORT.md](docs/APIFOX_IMPORT.md)

## API 端点

### GET /api/agent

获取 API 使用说明和健康状态。

### POST /api/agent/chat

SSE 流式端点，接收用户输入，返回 Agent 处理结果。

**调试方法**：请参考 [docs/SSE_DEBUG_GUIDE.md](docs/SSE_DEBUG_GUIDE.md)

**请求体：**
```json
{
  "text": "用户输入的文本",
  "maskData": {
    "base64": "base64编码的蒙版图片（可选）",
    "imageUrl": "原图URL（可选）"
  },
  "sessionId": "会话ID（可选）"
}
```

**响应事件类型：**
- `connection`: 连接确认
- `thought_log`: 思考日志
- `gen_ui_component`: GenUI 组件
- `error`: 错误信息
- `stream_end`: 流结束

### 知识库管理 API

#### GET /api/knowledge/styles

获取所有风格列表。

**示例：**
```bash
curl http://localhost:3000/api/knowledge/styles
```

#### GET /api/knowledge/styles/:id

获取单个风格详情。

**示例：**
```bash
curl http://localhost:3000/api/knowledge/styles/style_001
```

#### GET /api/knowledge/search?query=xxx

测试检索功能。

**示例：**
```bash
curl "http://localhost:3000/api/knowledge/search?query=赛博朋克"
```

#### GET /api/knowledge/stats

获取知识库统计信息。

**示例：**
```bash
curl http://localhost:3000/api/knowledge/stats
```

## 知识库快速参考

系统启动时会自动初始化 5 条默认风格数据到向量数据库。知识库包含以下风格：

- **Cyberpunk（赛博朋克）**: 霓虹灯、高科技、低生活、未来主义城市背景
- **Watercolor（水彩）**: 柔和的 pastel 色彩、艺术流动性、纸张纹理
- **Minimalist（极简）**: 简洁线条、简单构图、留白、单色调
- **Oil Painting（油画）**: 丰富纹理、大胆笔触、古典艺术、鲜艳色彩
- **Anime（动漫）**: 日式动画、鲜艳色彩、表情丰富的人物、详细背景

**查看知识库内容**：
- 使用管理 API：`GET /api/knowledge/styles`
- 查看完整文档：[docs/WORKFLOW_GUIDE.md](docs/WORKFLOW_GUIDE.md)（包含完整数据表格）
- 知识库初始化文档：[docs/KNOWLEDGE_BASE_INIT.md](docs/KNOWLEDGE_BASE_INIT.md)

**工作流程文档**：
- 完整工作流程说明：[docs/WORKFLOW_GUIDE.md](docs/WORKFLOW_GUIDE.md)

## 项目结构

```
src/
├── main.ts                 # 应用入口
├── app.module.ts           # 根模块
├── llm/                    # LLM 服务模块
│   ├── llm.module.ts
│   ├── interfaces/
│   │   └── llm-service.interface.ts
│   └── services/
│       ├── aliyun-llm.service.ts
│       └── llm-provider-factory.service.ts
├── agent/                  # Agent 工作流模块
│   ├── agent.module.ts
│   ├── agent.controller.ts
│   ├── agent.service.ts
│   ├── nodes/
│   │   ├── planner.node.ts
│   │   └── executor.node.ts
│   └── interfaces/
│       └── agent-state.interface.ts
├── common/                 # 共享类型
│   └── types/
│       └── genui-component.interface.ts
└── config/                 # 配置
    └── configuration.ts
```

## 开发命令

- `pnpm run start:dev` - 开发模式（热重载）
- `pnpm run build` - 构建生产版本
- `pnpm run start:prod` - 运行生产版本
- `pnpm test` - 运行测试

## 注意事项

1. **API Key 配置**：确保 `.env` 文件中的 `DASHSCOPE_API_KEY` 已正确填写
2. **端口配置**：默认端口 3000，可在 `.env` 中修改 `PORT`
3. **CORS 配置**：默认允许所有来源，生产环境建议修改 `CORS_ORIGIN`

