# 里程碑2：大脑构建 (The Brain) - LangGraph 集成

## 当前状态分析

**已完成：**

- ✅ NestJS 项目结构已搭建
- ✅ LLM 服务封装已完成（支持多模型切换）
- ✅ SSE 端点已实现（`/api/agent/chat`）
- ✅ Planner Node 已实现（意图解析）
- ✅ Executor Node 已实现（Mock 生图）
- ✅ AgentState 数据结构已定义
- ✅ LangGraph 依赖已安装（`@langchain/langgraph`）

**待完成：**

- ❌ 创建 LangGraph 状态图
- ❌ 将节点集成到 LangGraph 工作流
- ❌ 修改 AgentService 使用 LangGraph 执行
- ❌ 实现流式执行（支持 SSE 推送）

## 实施步骤

### 1. 创建 LangGraph 状态图定义

**文件：** `src/agent/graph/agent.graph.ts`

**任务：**

- 使用 `StateGraph` 创建状态图
- 定义状态通道（channels）映射到 AgentState 字段
- 添加节点：`planner` → `executor`
- 设置入口点为 `planner`
- 添加条件边：planner → executor → END
- 编译并导出图实例

**关键点：**

- 状态通道需要定义 reducer 函数（合并策略）
- 节点函数签名：`(state: AgentState) => Promise<Partial<AgentState>>`
- 条件边函数：`(state: AgentState) => string`（返回下一个节点名称）

### 2. 适配节点函数签名

**文件：** `src/agent/nodes/planner.node.ts` 和 `src/agent/nodes/executor.node.ts`

**任务：**

- 确保节点函数符合 LangGraph 要求
- 当前实现已兼容（接收 AgentState，返回 Partial<AgentState>）
- 可能需要添加错误处理包装

**检查点：**

- Planner Node 的 `execute()` 方法已符合要求
- Executor Node 的 `execute()` 方法已符合要求
- 确保错误时返回包含 `error` 字段的 Partial<AgentState>

### 3. 修改 AgentService 使用 LangGraph

**文件：** `src/agent/agent.service.ts`

**任务：**

- 注入 LangGraph 图实例（通过 AgentModule）
- 修改 `executeWorkflow()` 方法：
  - 使用 `graph.stream()` 进行流式执行
  - 监听状态更新事件
  - 将状态变化转换为 SSE 事件
  - 保持现有的 SSE 事件格式（thought_log, gen_ui_component, stream_end）

**关键实现：**

```typescript




async *executeWorkflow(initialState: AgentState): AsyncGenerator<any> {
  const stream = await this.graph.stream(initialState, { streamMode: 'updates' });
  
  for await (const chunk of stream) {
    // chunk 格式: { nodeName: Partial<AgentState> }
    // 转换为 SSE 事件并 yield
  }
}
```

### 4. 更新 AgentModule 注册图实例

**文件：** `src/agent/agent.module.ts`

**任务：**

- 导入并创建 LangGraph 图实例
- 作为 Provider 注册，供 AgentService 注入使用
- 确保节点依赖正确注入（PlannerNode 需要 LLM_SERVICE）

### 5. 测试验证

**验证点：**

- 使用 Apifox 发送 POST 请求到 `/api/agent/chat`
- 请求体：`{"text": "画只猫"}`
- 验证响应：
  - 收到 `connection` 事件
  - 收到 `thought_log` 事件（planner 节点）
  - 收到 `thought_log` 事件（executor 节点）
  - 收到 `gen_ui_component` 事件（包含图片 URL）
  - 收到 `stream_end` 事件

**预期结果：**

- Planner 解析意图为 `generate_image`
- Executor 生成 Mock 图片 URL（`https://picsum.photos/seed/{seed}/800/600`）
- 返回的 GenUI 组件包含 SmartCanvas、AgentMessage、ActionPanel

## 技术细节

### LangGraph 状态通道配置

根据 `AgentState` 接口，需要定义以下通道：

- `userInput`: 使用替换策略（`(x, y) => y ?? x`）
- `intent`: 使用替换策略
- `generatedImageUrl`: 使用替换策略
- `enhancedPrompt`: 使用替换策略
- `uiComponents`: 使用追加策略（`(x, y) => [...x, ...y]`）
- `thoughtLogs`: 使用追加策略
- `sessionId`: 使用替换策略
- `timestamp`: 使用替换策略
- `error`: 使用替换策略

### 流式执行模式

使用 `streamMode: 'updates'` 获取每个节点的状态更新，而不是完整状态快照。这样可以：

- 实时推送每个节点的执行结果
- 保持与现有 SSE 事件格式的兼容性
- 支持前端实时显示工作流进度

### 错误处理

- 节点执行失败时，返回包含 `error` 字段的 Partial<AgentState>
- AgentService 检测到 `error` 时，推送 `error` 事件并结束流
- 确保不会因为单个节点失败导致整个工作流崩溃

## 文件清单

**新建文件：**

- `src/agent/graph/agent.graph.ts` - LangGraph 状态图定义

**修改文件：**

- `src/agent/agent.service.ts` - 使用 LangGraph 执行工作流
- `src/agent/agent.module.ts` - 注册图实例

**无需修改（已验证兼容）：**

- `src/agent/nodes/planner.node.ts`
- `src/agent/nodes/executor.node.ts`
- `src/agent/interfaces/agent-state.interface.ts`
- `src/agent/agent.controller.ts`