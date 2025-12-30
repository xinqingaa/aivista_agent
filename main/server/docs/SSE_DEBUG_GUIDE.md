# SSE 流式对话调试指南

## 概述

本文档提供详细的 SSE（Server-Sent Events）流式对话接口调试方法，帮助开发者快速验证接口功能。

## 接口信息

- **端点**：`POST /api/agent/chat`
- **响应类型**：`text/event-stream`
- **用途**：实时推送 Agent 工作流执行过程

## 调试方法

### 方法一：使用 curl（推荐用于快速测试）

#### 基础命令

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只赛博朋克风格的猫"}'
```

#### 参数说明

- `-N`：禁用缓冲，实时显示响应
- `-X POST`：指定 HTTP 方法为 POST
- `-H "Content-Type: application/json"`：设置请求内容类型
- `-H "Accept: text/event-stream"`：**重要**：告诉服务器返回 SSE 流
- `-d`：请求体数据（JSON 格式）

#### 带蒙版数据的请求

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "text": "将背景改为星空",
    "maskData": {
      "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "imageUrl": "https://example.com/image.jpg"
    }
  }'
```

#### 保存响应到文件

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只猫"}' \
  -o response.txt
```

### 方法二：使用 Apifox

#### 配置步骤

1. **创建请求**
   - 方法：`POST`
   - URL：`http://localhost:3000/api/agent/chat`

2. **设置请求头**
   - `Content-Type: application/json`
   - `Accept: text/event-stream`（**必须**）

3. **设置请求体**
   - 选择 **"Body"** → **"JSON"**
   - 输入 JSON：
   ```json
   {
     "text": "生成一只赛博朋克风格的猫"
   }
   ```

4. **发送请求**
   - 点击 **"发送"** 按钮
   - 在响应面板查看结果

#### 查看流式响应

- **方法 A**：使用"实时响应"功能（如果 Apifox 版本支持）
- **方法 B**：查看"响应体"，应该能看到完整的 SSE 事件流

### 方法三：使用 Postman

1. **创建请求**
   - 方法：`POST`
   - URL：`http://localhost:3000/api/agent/chat`

2. **设置请求头**
   - `Content-Type: application/json`
   - `Accept: text/event-stream`

3. **设置请求体**
   - 选择 **"Body"** → **"raw"** → **"JSON"**
   - 输入 JSON 数据

4. **发送请求**
   - 点击 **"Send"**
   - 在响应面板查看流式数据

### 方法四：使用浏览器 JavaScript（前端测试）

```javascript
// 使用 EventSource（注意：EventSource 只支持 GET，需要改用 fetch）
async function testSSE() {
  const response = await fetch('http://localhost:3000/api/agent/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      text: '生成一只猫',
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    console.log('Received:', chunk);
    
    // 解析 SSE 事件
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('event:')) {
        const eventType = line.substring(6).trim();
        console.log('Event type:', eventType);
      } else if (line.startsWith('data:')) {
        const data = line.substring(5).trim();
        try {
          const json = JSON.parse(data);
          console.log('Event data:', json);
        } catch (e) {
          console.log('Raw data:', data);
        }
      }
    }
  }
}

testSSE();
```

## 预期响应格式

### 事件类型

SSE 响应包含以下事件类型：

1. **connection** - 连接确认
2. **thought_log** - 思考日志（Agent 执行过程）
3. **gen_ui_component** - GenUI 组件（前端渲染指令）
4. **error** - 错误信息
5. **stream_end** - 流结束

### 响应示例

```
event: connection
data: {"status":"connected","sessionId":"session_1703123456789"}

event: thought_log
data: {"type":"thought_log","timestamp":1703123456789,"data":{"node":"planner","message":"已识别意图：generate_image。主题：猫，风格：赛博朋克"}}

event: thought_log
data: {"type":"thought_log","timestamp":1703123456790,"data":{"node":"executor","message":"开始执行任务：生成图片...","progress":50}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1703123458000,"data":{"widgetType":"AgentMessage","props":{"state":"success","text":"已为您生成图片完成！","isThinking":false},"timestamp":1703123458000}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1703123458001,"data":{"widgetType":"SmartCanvas","props":{"imageUrl":"https://picsum.photos/seed/123456/800/600","mode":"view","ratio":1.5},"timestamp":1703123458001}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1703123458002,"data":{"widgetType":"ActionPanel","props":{"actions":[{"id":"regenerate_btn","label":"重新生成","type":"button","buttonType":"primary"}]},"timestamp":1703123458002}}

event: thought_log
data: {"type":"thought_log","timestamp":1703123458003,"data":{"node":"executor","message":"任务执行完成：生成图片","progress":100}}

event: stream_end
data: {"type":"stream_end","timestamp":1703123458004,"data":{"sessionId":"session_1703123456789","summary":"任务完成"}}
```

