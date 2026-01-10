# 安装指南

## 快速安装（推荐）

使用自动安装脚本，一键完成所有配置：

```bash
cd /Users/linruiqiang/work/aivista_agent/main/server
./setup.sh
```

脚本会自动：
1. ✅ 检查并安装 pnpm（如果未安装）
2. ✅ 安装所有项目依赖
3. ✅ 创建 .env 文件
4. ✅ 自动配置 API Key

## 手动安装

### 1. 安装 pnpm

如果未安装 pnpm，使用以下命令：

```bash
npm install -g pnpm
```

### 2. 安装项目依赖

```bash
cd /Users/linruiqiang/work/aivista_agent/main/server
pnpm install
```

如果遇到网络问题，可以使用国内镜像：

```bash
pnpm install --registry=https://registry.npmmirror.com
```

### 3. 配置环境变量

#### 方法 1：复制模板文件

```bash
cp .env.example .env
```

#### 方法 2：手动创建

创建 `.env` 文件，内容如下：

```bash
# ============================================
# LLM 服务配置
# ============================================
LLM_PROVIDER=aliyun

# 阿里云配置（必填）
DASHSCOPE_API_KEY=your_dashscope_api_key_here
ALIYUN_MODEL_NAME=qwen-turbo
ALIYUN_TEMPERATURE=0.3

# ============================================
# Embedding 服务配置
# ============================================
# Embedding 提供商（可选，默认使用 LLM_PROVIDER）
EMBEDDING_PROVIDER=aliyun

# 阿里云 Embedding 模型
ALIYUN_EMBEDDING_MODEL=text-embedding-v1

# OpenAI Embedding 模型（如果使用 OpenAI）
# EMBEDDING_MODEL=text-embedding-ada-002
# OPENAI_API_KEY=your_openai_api_key
# OPENAI_BASE_URL=https://api.openai.com/v1

# ============================================
# 服务配置
# ============================================
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
LOG_LEVEL=info

# ============================================
# 向量数据库配置
# ============================================
VECTOR_DB_PATH=./data/lancedb
VECTOR_DIMENSION=1536

# ============================================
# RAG 检索配置
# ============================================
# RAG 最小相似度阈值（默认: 0.4）
RAG_MIN_SIMILARITY=0.4

# RAG 检索数量限制（默认: 3）
RAG_SEARCH_LIMIT=3

# ============================================
# 性能配置
# ============================================
WORKFLOW_TIMEOUT=60
PLANNER_TIMEOUT=10
RAG_TIMEOUT=5
EXECUTOR_TIMEOUT=5
CRITIC_TIMEOUT=8
MAX_CONCURRENT_SESSIONS=50
MAX_QUEUE_SIZE=100
CACHE_TTL=3600

# ============================================
# 安全配置
# ============================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
SESSION_TIMEOUT_MINUTES=30
```

**重要**: 请将 `your_dashscope_api_key_here` 替换为你从阿里云控制台获取的真实 API Key。

### 4. 验证配置

创建完成后，可以验证文件是否存在：

```bash
ls -la .env
cat .env | grep DASHSCOPE_API_KEY
```

应该能看到你的 API Key（注意：不要将 API Key 提交到 Git！）

## 验证安装

运行以下命令验证环境：

```bash
# 检查 pnpm
pnpm --version

# 检查依赖是否安装
ls node_modules | head -5

# 检查 .env 文件
cat .env | grep DASHSCOPE_API_KEY
```

## 下一步

安装完成后，查看：
- [快速启动指南](./QUICK_START.md) - 启动服务和测试 API
- [工作流指南](../workflow/WORKFLOW_GUIDE.md) - 了解系统工作流程
- [开发路线图](../development/DEVELOPMENT_ROADMAP.md) - 了解下一步开发计划

## 常见问题

### 1. 启动失败：找不到模块

**原因**: 依赖未安装

**解决**: 运行 `pnpm install`

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
