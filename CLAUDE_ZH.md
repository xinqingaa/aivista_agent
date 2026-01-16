# AiVista 智能体开发指南

本指南为在 AiVista 多平台 AI 应用代码库中工作的智能体编码代理提供约定和命令。

## 项目架构

AiVista 是一个多平台 AI 应用，包含三个主要组件：
- **后端**: NestJS 服务器，使用 LangGraph 进行 AI 工作流编排
- **Web**: Next.js 前端，使用 TypeScript、React 和 Tailwind CSS
- **移动端**: Flutter 客户端应用

## 开发命令

### 后端 (server/)
```bash
# 开发模式
pnpm run start:dev          # 启动热重载
pnpm run start:debug        # 启动调试模式
pnpm run start:prod         # 启动生产构建

# 构建和测试
pnpm run build              # 构建应用
pnpm run test               # 运行所有测试
pnpm run test:watch         # 监听模式运行测试
pnpm run test:cov           # 运行测试并生成覆盖率报告
pnpm run test:e2e           # 运行端到端测试

# 单个测试
pnpm run test -- path/to/file.spec.ts

# 代码质量
pnpm run lint               # 运行 ESLint
pnpm run format             # 使用 Prettier 格式化代码
```

### Web 前端 (web/)
```bash
# 开发模式
pnpm run dev                # 启动开发服务器（端口 3001）
pnpm run build              # 构建生产版本
pnpm run start              # 启动生产服务器
pnpm run lint               # 运行 ESLint
```

### 移动端客户端 (client/)
```bash
# Flutter（需要 FVM 3.38.5）
fvm flutter run             # 运行应用
fvm flutter test            # 运行所有测试
fvm flutter build apk       # 构建 Android APK
fvm flutter build ios       # 构建 iOS 应用
fvm flutter analyze         # 运行静态分析

# 单个测试
fvm flutter test path/to/test.dart
```

### 全局命令
```bash
./start.sh backend          # 仅启动后端
./start.sh frontend         # 仅启动 Flutter
./start.sh web              # 仅启动 Next.js
./start.sh all              # 启动所有服务（默认）
```

## 代码风格指南

### TypeScript（后端和 Web）
- 使用严格 TypeScript 并定义合适的类型
- 优先使用 ES6 import/export 语法
- 在 NestJS 后端中广泛使用装饰器
- Web 使用路径别名：`@/*` 进行根相对导入
- 文件命名：服务/控制器使用驼峰命名法，组件使用帕斯卡命名法

### 后端 (NestJS)
```typescript
// 标准导入
import { Injectable, Inject, Logger } from '@nestjs/common';
import { AgentState } from './interfaces/agent-state.interface';

// 装饰器模式
@Injectable()
export class AgentService {
  constructor(
    @Inject('AGENT_GRAPH')
    private readonly graph: any,
  ) {}
}
```

### Web (Next.js/React)
```typescript
// 使用路径别名导入组件
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';

// shadcn/ui 模式
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
  )
);
```

### Dart (Flutter)
- 使用 flutter_lints 进行代码风格检查
- 使用 Provider 模式进行状态管理
- 使用 json_annotation 进行 JSON 序列化
- 使用 Material Design 组件

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});
}
```

## 导入约定

### 后端结构
- 服务文件以 `.service.ts` 结尾
- 控制器文件以 `.controller.ts` 结尾
- 接口文件以 `.interface.ts` 结尾
- DTO 文件以 `.dto.ts` 结尾
- 同级模块使用相对导入

### Web 结构
- `components/` 中的组件使用帕斯卡命名法
- `hooks/` 中的钩子以 `use` 前缀开头
- 工具函数放在 `lib/utils.ts`
- 类型定义放在 `types/` 目录，以 `.type.ts` 结尾

### Flutter 结构
- 页面放在 `lib/screens/`
- 组件放在 `lib/widgets/`
- 服务放在 `lib/services/`
- 模型放在 `lib/models/`

## 错误处理

### 后端错误处理
- 使用 NestJS ValidationPipe 进行请求验证
- 为流式响应实现异步生成器
- 使用 SSE 事件进行实时通信

```typescript
// 带错误边界的流式处理
async *executeWorkflow(initialState: AgentState): AsyncGenerator<any> {
  try {
    for await (const chunk of stream) {
      yield { event: 'thought', data: chunk };
    }
  } catch (error) {
    this.logger.error('Workflow execution failed', error);
    yield { event: 'error', data: error.message };
  }
}
```

### Web 错误处理
- 使用 React 错误边界处理组件错误
- 实现适当的加载状态
- 使用 toast 通知处理 API 错误

### Flutter 错误处理
- 为异步操作使用 try-catch 块
- 在 UI 中实现适当的错误状态
- 使用 Flutter 的错误小部件处理未捕获的错误

## AI 智能体工作流

后端使用 LangGraph，节点结构如下：
1. **规划器**: 分析用户请求并创建计划
2. **RAG**: 从知识库检索相关上下文
3. **执行器**: 执行计划的操作
4. **评论家**: 审查和验证结果

## 数据库和存储

- **LanceDB**: 用于嵌入和知识库的向量数据库
- **环境变量**: 所有配置通过 `.env` 文件进行
- 使用 `@nestjs/config` 进行配置管理

## 测试模式

### 后端测试
- 使用 Jest 和 ts-jest
- 测试文件以 `.spec.ts` 结尾
- 模拟外部依赖
- 测试正常路径和错误情况

### Flutter 测试
- UI 组件使用 Widget 测试
- 业务逻辑使用单元测试
- 用户流程使用集成测试

## 配置

### 环境变量
参考各模块中的 `.env.example`：
- 后端：数据库 URL、API 密钥、LLM 提供商设置
- Web：API 端点、功能标志
- 移动端：服务器 URL、API 配置

### 构建配置
- 后端：CommonJS 模块，ES2022 目标
- Web：带有 Next.js 优化的 ESNext 模块
- Flutter：通过 FVM 管理以保持版本一致性

## 开发工作流

1. 运行 `./start.sh all` 启动所有服务
2. 后端运行在默认 NestJS 端口
3. Web 前端运行在端口 3001
4. 移动应用通过 HTTP/SSE 连接后端
5. 使用 `.cursor/plans/` 中的 Cursor 计划进行功能指导

## 代码审查指南

- 确保 TypeScript 类型正确
- 验证错误处理实现
- 检查安全最佳实践
- 验证环境变量使用
- 确认适当的日志记录和监控
- 端到端测试流式功能

## 性能考虑

- 一致使用 async/await
- 实现适当的缓存策略
- 优化打包大小（Web）
- 使用高效的状态管理模式
- 监控 AI 工作流执行时间