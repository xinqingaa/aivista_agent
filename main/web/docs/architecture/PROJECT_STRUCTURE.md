# 项目结构说明 (Project Structure)

## 1. 概述

本文档详细说明 AiVista Web 前端项目的目录结构和文件组织方式。

## 2. 完整目录结构

```
main/web/
├── .next/                        # Next.js 构建输出（自动生成，gitignore）
├── .env.local                    # 本地环境变量（gitignore）
├── .env.example                  # 环境变量示例
├── .gitignore                    # Git 忽略文件
├── next.config.js                # Next.js 配置
├── tailwind.config.js            # TailwindCSS 配置
├── tsconfig.json                 # TypeScript 配置
├── package.json                  # 项目依赖
├── README.md                     # 项目说明
│
├── app/                          # Next.js App Router（主目录）
│   ├── layout.tsx               # 根布局组件
│   ├── page.tsx                 # 重定向到首页
│   ├── loading.tsx              # 全局加载状态
│   ├── error.tsx                # 全局错误页面
│   ├── not-found.tsx            # 404 页面
│   ├── globals.css              # 全局样式
│   │
│   ├── (main)/                  # 主路由组（共享布局）
│   │   ├── layout.tsx           # 主布局（包含Header等）
│   │   ├── page.tsx             # 首页（文生图主界面）
│   │   ├── knowledge/           # 知识库页面
│   │   │   └── page.tsx         # 知识库列表页
│   │   │
│   │   └── [id]/                # 动态路由：风格详情
│   │       └── page.tsx
│   │
│   ├── chat/                    # 聊天页面（独立测试页面）
│   │   └── page.tsx             # 聊天测试页面
│   │
│   └── api/                     # API Routes（如果需要）
│       └── proxy/               # 代理路由（解决CORS）
│           └── route.ts
│
├── components/                  # React 组件目录
│   ├── chat/                    # 聊天相关组件（已完成）
│   │   ├── ChatInterface.tsx   # 聊天界面主组件
│   │   ├── ThoughtLogItem.tsx  # 思考日志展示组件
│   │   ├── EnhancedPromptView.tsx # 增强 Prompt 展示
│   │   ├── ImageView.tsx       # 图片展示组件
│   │   ├── TestGuideDialog.tsx # 测试指南对话框
│   │   ├── WorkflowProgress.tsx # 工作流进度组件
│   │   └── index.ts            # 导出
│   │
│   ├── knowledge/               # 知识库组件（已完成）
│   │   ├── StyleCard.tsx       # 风格卡片组件
│   │   ├── StyleList.tsx       # 风格列表组件
│   │   ├── StyleForm.tsx       # 风格表单组件
│   │   ├── StyleEditDialog.tsx # 风格编辑对话框
│   │   ├── StyleActions.tsx    # 风格操作组件
│   │   ├── BatchDeleteConfirm.tsx # 批量删除确认
│   │   ├── DeleteConfirm.tsx   # 删除确认对话框
│   │   ├── KnowledgeStats.tsx  # 知识库统计
│   │   ├── StyleSearch.tsx     # 风格搜索组件
│   │   └── index.ts            # 导出
│   │
│   ├── genui/                   # GenUI 组件系统（未来规划，未实现）
│   │   ├── SmartCanvas.tsx      # 智能画布组件（蒙版绘制）
│   │   ├── AgentMessage.tsx    # Agent 消息组件
│   │   ├── ActionPanel.tsx     # 动态操作面板
│   │   ├── GenUIRenderer.tsx   # GenUI 动态渲染器
│   │   └── index.ts            # 导出
│   │
│   ├── ui/                      # 通用 UI 组件
│   │   ├── button.tsx          # 按钮组件
│   │   ├── input.tsx           # 输入框组件
│   │   ├── textarea.tsx        # 文本域组件
│   │   ├── card.tsx            # 卡片组件
│   │   ├── progress.tsx        # 进度条组件
│   │   ├── scroll-area.tsx     # 滚动区域组件
│   │   └── index.ts
│   │
│   ├── layout/                  # 布局组件
│   │   ├── Header.tsx          # 顶部导航栏
│   │   ├── Sidebar.tsx         # 侧边栏（规划中）
│   │   ├── Footer.tsx         # 页脚（规划中）
│   │   └── index.ts
│   │
│   └── shared/                  # 共享组件
│       └── index.ts
│
├── lib/                         # 工具库和业务逻辑
│   ├── api/                     # API 客户端（规划中）
│   │   ├── client.ts           # 基础 HTTP 客户端
│   │   ├── agent.ts            # Agent API 封装
│   │   ├── knowledge.ts        # Knowledge API 封装
│   │   └── types.ts            # API 响应类型
│   │
│   ├── sse/                     # SSE 客户端（已完成）
│   │   ├── sse-client.ts       # SSE 连接管理
│   │   ├── event-handler.ts    # 事件处理器工具
│   │   └── index.ts            # 导出
│   │
│   ├── types/                   # TypeScript 类型定义
│   │   ├── agent.ts            # Agent 相关类型
│   │   ├── knowledge.ts        # Knowledge 相关类型
│   │   ├── genui.ts            # GenUI 组件类型
│   │   ├── sse.ts              # SSE 事件类型（已完成）
│   │   └── index.ts            # 统一导出
│   │
│   ├── utils/                   # 工具函数
│   │   ├── cn.ts               # 类名合并工具
│   │   ├── format.ts           # 格式化函数
│   │   ├── validation.ts       # 验证函数
│   │   ├── date.ts             # 日期处理
│   │   ├── image.ts            # 图片处理
│   │   └── constants.ts        # 常量定义
│
├── hooks/                       # 自定义 Hooks（独立目录）
│   ├── useSSE.ts               # SSE 连接管理（已完成）
│   ├── useAgentChat.ts         # Agent 聊天逻辑（已完成）
│   ├── useKnowledge.ts         # 知识库操作（规划中）
│   ├── useVirtualScroll.ts    # 虚拟滚动（规划中）
│   ├── useDebounce.ts         # 防抖（规划中）
│   └── useLocalStorage.ts     # 本地存储（规划中）
│
├── stores/                      # 状态管理（Zustand）
│   ├── session-store.ts        # 会话状态
│   ├── ui-store.ts             # UI 状态
│   ├── chat-store.ts           # 聊天状态
│   └── index.ts                # 统一导出
│
├── styles/                      # 样式文件
│   ├── globals.css             # 全局样式
│   └── components.css          # 组件样式（可选）
│
├── public/                      # 静态资源
│   ├── images/                 # 图片资源
│   ├── icons/                   # 图标
│   └── favicon.ico            # 网站图标
│
├── docs/                        # 项目文档
│   ├── architecture/           # 架构文档
│   ├── api/                    # API 文档
│   ├── features/               # 功能文档
│   ├── components/             # 组件文档
│   ├── performance/            # 性能文档
│   ├── styling/                # 样式文档
│   └── development/            # 开发文档
│
└── tests/                       # 测试文件（可选）
    ├── __mocks__/              # Mock 数据
    ├── unit/                   # 单元测试
    └── e2e/                    # 端到端测试
```

