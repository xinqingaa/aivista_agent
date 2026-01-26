# 后端项目启动指南

> **版本**: v0.0.2
> **日期**: 2025-01-22
> **状态**: 已验证

---

## 目录

- [方案概述](#方案概述)
- [方案一：SQLite（推荐）](#方案一sqlite推荐-零配置快速启动)
- [方案二：Docker PostgreSQL](#方案二docker-postgresql-容器化数据库)
- [方案三：本地 PostgreSQL](#方案三本地-postgresql-生产环境推荐)
- [方案四：云数据库 Supabase](#方案四云数据库-supabase-零部署)
- [常见问题](#常见问题)
- [验证步骤](#验证步骤)

---

## 方案概述

| 方案 | 难度 | 适用场景 | 优点 | 缺点 |
|------|------|----------|------|------|
| **SQLite** | ⭐ 简单 | 开发/测试 | 零配置、文件存储 | 并发性能较弱 |
| **Docker** | ⭐⭐ 中等 | 开发/测试 | 环境隔离、易清理 | 需要安装 Docker |
| **本地 PostgreSQL** | ⭐⭐⭐ 复杂 | 生产环境 | 性能最佳、功能完整 | 需要安装配置 |
| **Supabase** | ⭐⭐ 中等 | 云端部署 | 零运维、自动备份 | 需要网络连接 |

---

## 方案一：SQLite（推荐）- 零配置快速启动

### 1.1 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 1.2 配置步骤

#### Step 1: 复制环境变量文件

```bash
cd main/server
cp .env.example .env
```

#### Step 2: 编辑 `.env` 文件

```bash
# 使用 nano 编辑
nano .env

# 或使用 vim 编辑
vim .env

# 或使用 VS Code 编辑
code .env
```

#### Step 3: 配置 SQLite（使用默认配置即可）

`.env` 文件中确保以下配置：

```bash
# ============================================
# 数据库配置 - SQLite
# ============================================
DB_TYPE=sqlite

# SQLite 数据库文件路径（相对于项目根目录）
DB_DATABASE=./data/aivista.db

# 开发环境自动同步表结构
DB_SYNCHRONIZE=true

# 启用数据库日志
DB_LOGGING=true
```

**完整的最小配置示例**：

```bash
# LLM 服务配置
LLM_PROVIDER=aliyun
DASHSCOPE_API_KEY=your_api_key_here
ALIYUN_MODEL_NAME=qwen-turbo

# 服务配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_TYPE=sqlite
DB_DATABASE=./data/aivista.db
DB_SYNCHRONIZE=true
DB_LOGGING=true

# 向量数据库
VECTOR_DB_PATH=./data/lancedb
```

#### Step 4: 安装依赖

```bash
cd main/server
pnpm install
```

#### Step 5: 启动服务

```bash
# 开发模式（热重载）
pnpm run start:dev

# 或生产模式
pnpm run build
pnpm run start:prod
```

### 1.3 验证启动

成功启动后，你会看到：

```
[Nest] INFO [TypeOrmModule] Connected to database: sqlite
[Nest] INFO [NestApplication] Nest application successfully started
```

数据库文件会自动创建在 `main/server/data/aivista.db`。

### 1.4 SQLite 特点

✅ **优点**：
- 无需安装任何数据库软件
- 零配置，即开即用
- 数据存储在单个文件中，易于备份和迁移
- 适合开发和小规模应用

⚠️ **限制**：
- 不支持高并发写入
- 不支持网络访问（仅本地）
- 部分高级 SQL 功能不可用

---

## 方案二：Docker PostgreSQL - 容器化数据库

### 2.1 环境要求

- Docker Desktop 已安装
- Docker 服务运行中

### 2.2 配置步骤

#### Step 1: 创建 Docker Compose 文件

在 `main/server/` 目录下创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: aivista-postgres
    restart: always
    environment:
      POSTGRES_USER: aivista
      POSTGRES_PASSWORD: aivista_password
      POSTGRES_DB: aivista_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aivista"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

#### Step 2: 启动 PostgreSQL 容器

```bash
# 在 main/server/ 目录下
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f postgres
```

#### Step 3: 配置 `.env` 文件

```bash
# ============================================
# 数据库配置 - PostgreSQL (Docker)
# ============================================
DB_TYPE=postgres

# Docker 容器配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=aivista
DB_PASSWORD=aivista_password
DB_NAME=aivista_dev

# 开发环境配置
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=false
```

#### Step 4: 启动后端服务

```bash
pnpm install
pnpm run start:dev
```

### 2.3 Docker 管理命令

```bash
# 停止容器
docker-compose stop

# 启动容器
docker-compose start

# 重启容器
docker-compose restart

# 查看日志
docker-compose logs -f postgres

# 进入数据库
docker-compose exec postgres psql -U aivista -d aivista_dev

# 删除容器和数据（谨慎使用）
docker-compose down -v
```

### 2.4 验证连接

```bash
# 在容器内测试
docker-compose exec postgres psql -U aivista -d aivista_dev -c "SELECT version();"

# 从本地测试（如果有 psql 客户端）
psql -h localhost -p 5432 -U aivista -d aivista_dev
```

### 2.5 数据备份和恢复

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U aivista aivista_dev > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U aivista aivista_dev < backup.sql

# 或使用 docker 命令
docker exec aivista-postgres pg_dump -U aivista aivista_dev > backup.sql
```

---

## 方案三：本地 PostgreSQL - 生产环境推荐

### 3.1 macOS 安装 PostgreSQL

#### 方法 A: 使用 Homebrew（推荐）

```bash
# 安装 PostgreSQL 15
brew install postgresql@15

# 启动 PostgreSQL 服务
brew services start postgresql@15

# 验证安装
psql postgres --version
```

#### 方法 B: 使用 Postgres.app（图形界面）

1. 下载 [Postgres.app](https://postgresapp.com/)
2. 安装并启动应用
3. 点击 "Initialize" 创建数据库
4. 默认配置：
   - Host: localhost
   - Port: 5432
   - User: 你的系统用户名
   - Password: (无)

### 3.2 Linux 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.3 Windows 安装 PostgreSQL

1. 下载 [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
2. 运行安装程序
3. 记住设置的密码（默认用户：postgres）
4. 默认端口：5432

### 3.4 创建数据库

```bash
# 方式 1: 使用 createdb 命令
createdb -U postgres aivista_dev

# 方式 2: 使用 psql 交互式
psql -U postgres
CREATE DATABASE aivista_dev;
\q

# 方式 3: 如果设置了密码
PGPASSWORD=your_password psql -U postgres -c "CREATE DATABASE aivista_dev;"
```

### 3.5 配置 `.env` 文件

```bash
# ============================================
# 数据库配置 - PostgreSQL (本地)
# ============================================
DB_TYPE=postgres

# 本地 PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=aivista_dev

# 开发环境配置
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=false
```

### 3.6 验证连接

```bash
# 测试连接
psql -U postgres -d aivista_dev -c "SELECT version();"

# 或查看数据库列表
psql -U postgres -l
```

### 3.7 常用管理命令

```bash
# 连接数据库
psql -U postgres -d aivista_dev

# 查看表
\dt

# 查看表结构
\d conversations

# 退出
\q

# 备份数据库
pg_dump -U postgres aivista_dev > backup.sql

# 恢复数据库
psql -U postgres aivista_dev < backup.sql
```

---

## 方案四：云数据库 Supabase - 零部署

### 4.1 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 注册/登录账号
3. 点击 "New Project"
4. 配置项目：
   - Name: `aivista-prod`
   - Database Password: (设置强密码)
   - Region: 选择最近的区域
5. 等待项目创建完成（约 2 分钟）

### 4.2 获取数据库连接信息

1. 进入项目 Dashboard
2. 点击左侧菜单 "Settings" → "Database"
3. 找到 "Connection info" 部分
4. 切换到 "URI" 标签
5. 复制连接字符串，格式类似：

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
```

### 4.3 配置 `.env` 文件

从连接字符串中提取信息：

```bash
# 连接字符串示例：
# postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres

# ============================================
# 数据库配置 - Supabase
# ============================================
DB_TYPE=postgres

# 从连接字符串中提取
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_actual_password_here
DB_NAME=postgres

# 云数据库配置
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=true  # Supabase 需要 SSL
```

### 4.4 配置 Supabase 安全设置

1. 在 Supabase Dashboard 中：
   - 进入 "SQL Editor"
   - 执行以下 SQL 启用 UUID 扩展（如果需要）：

```sql
-- 创建 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

2. 配置 CORS（如果需要）：
   - 进入 "Settings" → "API"
   - 添加你的域名到 "Allowed origins"

### 4.5 验证连接

```bash
# 启动服务
pnpm run start:dev

# 检查日志，应该看到类似：
# [TypeOrmModule] Connected to database: postgres
```

### 4.6 Supabase 优势

✅ **优点**：
- 零运维，自动备份
- 全球分布式 CDN
- 内置身份验证（可选）
- 免费额度：500MB 数据库
- 自动 SSL 加密
- 实时订阅功能（可选）

⚠️ **限制**：
- 需要网络连接
- 免费版有连接数限制
- 延迟高于本地数据库

---

## 常见问题

### Q1: 如何切换数据库类型？

只需修改 `.env` 文件中的 `DB_TYPE`：

```bash
# SQLite → PostgreSQL
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=aivista_dev

# PostgreSQL → SQLite
DB_TYPE=sqlite
DB_DATABASE=./data/aivista.db
```

**注意**：数据不会自动迁移，需要手动导出/导入。

### Q2: 数据库表没有创建？

确保 `.env` 中设置了：

```bash
DB_SYNCHRONIZE=true
```

然后重启服务：

```bash
pnpm run start:dev
```

### Q3: SQLite 数据库文件在哪里？

默认位置：`main/server/data/aivista.db`

可以使用 SQLite 客户端查看：

```bash
# 安装 SQLite 客户端
brew install sqlite3  # macOS
sudo apt install sqlite3  # Linux

# 查看数据库
sqlite3 main/server/data/aivista.db
.tables
```

### Q4: 如何清理数据库重新开始？

```bash
# SQLite
rm main/server/data/aivista.db
rm -rf main/server/data/lancedb

# PostgreSQL (Docker)
docker-compose down -v
docker-compose up -d

# PostgreSQL (本地)
psql -U postgres -c "DROP DATABASE IF EXISTS aivista_dev;"
psql -U postgres -c "CREATE DATABASE aivista_dev;"

# Supabase
# 在 Dashboard 中手动删除表，或使用 SQL Editor
```

### Q5: better-sqlite3 原生模块绑定文件缺失错误

**错误现象**：

```
Error: Could not locate the bindings file. Tried:
→ /path/to/node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3/build/better_sqlite3.node
```

**原因分析**：

pnpm v10+ 默认会忽略原生模块的构建脚本（安全策略），导致 `better-sqlite3` 的 C++ 绑定文件没有编译。

**解决方案（选择一种）**：

**方案 A：手动构建（推荐，最快）**

```bash
cd server/node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3
npx node-gyp rebuild
```

**方案 B：清理重装 + 手动构建**

```bash
cd server
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 构建原生模块
cd node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3
npx node-gyp rebuild
```

**方案 C：批准构建脚本（需要交互）**

```bash
cd server
pnpm approve-builds better-sqlite3
# 使用空格键选择 better-sqlite3，然后回车
```

**验证修复**：

```bash
# 检查绑定文件是否存在
ls -la node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3/build/Release/better_sqlite3.node

# 启动服务
pnpm run start:dev
```

**永久解决方案**：

在 `server/package.json` 中添加 postinstall 脚本：

```json
{
  "scripts": {
    "postinstall": "cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npx node-gyp rebuild || echo 'better-sqlite3 rebuild skipped'"
  }
}
```

或在 `server/.npmrc` 中配置：

```ini
enable-pre-post-scripts=true
```

### Q6: Windows 上 better-sqlite3 安装失败？

```bash
# 安装 Windows 构建工具
npm install -g windows-build-tools

# 或使用预编译的二进制文件
pnpm install better-sqlite3 --build-from-source

# 如果仍然失败，使用方案 A 手动构建
cd node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3
npx node-gyp rebuild
```

### Q7: 端口 3000 被占用？

修改 `.env` 文件：

```bash
PORT=3001
```

或者停止占用端口的进程：

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Q8: 如何查看数据库日志？

SQLite:
```bash
DB_LOGGING=true
```

PostgreSQL:
```bash
# Docker
docker-compose logs postgres

# 本地
tail -f /usr/local/var/log/postgres.log  # macOS
tail -f /var/log/postgresql/postgresql-15-main.log  # Linux
```

---

## 验证步骤

### 1. 检查服务状态

```bash
# 访问健康检查端点
curl http://localhost:3000/health

# 查看 Swagger 文档
open http://localhost:3000/api-docs  # macOS
xdg-open http://localhost:3000/api-docs  # Linux
start http://localhost:3000/api-docs  # Windows
```

### 2. 检查数据库表

```bash
# SQLite
sqlite3 main/server/data/aivista.db
.tables
# 输出应该包含：conversations messages genui_components rag_contexts

# PostgreSQL
psql -U postgres -d aivista_dev -c "\dt"
# 应该看到 4 张表
```

### 3. 测试 API

```bash
# 创建会话
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "测试对话"}'

# 获取会话列表
curl http://localhost:3000/api/conversations

# 发送聊天消息
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"你好"}'
```

### 4. 查看数据库中的数据

```bash
# SQLite
sqlite3 main/server/data/aivista.db
SELECT * FROM conversations;
SELECT * FROM messages;

# PostgreSQL
psql -U postgres -d aivista_dev
SELECT * FROM conversations;
SELECT * FROM messages;
```

---

## 推荐方案总结

### 开发环境（首选 SQLite）

✅ 最简单、零配置
✅ 适合快速迭代
✅ 易于重置和测试

```bash
DB_TYPE=sqlite
DB_DATABASE=./data/aivista.db
```

### 团队开发（推荐 Docker）

✅ 环境统一
✅ 易于共享配置
✅ 接近生产环境

```bash
docker-compose up -d
DB_TYPE=postgres
```

### 生产环境（使用 PostgreSQL）

✅ 性能最佳
✅ 高并发支持
✅ 数据完整性保证

```bash
DB_TYPE=postgres
DB_SYNCHRONIZE=false  # 使用 migrations
```

### 云端部署（推荐 Supabase）

✅ 零运维
✅ 自动备份
✅ 全球分布

```bash
DB_TYPE=postgres
DB_SSL=true
```

---

**文档版本**: v1.0
**最后更新**: 2025-01-22
**维护者**: AiVista 开发团队
