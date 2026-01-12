# AiVista Web

AiVista Web 前端应用，基于 Next.js 14+ 和 React 18+ 构建。

## 快速开始

### 前置要求

- Node.js 18.0+ 或 20.0+
- pnpm（包管理器）

### 安装依赖

```bash
pnpm install
```

### 环境变量

创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 启动开发服务器

```bash
pnpm dev
```

应用将在 `http://localhost:3001` 启动。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 项目结构

```
main/web/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── knowledge/         # 知识库页面
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   ├── layout/           # 布局组件
│   └── features/         # 功能组件
├── lib/                  # 工具库
│   ├── api/             # API 客户端
│   ├── types/           # TypeScript 类型
│   └── utils/           # 工具函数
├── hooks/               # 自定义 Hooks
└── docs/                # 文档
```

## 技术栈

- **框架**: Next.js 14+ (App Router)
- **UI 库**: React 18+
- **样式**: TailwindCSS
- **组件库**: shadcn/ui
- **状态管理**: Zustand
- **主题**: next-themes (深色/浅色模式)
- **类型**: TypeScript 5.0+

## 功能

### 阶段1：基础搭建和知识库功能 ✅

- [x] 项目初始化
- [x] shadcn/ui 集成
- [x] 主题系统（深色/浅色模式）
- [x] 知识库 API 集成
- [x] 知识库管理界面
  - [x] 风格列表
  - [x] 风格搜索
  - [x] 风格详情
  - [x] 添加风格

## 开发

### 代码规范

项目使用 ESLint 和 Prettier 进行代码格式化。

### 主题切换

应用支持深色/浅色模式切换，点击右上角的主题切换按钮即可。

### API 代理

开发环境中，Next.js 会自动代理 `/api/*` 请求到 `http://localhost:3000/api/*`，解决 CORS 问题。

## 开发规范

项目遵循统一的开发规范，请参考：

- [文件命名规范](./docs/development/NAMING_CONVENTIONS.md) - 文件命名约定
- [开发规范](./docs/development/CODING_STANDARDS.md) - 代码风格和最佳实践
- [最佳实践](./docs/development/BEST_PRACTICES.md) - 开发最佳实践

## 参考文档

详细的技术文档请参考 `docs/` 目录：

- [架构设计](./docs/architecture/ARCHITECTURE.md)
- [技术栈详解](./docs/architecture/TECHNOLOGY_STACK.md)
- [API 集成指南](./docs/api/API_INTEGRATION.md)
- [实施路线图](./docs/development/IMPLEMENTATION_ROADMAP.md)

## 许可证

私有项目