## 3. 目录说明

### 3.1 app/ - Next.js App Router

**作用：** Next.js 13+ 的文件系统路由，定义页面和布局。

**关键文件：**
- `layout.tsx`: 根布局，包含全局样式、Provider 等
- `page.tsx`: 重定向到首页
- `(main)/layout.tsx`: 主布局，包含 Header、Footer 等
- `(main)/page.tsx`: 首页，文生图主界面
- `(main)/knowledge/page.tsx`: 知识库页面
- `chat/page.tsx`: 聊天测试页面（独立布局）

**路由组说明：**
- `(main)/`: 路由组，共享同一布局，不影响 URL 路径
  - URL 路径为 `/`、`/knowledge` 等，不包含 `(main)`
- `chat/`: 独立页面，有自己的测试布局

**约定：**
- 每个目录下的 `page.tsx` 是一个路由
- `layout.tsx` 用于嵌套布局
- `loading.tsx` 和 `error.tsx` 用于加载和错误状态
- `(folder)` 格式表示路由组，不参与 URL 路径生成

### 3.2 components/ - React 组件

**组织原则：**
- 按功能模块划分（chat、knowledge、genui、ui、layout）
- 每个组件一个文件
- 使用 `index.ts` 统一导出

**子目录：**
- `chat/`: 聊天相关组件，已完成实现
  - `ChatInterface.tsx`: 主聊天界面组件
  - `ThoughtLogItem.tsx`: 思考日志展示
  - `EnhancedPromptView.tsx`: 增强 Prompt 展示
  - `ImageView.tsx`: 图片展示组件
  - `TestGuideDialog.tsx`: 测试指南对话框
  - `WorkflowProgress.tsx`: 工作流进度组件
- `knowledge/`: 知识库组件，已完成实现
  - `StyleCard.tsx`: 风格卡片组件
  - `StyleList.tsx`: 风格列表组件
  - `StyleForm.tsx`: 风格表单组件
  - `StyleEditDialog.tsx`: 风格编辑对话框
  - `StyleActions.tsx`: 风格操作组件
  - `BatchDeleteConfirm.tsx`: 批量删除确认
  - `DeleteConfirm.tsx`: 删除确认对话框
  - `KnowledgeStats.tsx`: 知识库统计
  - `StyleSearch.tsx`: 风格搜索组件
