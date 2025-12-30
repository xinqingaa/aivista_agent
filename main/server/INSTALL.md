# 🚀 一键安装指南

## 最简单的方式（推荐）

直接运行安装脚本，它会自动完成所有配置：

```bash
cd /Users/linruiqiang/work/aivista_agent/main/server
./setup.sh
```

这个脚本会：
1. ✅ 检查并安装 pnpm（如果未安装）
2. ✅ 安装所有项目依赖
3. ✅ 创建 .env 文件
4. ✅ 自动配置你的 API Key（`sk-80cda2f2a44b4578b637b2dad2ab7b42`）

## 安装完成后

### 启动服务

```bash
pnpm run start:dev
```

### 验证服务

服务启动后，访问：
- 服务地址：`http://localhost:3000`
- SSE 端点：`http://localhost:3000/api/agent/chat`

### 测试 API

使用 Apifox 或 curl 测试：

```bash
curl -N -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"text":"生成一只赛博朋克风格的猫"}'
```

## 如果脚本执行失败

### 手动安装步骤

1. **安装 pnpm（如果未安装）：**
```bash
npm install -g pnpm
```

2. **安装依赖：**
```bash
cd /Users/linruiqiang/work/aivista_agent/main/server
pnpm install
```

3. **创建 .env 文件：**
```bash
cp .env.example .env
```

4. **编辑 .env 文件，设置 API Key：**
```bash
# 使用任意编辑器打开 .env
nano .env

# 找到这一行并修改：
DASHSCOPE_API_KEY=sk-80cda2f2a44b4578b637b2dad2ab7b42
```

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
- `QUICK_START.md` - 快速启动指南
- `README.md` - 完整文档
- `docs/` - 详细设计文档

