# 快速启动指南

## 前提条件

确保已完成安装和配置，参考 [安装指南](./INSTALLATION.md)。

## 启动服务

```bash
cd /Users/linruiqiang/work/aivista_agent/main/server
pnpm run start:dev
```

如果一切正常，你会看到：

```
🚀 AiVista Server is running on: http://localhost:3000
📡 SSE endpoint: http://localhost:3000/api/agent/chat
```

## 测试 API

### 方法 1：使用 curl（命令行）

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只赛博朋克风格的猫"}'
```

你应该能看到流式响应，包括：
- `event: connection` - 连接确认
- `event: thought_log` - 思考日志
- `event: enhanced_prompt` - 增强后的 Prompt 信息
- `event: gen_ui_component` - GenUI 组件
- `event: stream_end` - 流结束

### 方法 2：使用 Apifox

1. 打开 Apifox
2. 创建新请求
3. 配置如下：
   - **方法**: POST
   - **URL**: `http://localhost:3000/api/agent/chat`
   - **Headers**:
     - `Content-Type: application/json`
     - `Accept: text/event-stream`
   - **Body** (选择 JSON):
     ```json
     {
       "text": "生成一只赛博朋克风格的猫"
     }
     ```
4. 点击发送
5. 在响应区域应该能看到 SSE 流式数据

详细步骤请参考：[Apifox 导入指南](../api/APIFOX_IMPORT.md) 和 [SSE 调试指南](../api/SSE_DEBUG_GUIDE.md)

### 方法 3：使用 Swagger UI

启动服务后，访问 Swagger UI 查看完整的 API 文档：

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs-json

## 预期响应示例

```
event: connection
data: {"status":"connected","sessionId":"session_1234567890"}

event: thought_log
data: {"type":"thought_log","timestamp":1234567890,"data":{"node":"planner","message":"已识别意图：generate_image。主题：猫，风格：赛博朋克"}}

event: thought_log
data: {"type":"thought_log","timestamp":1234567891,"data":{"node":"rag","message":"检索到 3 条相关风格：Cyberpunk、Anime、Minimalist"}}

event: enhanced_prompt
data: {"type":"enhanced_prompt","timestamp":1234567891,"data":{"original":"生成一只赛博朋克风格的猫","retrieved":[...],"final":"..."}}

event: thought_log
data: {"type":"thought_log","timestamp":1234567892,"data":{"node":"executor","message":"开始执行任务：生成图片...","progress":50}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1234567893,"data":{"widgetType":"AgentMessage","props":{"state":"success","text":"已为您生成图片完成！","isThinking":false}}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1234567893,"data":{"widgetType":"ImageView","props":{"imageUrl":"https://picsum.photos/seed/123/800/600","width":800,"height":600,"fit":"contain"}}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1234567893,"data":{"widgetType":"ActionPanel","props":{"actions":[{"id":"regenerate_btn","label":"重新生成","type":"button","buttonType":"primary"}]}}}

event: thought_log
data: {"type":"thought_log","timestamp":1234567894,"data":{"node":"executor","message":"任务执行完成：生成图片"}}

event: stream_end
data: {"type":"stream_end","timestamp":1234567895,"data":{"sessionId":"session_1234567890","summary":"任务完成"}}
```

## 知识库管理 API

### 查看所有风格

```bash
curl http://localhost:3000/api/knowledge/styles
```

### 查看单个风格

```bash
curl http://localhost:3000/api/knowledge/styles/style_001
```

### 测试检索功能

```bash
curl "http://localhost:3000/api/knowledge/search?query=赛博朋克"
```

### 查看统计信息

```bash
curl http://localhost:3000/api/knowledge/stats
```

## 常见问题

### 1. 启动失败：找不到模块

**原因**: 依赖未安装

**解决**: 运行 `pnpm install`，参考 [安装指南](./INSTALLATION.md)

### 2. 启动失败：DASHSCOPE_API_KEY is required

**原因**: `.env` 文件未配置或 API Key 未填写

**解决**: 
1. 确认 `.env` 文件存在
2. 确认 `DASHSCOPE_API_KEY` 已填写正确的值
3. 参考 [安装指南](./INSTALLATION.md) 进行配置

### 3. API 调用失败：401 Unauthorized

**原因**: API Key 无效或过期

**解决**: 检查 API Key 是否正确，是否已激活

### 4. 端口被占用

**原因**: 3000 端口已被其他程序使用

**解决**: 
- 修改 `.env` 中的 `PORT` 为其他端口（如 3001）
- 或关闭占用 3000 端口的程序

### 5. SSE 响应无法显示

**原因**: 工具不支持 SSE 流式响应

**解决**: 
- 使用 Apifox 的"实时响应"功能
- 或使用 curl 命令测试
- 参考 [SSE 调试指南](../api/SSE_DEBUG_GUIDE.md)

## 下一步

服务启动成功后，你可以：
1. 测试不同的输入文本
2. 查看日志输出，了解工作流执行过程
3. 查看 [工作流指南](../workflow/WORKFLOW_GUIDE.md) 了解系统工作原理
4. 继续开发其他功能（参考 [开发路线图](../development/DEVELOPMENT_ROADMAP.md)）