- `genui/`: GenUI 组件系统（未来规划，未实现），动态渲染后端下发的组件
- `ui/`: 通用 UI 组件，可复用的基础组件
- `layout/`: 布局组件，页面结构
- `shared/`: 共享组件，跨模块使用

### 3.3 lib/ - 工具库和业务逻辑

**组织原则：**
- 按功能领域划分（api、sse、types、utils）
- 不包含 UI 相关代码
- 纯函数和工具类

**子目录：**
- `api/`: API 客户端封装（规划中）
- `sse/`: SSE 客户端实现（已完成）
  - `sse-client.ts`: SSE 连接管理器
  - `event-handler.ts`: 事件处理器工具
- `types/`: TypeScript 类型定义
  - `sse.ts`: SSE 事件类型定义（已完成）
- `utils/`: 工具函数
  - `cn.ts`: 类名合并工具（已完成）

### 3.4 hooks/ - 自定义 Hooks

**作用：** 封装可复用的逻辑，提取组件中的状态和副作用。

**已实现的 Hook：**
- `useSSE.ts`: SSE 连接管理（已完成）
- `useAgentChat.ts`: Agent 聊天逻辑（已完成）

**规划中的 Hook：**
- `useKnowledge.ts`: 知识库操作
- `useVirtualScroll.ts`: 虚拟滚动
- `useDebounce.ts`: 防抖
- `useLocalStorage.ts`: 本地存储

### 3.5 stores/ - 状态管理

**作用：** 使用 Zustand 管理全局状态。

**状态分类：**
- `session-store.ts`: 会话相关状态（sessionId、消息历史）
- `ui-store.ts`: UI 状态（侧边栏、主题）
- `chat-store.ts`: 聊天相关状态

### 3.6 styles/ - 样式文件

**作用：** 全局样式和 TailwindCSS 配置。

**文件：**
- `globals.css`: 全局样式，导入 TailwindCSS
- `components.css`: 组件特定样式（可选）

### 3.7 public/ - 静态资源

**作用：** 存放不需要处理的静态文件。

**内容：**
- 图片、图标、字体等
- 直接通过 `/` 路径访问

## 4. 文件命名规范

### 4.1 组件文件

- **PascalCase**: `Button.tsx`, `SmartCanvas.tsx`
- **一个文件一个组件**: 每个组件独立文件
- **index.ts 导出**: 使用 `index.ts` 统一导出

### 4.2 工具文件

- **camelCase**: `format.ts`, `validation.ts`
- **功能明确**: 文件名反映功能

### 4.3 类型文件

- **camelCase**: `agent.ts`, `genui.ts`
- **统一导出**: 使用 `index.ts` 统一导出类型

## 5. 导入路径规范

### 5.1 绝对路径导入

使用 `@/` 别名（在 `tsconfig.json` 中配置）：

```typescript
// ✅ 推荐
import { Button } from '@/components/ui/Button'
import { useSSE } from '@/hooks/useSSE'
import { agentApi } from '@/lib/api/agent'

// ❌ 不推荐相对路径
import { Button } from '../../../components/ui/Button'
```

### 5.2 路径别名配置

在 `tsconfig.json` 中配置：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## 6. 组件组织原则

### 6.1 组件拆分

**原则：**
- 单一职责：每个组件只做一件事
- 可复用：通用逻辑提取为 Hook
- 可测试：组件逻辑清晰，易于测试

**示例：**
```typescript
// ✅ 好的拆分
<ChatContainer>
  <MessageList messages={messages} />
  <MessageInput onSend={handleSend} />
</ChatContainer>

// ❌ 不好的拆分（组件过大）
<ChatContainer>
  {/* 所有逻辑都在这里 */}
</ChatContainer>
```

### 6.2 组件层级

```
Page Component (app/page.tsx)
  └── Chat Component (components/chat/)
      └── UI Component (components/ui/)

Page Component (app/knowledge/page.tsx)
  └── Knowledge Component (components/knowledge/)
      └── UI Component (components/ui/)

Future: GenUI Component (components/genui/)
```

## 7. 状态管理组织

### 7.1 状态分类

- **全局状态**: 使用 Zustand Store
- **组件状态**: 使用 useState/useReducer
- **服务器状态**: 使用 SWR/React Query（可选）

### 7.2 Store 组织

```typescript
// stores/session-store.ts
export const useSessionStore = create((set) => ({
  sessionId: null,
  messages: [],
  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  }))
}))
```

## 8. 相关文档

- [架构设计](./ARCHITECTURE.md)
- [技术栈详解](./TECHNOLOGY_STACK.md)
- [开发最佳实践](../development/BEST_PRACTICES.md)
- [SSE 实现总结](../sse-implementation-summary.md) - SSE 客户端和聊天界面实现
- [API 集成指南](../api/API_INTEGRATION.md)
- [Agent 工作流前端实现](../features/AGENT_WORKFLOW.md)