### 事件数据结构

#### connection 事件

```json
{
  "status": "connected",
  "sessionId": "session_1703123456789"
}
```

#### thought_log 事件

```json
{
  "type": "thought_log",
  "timestamp": 1703123456789,
  "data": {
    "node": "planner",
    "message": "已识别意图：generate_image",
    "progress": 50
  }
}
```

#### gen_ui_component 事件

```json
{
  "type": "gen_ui_component",
  "timestamp": 1703123458000,
  "data": {
    "widgetType": "SmartCanvas",
    "props": {
      "imageUrl": "https://picsum.photos/800/600",
      "mode": "view",
      "ratio": 1.5
    },
    "timestamp": 1703123458000
  }
}
```

#### error 事件

```json
{
  "type": "error",
  "timestamp": 1703123456789,
  "data": {
    "code": "LLM_API_ERROR",
    "message": "意图解析失败，请重试",
    "node": "planner"
  }
}
```

#### stream_end 事件

```json
{
  "type": "stream_end",
  "timestamp": 1703123458004,
  "data": {
    "sessionId": "session_1703123456789",
    "summary": "任务完成"
  }
}
```

## 常见问题排查

### 1. 没有收到响应

**可能原因**：
- 服务未启动
- 端口不正确
- 请求头缺少 `Accept: text/event-stream`

**解决方案**：
```bash
# 检查服务是否运行
curl http://localhost:3000/api/agent

# 确认端口
# 检查 .env 文件中的 PORT 配置
```

### 2. 响应不是流式的

**可能原因**：
- 缺少 `Accept: text/event-stream` 请求头
- 使用了错误的 HTTP 方法（应该是 POST）

**解决方案**：
```bash
# 确保请求头正确
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"测试"}'
```

### 3. 收到错误响应

**检查错误信息**：
- 查看 `error` 事件的 `data.code` 和 `data.message`
- 检查服务器日志

**常见错误码**：
- `LLM_API_ERROR`：LLM API 调用失败
- `INTENT_UNKNOWN`：无法识别用户意图
- `WORKFLOW_ERROR`：工作流执行错误

### 4. 连接立即断开

**可能原因**：
- 客户端不支持长连接
- 网络问题
- 服务器超时

**解决方案**：
- 检查网络连接
- 查看服务器日志
- 使用支持 SSE 的客户端工具

## 性能测试

### 测试并发请求

```bash
# 使用 ab (Apache Bench) 测试
ab -n 10 -c 2 -p request.json -T application/json \
  -H "Accept: text/event-stream" \
  http://localhost:3000/api/agent/chat
```

### 测试响应时间

```bash
# 使用 time 命令测量响应时间
time curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只猫"}'
```

## 调试技巧

### 1. 启用详细日志

在服务器端查看日志：
```bash
# 启动服务时查看日志
pnpm run start:dev
```

### 2. 使用网络抓包工具

- **Chrome DevTools**：Network 标签页
- **Wireshark**：抓取网络包
- **Charles Proxy**：HTTP 代理工具

### 3. 验证 SSE 格式

SSE 事件格式必须遵循标准：
```
event: <event_type>
data: <json_data>

```

每两个换行符 `\n\n` 分隔一个事件。

## 下一步

调试通过后，可以：

1. **集成到前端**：参考前端文档，集成 SSE 客户端
2. **优化性能**：根据实际使用情况优化响应时间
3. **添加监控**：添加日志和监控，跟踪接口使用情况
4. **完善功能**：实现 RAG 节点、Critic 节点等高级功能

## 相关文档

- `APIFOX_IMPORT.md` - Apifox 导入指南
- `SSE_STREAMING_DESIGN.md` - SSE 流式通信设计文档
- `AGENT_WORKFLOW_DESIGN.md` - Agent 工作流设计文档

