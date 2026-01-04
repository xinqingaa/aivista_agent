# AiVista 文档完善计划

## 目标

完善前后端设计文档，确保技术实现能够还原即梦 AI 的核心工作流逻辑，重点关注：

- 智能画布的完整交互逻辑（缩放、平移、撤销、清除、状态持久化）
- 多模态 Agent 的完整编排（包括 Critic 节点）
- 流式 UI 的生成机制（关键节点思考日志推送）

## 文档完善内容

### 1. 前端文档完善 (`main/app/docs/`)

#### 1.1 创建 `SMART_CANVAS_DESIGN.md`

详细设计智能画布组件，包括：

- **交互手势**：缩放（Pinch）、平移（Pan）、绘制（Draw）
- **蒙版绘制**：路径数据结构、撤销/重做机制、清除功能
- **坐标系统**：屏幕坐标 ↔ 图片逻辑坐标的转换算法
- **状态管理**：CanvasState 数据结构（当前图片、蒙版路径、历史栈）
- **性能优化**：RepaintBoundary 使用、路径缓存策略
- **持久化**：本地存储方案（SharedPreferences/Hive）

#### 1.2 创建 `GENUI_RENDERER_DESIGN.md`

GenUI 渲染器的详细设计：

- **组件工厂模式**：根据 `widgetType` 动态创建 Widget
- **组件类型映射**：SmartCanvas、AgentMessage、ActionPanel 的实现
- **状态更新策略**：追加 vs 替换 vs 更新已有组件
- **流式渲染**：SSE 数据流的解析和实时渲染

#### 1.3 创建 `STATE_MANAGEMENT_DESIGN.md`

状态管理架构：

- **Provider 架构**：ChatState、CanvasState、AgentState 的分离
- **状态同步**：画布状态与 Agent 响应的同步机制
- **历史管理**：操作历史栈的实现（支持撤销/重做）

#### 1.4 更新 `PROMPT_README.md`

补充：

- 项目结构说明
- 核心模块依赖关系
- 开发优先级和里程碑

### 2. 后端文档完善 (`main/server/docs/`)

#### 2.1 创建 `AGENT_WORKFLOW_DESIGN.md`

Agent 工作流的详细设计：

- **LangGraph 状态图**：完整的状态机定义（AgentState 结构）
- **节点详细设计**：
- Planner Node：意图解析、结构化输出格式
- RAG Node：向量检索逻辑、Prompt 增强策略
- Executor Node：任务分发（文生图、局部重绘、参数调整）
- Critic Node：质量审查逻辑、反馈机制
- **节点流转条件**：何时进入下一个节点、错误回退机制
- **多模态输入处理**：文本 + 蒙版数据的协调处理

#### 2.2 创建 `SSE_STREAMING_DESIGN.md`

SSE 流式通信的详细设计：

- **事件类型定义**：thought_log、gen_ui_component、error、progress
- **推送时机**：关键节点（Planner、Executor）的思考日志推送
- **数据格式**：每个事件类型的完整 JSON Schema
- **错误处理**：流中断、重连机制、错误事件推送

#### 2.3 创建 `ERROR_HANDLING_DESIGN.md`

错误处理和边界情况：

- **API 调用失败**：DeepSeek 重试策略、降级方案
- **无效输入处理**：空消息、纯表情、无蒙版的指令
- **状态异常**：画布状态不一致、历史栈溢出
- **用户提示**：友好的错误消息生成

#### 2.4 创建 `DATA_MODELS_DESIGN.md`

数据模型定义：

- **AgentState**：LangGraph 状态结构
- **GenUI Component**：所有组件类型的 TypeScript 接口
- **请求/响应**：SSE 请求格式、蒙版数据传输格式

#### 2.5 更新 `PROMPT_README.md`

补充：

- 模块架构详细说明
- 开发优先级细化
- 测试验证标准

### 3. 补充技术细节文档 (`docs/`)

#### 3.1 创建 `canvas_coordinate_system.md`

画布坐标系统的数学原理：

- 屏幕坐标到图片坐标的转换公式
- 不同缩放比例下的坐标映射
- 蒙版路径的序列化和反序列化

#### 3.2 创建 `agent_state_machine.md`

Agent 状态机的可视化设计：

- 使用 Mermaid 图展示完整的状态流转
- 每个节点的输入/输出定义
- 条件分支的详细说明

## 实施顺序