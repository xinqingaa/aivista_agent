# AiVista Web 前端技术文档

欢迎来到 AiVista Web 前端项目的技术文档中心。

## 📚 文档结构

### 架构文档 (architecture/)

- [架构设计](./architecture/ARCHITECTURE.md) - 整体架构设计，包括目录结构、状态管理、路由设计
- [项目结构](./architecture/PROJECT_STRUCTURE.md) - 详细的目录结构说明
- [技术栈详解](./architecture/TECHNOLOGY_STACK.md) - React、Next.js、TailwindCSS 等技术选型

### API 集成 (api/)

- [API 集成指南](./api/API_INTEGRATION.md) - 后端 API 接口集成说明
- [SSE 客户端实现](./api/SSE_CLIENT.md) - Server-Sent Events 客户端实现
- [TypeScript 类型定义](./api/TYPES.md) - 前后端共享的类型定义

### 功能文档 (features/)

- [文生图功能](./features/TEXT_TO_IMAGE.md) - 文生图功能的前端实现
- [知识库管理](./features/KNOWLEDGE_BASE.md) - 知识库管理功能
- [Agent 工作流](./features/AGENT_WORKFLOW.md) - Agent 工作流前端展示
- [边界条件](./features/BOUNDARY_CONDITIONS.md) - 输入验证、错误处理、性能边界

### 组件文档 (components/)

- [GenUI 组件系统](./components/GENUI_COMPONENTS.md) - 动态组件渲染系统
- [智能画布组件](./components/SMART_CANVAS.md) - SmartCanvas 详细设计
- [通用 UI 组件](./components/UI_COMPONENTS.md) - 可复用的 UI 组件库

### 性能优化 (performance/)

- [虚拟滚动实现](./performance/VIRTUAL_SCROLL.md) - 高性能列表实现
- [性能优化策略](./performance/OPTIMIZATION.md) - 代码分割、懒加载、缓存等

### 样式文档 (styling/)

- [响应式设计](./styling/RESPONSIVE_DESIGN.md) - TailwindCSS 响应式设计规范
- [配色方案](./styling/COLOR_SCHEME.md) - 配色方案和主题系统

### 开发文档 (development/)

- [项目初始化](./development/SETUP.md) - 环境配置、依赖安装、开发服务器启动
- [实施路线图](./development/IMPLEMENTATION_ROADMAP.md) - 分阶段实施计划，每步可独立验证
- [开发最佳实践](./development/BEST_PRACTICES.md) - 代码规范、组件设计原则
- [配置文档](./development/CONFIGURATION.md) - 环境变量、工作流配置、超时和重试配置

## 🚀 快速开始

1. 阅读 [实施路线图](./development/IMPLEMENTATION_ROADMAP.md) 了解分阶段实施计划
2. 阅读 [项目初始化指南](./development/SETUP.md) 设置开发环境
3. 查看 [架构设计](./architecture/ARCHITECTURE.md) 了解整体架构
4. 参考 [API 集成指南](./api/API_INTEGRATION.md) 集成后端 API
5. 遵循 [开发最佳实践](./development/BEST_PRACTICES.md) 进行开发

## 📖 核心概念

### GenUI 组件系统

GenUI（Generative UI）是一个动态组件渲染系统，后端通过 SSE 流式推送组件定义，前端根据定义动态渲染对应的 React 组件。

- [GenUI 组件系统](./components/GENUI_COMPONENTS.md)
- [后端 GenUI 协议](../../../docs/gen_ui_protocol.md)

### SSE 流式通信

使用 Server-Sent Events (SSE) 实现与后端的实时通信，接收 Agent 工作流的流式响应。

- [SSE 客户端实现](./api/SSE_CLIENT.md)
- [后端 SSE 设计](../../../main/server/docs/workflow/SSE_STREAMING_DESIGN.md)

### Agent 工作流

前端展示 Agent 工作流的执行过程，包括思考日志、节点状态、进度展示等。

- [Agent 工作流前端实现](./features/AGENT_WORKFLOW.md)
- [后端工作流设计](../../../main/server/docs/workflow/AGENT_WORKFLOW_DESIGN.md)

## 🔗 相关资源

### 后端文档

- [后端 API 参考](../../../main/server/docs/api/API_REFERENCE.md)
- [后端架构文档](../../../docs/architecture.md)
- [产品规格](../../../docs/product_spec.md)

### 技术栈

- [React](https://react.dev/)
- [Next.js](https://nextjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Zustand](https://zustand-demo.pmnd.rs/) - 状态管理

## 📝 文档维护

本文档与代码同步更新。如有问题或建议，请提交 Issue 或 Pull Request。
