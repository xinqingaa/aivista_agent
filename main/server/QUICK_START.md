# 🚀 快速启动（3 步）

## ✅ 已完成的工作

后端项目结构已创建完成，包括：
- ✅ NestJS 项目配置（package.json, tsconfig.json）
- ✅ LLM 服务层（支持阿里云通义千问）
- ✅ Agent 工作流（Planner + Executor）
- ✅ SSE 流式响应端点
- ✅ 环境变量配置模板

## 📋 接下来你需要做的（3 步）

### 步骤 1：运行自动安装脚本（推荐）

```bash
cd /Users/linruiqiang/work/aivista_agent/main/server
./setup.sh
```

脚本会自动：
- ✅ 检查并安装 pnpm（如果未安装）
- ✅ 安装项目依赖
- ✅ 创建 .env 文件并配置你的 API Key

**或者手动安装：**

```bash
# 全局安装 pnpm（如果未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 步骤 2：配置 API Key

**如果使用了 `./setup.sh` 脚本，API Key 已自动配置，可跳过此步骤。**

**如果手动安装，需要：**

1. **复制环境变量模板：**
```bash
cp .env.example .env
```

2. **编辑 .env 文件，填写你的阿里云 DashScope API Key：**
```bash
# 使用你喜欢的编辑器打开 .env
nano .env
# 或
code .env
# 或
vim .env
```

3. **找到这一行并替换：**
```bash
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```
替换为：
```bash
DASHSCOPE_API_KEY=sk-80cda2f2a44b4578b637b2dad2ab7b42
```

### 步骤 3：启动服务

```bash
pnpm run start:dev
```

**成功启动后，你会看到：**
```
🚀 AiVista Server is running on: http://localhost:3000
📡 SSE endpoint: http://localhost:3000/api/agent/chat
```

## 🧪 测试 API

### 使用 Apifox 测试（推荐）

1. **创建新请求**
2. **配置：**
   - 方法：`POST`
   - URL：`http://localhost:3000/api/agent/chat`
   - Headers：
     - `Content-Type: application/json`
     - `Accept: text/event-stream`
   - Body（JSON）：
     ```json
     {
       "text": "生成一只赛博朋克风格的猫"
     }
     ```
3. **发送请求**，应该能看到流式响应

### 使用 curl 测试

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只赛博朋克风格的猫"}'
```

## 📁 项目结构

```
main/server/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── app.module.ts              # 根模块
│   ├── llm/                       # LLM 服务模块
│   │   ├── llm.module.ts
│   │   ├── interfaces/
│   │   │   └── llm-service.interface.ts
│   │   └── services/
│   │       ├── aliyun-llm.service.ts
│   │       └── llm-provider-factory.service.ts
│   ├── agent/                     # Agent 工作流
│   │   ├── agent.module.ts
│   │   ├── agent.controller.ts    # SSE 端点
│   │   ├── agent.service.ts
│   │   ├── nodes/
│   │   │   ├── planner.node.ts    # 意图解析
│   │   │   └── executor.node.ts   # Mock 图片生成
│   │   └── interfaces/
│   │       └── agent-state.interface.ts
│   ├── common/                    # 共享类型
│   └── config/                    # 配置验证
├── .env.example                   # 环境变量模板
├── package.json
└── README.md
```

## ⚠️ 常见问题

### Q: npm install 失败？
**A:** 尝试使用国内镜像或检查网络连接

### Q: 启动时提示 DASHSCOPE_API_KEY is required？
**A:** 确认 `.env` 文件存在且已正确填写 API Key

### Q: API 调用返回 401？
**A:** 检查 API Key 是否正确，是否已激活

### Q: 端口 3000 被占用？
**A:** 修改 `.env` 中的 `PORT=3001` 或其他端口

## 📚 更多信息

- 详细启动指南：查看 `START.md`
- 项目文档：查看 `docs/` 目录
- API 文档：查看 `docs/SSE_STREAMING_DESIGN.md`

## 🎯 下一步开发

服务启动成功后，可以继续开发：
1. RAG Node（风格检索）
2. Critic Node（质量审查）
3. 知识库初始化
4. 错误处理完善

