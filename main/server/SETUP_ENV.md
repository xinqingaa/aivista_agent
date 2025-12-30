# 环境配置说明

## ⚠️ 重要：创建 .env 文件

由于安全原因，`.env` 文件需要手动创建。请按照以下步骤操作：

### 方法1：使用命令行（推荐）

```bash
cd /Users/linruiqiang/work/aivista_agent/main/server

# 复制模板
cp .env.example .env

# 编辑 .env 文件，将以下行：
# DASHSCOPE_API_KEY=your_dashscope_api_key_here
# 替换为：
# DASHSCOPE_API_KEY=sk-80cda2f2a44b4578b637b2dad2ab7b42
```

### 方法2：手动创建

创建 `.env` 文件，内容如下：

```bash
# ============================================
# LLM 服务配置
# ============================================
LLM_PROVIDER=aliyun

# 阿里云配置（必填）
DASHSCOPE_API_KEY=sk-80cda2f2a44b4578b637b2dad2ab7b42
ALIYUN_MODEL_NAME=qwen-turbo
ALIYUN_TEMPERATURE=0.3

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

### 验证配置

创建完成后，可以验证文件是否存在：

```bash
ls -la .env
cat .env | grep DASHSCOPE_API_KEY
```

应该能看到你的 API Key（注意：不要将 API Key 提交到 Git！）

