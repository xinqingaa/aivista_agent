# 快速启动指南

## 第一步：安装依赖

```bash
cd /Users/linruiqiang/work/aivista_agent/main/server
npm install
```

如果遇到网络问题，可以使用国内镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

## 第二步：配置环境变量

1. 复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填写你的阿里云 DashScope API Key：

```bash
# 打开 .env 文件
nano .env
# 或使用你喜欢的编辑器

# 找到这一行并替换为你的实际 API Key：
DASHSCOPE_API_KEY=your_actual_api_key_here
```

**重要：** 请将 `your_actual_api_key_here` 替换为你从阿里云控制台获取的真实 API Key。

## 第三步：启动服务

```bash
npm run start:dev
```

如果一切正常，你会看到：

```
🚀 AiVista Server is running on: http://localhost:3000
📡 SSE endpoint: http://localhost:3000/api/agent/chat
```

## 第四步：测试 API

### 方法1：使用 curl（命令行）

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只赛博朋克风格的猫"}'
```

你应该能看到流式响应，包括：
- `event: connection` - 连接确认
- `event: thought_log` - 思考日志
- `event: gen_ui_component` - GenUI 组件
- `event: stream_end` - 流结束

### 方法2：使用 Apifox

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

### 方法3：使用浏览器（简单测试）

打开浏览器控制台，运行：

```javascript
fetch('http://localhost:3000/api/agent/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({ text: '生成一只猫' })
})
.then(response => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  function readStream() {
    reader.read().then(({ done, value }) => {
      if (done) {
        console.log('Stream ended');
        return;
      }
      const chunk = decoder.decode(value);
      console.log('Received:', chunk);
      readStream();
    });
  }
  readStream();
});
```

## 预期响应示例

```
event: connection
data: {"status":"connected","sessionId":"session_1234567890"}

event: thought_log
data: {"type":"thought_log","timestamp":1234567890,"data":{"node":"planner","message":"已识别意图：generate_image。主题：猫，风格：赛博朋克"}}

event: thought_log
data: {"type":"thought_log","timestamp":1234567891,"data":{"node":"executor","message":"开始执行任务：生成图片...","progress":50}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1234567892,"data":{"widgetType":"AgentMessage","props":{"state":"success","text":"已为您生成图片完成！","isThinking":false}}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1234567893,"data":{"widgetType":"SmartCanvas","props":{"imageUrl":"https://picsum.photos/seed/123/800/600","mode":"view","ratio":1.5}}}

event: stream_end
data: {"type":"stream_end","timestamp":1234567894,"data":{"sessionId":"session_1234567890","summary":"任务完成"}}
```

## 常见问题

### 1. 启动失败：找不到模块

**原因**: 依赖未安装

**解决**: 运行 `npm install`

### 2. 启动失败：DASHSCOPE_API_KEY is required

**原因**: `.env` 文件未配置或 API Key 未填写

**解决**: 
1. 确认 `.env` 文件存在
2. 确认 `DASHSCOPE_API_KEY` 已填写正确的值

### 3. API 调用失败：401 Unauthorized

**原因**: API Key 无效或过期

**解决**: 检查 API Key 是否正确，是否已激活

### 4. 端口被占用

**原因**: 3000 端口已被其他程序使用

**解决**: 
- 修改 `.env` 中的 `PORT` 为其他端口（如 3001）
- 或关闭占用 3000 端口的程序

## 下一步

服务启动成功后，你可以：
1. 测试不同的输入文本
2. 查看日志输出，了解工作流执行过程
3. 继续开发其他功能（RAG Node、Critic Node 等）

