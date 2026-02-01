# AiVista

<div align="center">

**AI 驱动的智能图像生成与编辑平台**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node-18%2B-brightgreen)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18%2B-blue)](https://react.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10%2B-red)](https://nestjs.com)

灵感来源于"即梦 AI"，通过 Agent 智能体系统实现文生图、局部重绘等创意功能。

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [技术架构](#-技术架构) • [文档](#-文档)

</div>

---

## ✨ 功能特性

### 🎨 文生图（Text-to-Image）
- 自然语言描述，AI 自动生成图像
- 支持多种风格（赛博朋克、水彩、极简、动漫、印象派）
- 实时展示 Agent 思考过程和生成进度

### 🖌️ 局部重绘（Inpainting）
- 在图像上绘制蒙版区域
- 通过文本描述修改特定区域内容
- 支持撤销/重做操作

### 💬 多轮对话
- 连续对话，保持上下文
- 提示词续写和修改
- 智能合并历史 prompt

### 📚 知识库管理
- 预置 5 种风格数据
- 支持自定义风格添加
- 向量语义检索

---

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0+
- **pnpm**: 8.0+
- **Flutter**: 3.x（可选，移动端开发）

### 1. 克隆项目

```bash
git clone https://github.com/your-username/aivista.git
cd aivista
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd main/server
pnpm install

# 安装前端依赖
cd ../web
pnpm install
```

### 3. 配置环境变量

**后端配置**（`main/server/.env`）：

```bash
# 复制示例配置
cp main/server/.env.example main/server/.env

# 编辑配置文件，填入你的 API Key
# 必填：DASHSCOPE_API_KEY
```

**前端配置**（`main/web/.env.local`）：

```bash
# 复制示例配置
cp main/web/.env.example main/web/.env.local

# 配置后端 API 地址
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. 启动服务

```bash
# 启动后端服务（终端 1）
cd main/server
pnpm run start:dev

# 启动前端服务（终端 2）
cd main/web
pnpm run dev
```

### 5. 访问应用

- **Web 前端**: http://localhost:3001
- **API 服务**: http://localhost:3000

---

## 🏗️ 技术架构

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时环境 |
| NestJS | 10.x | 后端框架 |
| LangGraph | Latest | Agent 工作流编排 |
| LangChain | Latest | LLM 应用框架 |
| LanceDB | Latest | 向量数据库 |
| TypeScript | 5.x | 开发语言 |

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18+ | UI 框架 |
| Next.js | 14+ | 全栈框架 |
| TypeScript | 5.x | 开发语言 |
| TailwindCSS | Latest | 样式框架 |
| shadcn/ui | Latest | UI 组件库 |
| Zustand | Latest | 状态管理 |

### 移动端技术栈（可选）

| 技术 | 版本 | 用途 |
|------|------|------|
| Flutter | 3.x | 跨平台框架 |
| Provider | Latest | 状态管理 |

---

## 📖 文档

- [产品文档](./docs/README_RE.md) - 产品概述和功能说明
- [服务端实现](./main/server/docs/OVERVIEW_RE.md) - 后端详细实现
- [前端实现](./main/web/docs/OVERVIEW_RE.md) - 前端详细实现

---

## 🔑 API Key 获取

项目使用阿里云通义千问和通义万相 API，你可以：

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 开通服务并获取 API Key
3. 在 `.env` 文件中配置 `DASHSCOPE_API_KEY`

或者使用 DeepSeek（备用）：
- 访问 [DeepSeek Platform](https://platform.deepseek.com/)
- 获取 API Key
- 配置 `LLM_PROVIDER=deepseek`

---

## 📂 项目结构

```
aivista/
├── main/
│   ├── server/          # NestJS 后端服务
│   │   ├── src/
│   │   │   ├── agent/      # Agent 工作流
│   │   │   ├── llm/        # LLM 服务适配
│   │   │   ├── knowledge/  # 知识库管理
│   │   │   └── image/      # 图像服务
│   │   └── docs/
│   ├── web/             # Next.js 前端
│   │   ├── app/            # App Router 页面
│   │   ├── components/     # React 组件
│   │   ├── lib/            # 工具库
│   │   └── docs/
│   └── client/          # Flutter 移动端
├── docs/                # 产品文档
└── README.md
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [LangChain](https://github.com/langchain-ai/langchain) - LLM 应用框架
- [LangGraph](https://github.com/langchain-ai/langgraph) - Agent 编排框架
- [NestJS](https://github.com/nestjs/nest) - 后端框架
- [Next.js](https://github.com/vercel/next.js) - React 框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库

---

<div align="center">

**Made with ❤️ by AiVista Team**

[⬆ 回到顶部](#aivista)

</div>
