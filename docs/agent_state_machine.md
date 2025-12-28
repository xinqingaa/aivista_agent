# Agent 状态机可视化文档 (Agent State Machine)

## 1. 目标

本文档使用 Mermaid 图表可视化 AiVista Agent 的完整状态流转过程，帮助理解工作流的执行逻辑和条件分支。

**核心目标：**
- 可视化完整的状态流转图
- 明确每个节点的输入/输出定义
- 说明条件分支和错误回退机制

## 2. 完整状态流转图

### 2.1 主流程图

```mermaid
graph TD
    Start([用户请求]) --> ValidateInput[输入验证]
    ValidateInput -->|验证通过| Planner[Planner Node<br/>意图解析]
    ValidateInput -->|验证失败| ErrorHandler[错误处理]
    
    Planner -->|解析成功| CheckStyle{是否有风格关键词?}
    Planner -->|解析失败| ErrorHandler
    
    CheckStyle -->|是| RAG[RAG Node<br/>风格检索]
    CheckStyle -->|否| Executor[Executor Node<br/>任务执行]
    
    RAG -->|检索成功| Executor
    RAG -->|检索失败| Executor
    
    Executor -->|执行成功| Critic[Critic Node<br/>质量审查]
    Executor -->|执行失败| ErrorHandler
    
    Critic -->|通过审查| GenUI[GenUI 生成]
    Critic -->|未通过| CheckRetry{是否需要重试?}
    
    CheckRetry -->|是, 重试次数<3| RAG
    CheckRetry -->|否| GenUI
    
    GenUI --> StreamEnd[流结束]
    ErrorHandler --> StreamEnd
    
    style Planner fill:#4a90e2
    style RAG fill:#7b68ee
    style Executor fill:#50c878
    style Critic fill:#ff6b6b
    style ErrorHandler fill:#ffa500
    style GenUI fill:#9b59b6
```

### 2.2 节点详细流程图

```mermaid
graph LR
    subgraph PlannerNode [Planner Node 内部流程]
        P1[接收用户输入] --> P2{是否有蒙版数据?}
        P2 -->|是| P3[强制设置为 inpainting]
        P2 -->|否| P4[调用 DeepSeek API]
        P3 --> P4
        P4 --> P5[解析 JSON 响应]
        P5 --> P6[验证意图结构]
        P6 --> P7[推送思考日志]
        P7 --> P8[输出 IntentResult]
    end
    
    subgraph RAGNode [RAG Node 内部流程]
        R1[提取风格关键词] --> R2[向量检索]
        R2 --> R3{检索到结果?}
        R3 -->|是| R4[拼接增强 Prompt]
        R3 -->|否| R5[使用原始 Prompt]
        R4 --> R6[推送思考日志]
        R5 --> R6
        R6 --> R7[输出 EnhancedPrompt]
    end
    
    subgraph ExecutorNode [Executor Node 内部流程]
        E1[接收意图和 Prompt] --> E2{任务类型?}
        E2 -->|generate_image| E3[文生图执行]
        E2 -->|inpainting| E4[局部重绘执行]
        E2 -->|parameter_adjustment| E5[参数调整执行]
        E3 --> E6[模拟延迟 2-3s]
        E4 --> E7[模拟延迟 3-4s]
        E5 --> E8[模拟延迟 2s]
        E6 --> E9[生成图片 URL]
        E7 --> E9
        E8 --> E9
        E9 --> E10[生成 GenUI 组件]
        E10 --> E11[推送思考日志]
        E11 --> E12[输出 ExecutionResult]
    end
    
    subgraph CriticNode [Critic Node 内部流程]
        C1[接收执行结果] --> C2[质量评估]
        C2 --> C3{质量分数?}
        C3 -->|< 0.6| C4[未通过, 建议重试]
        C3 -->|0.6-0.8| C5[通过, 可优化]
        C3 -->|> 0.8| C6[优秀]
        C4 --> C7[生成建议性 UI]
        C5 --> C7
        C6 --> C8[输出最终结果]
        C7 --> C8
    end
```

## 3. 状态定义

### 3.1 AgentState 状态字段

```mermaid
classDiagram
    class AgentState {
        +string userMessage
        +string? maskData
        +string? currentImageUrl
        +IntentResult? intent
        +string? enhancedPrompt
        +string? generatedImageUrl
        +CriticFeedback? criticFeedback
        +GenUIComponent[] uiComponents
        +ThoughtLog[] thoughtLogs
        +string sessionId
        +number timestamp
        +ErrorInfo? error
    }
    
    class IntentResult {
        +string action
        +string subject
        +string? style
        +string prompt
        +object? parameters
        +number confidence
    }
    
    class CriticFeedback {
        +boolean passed
        +number score
        +string[]? suggestions
        +boolean needsRegeneration
    }
    
    class GenUIComponent {
        +string? id
        +string widgetType
        +object props
        +string? updateMode
    }
    
    AgentState --> IntentResult
    AgentState --> CriticFeedback
    AgentState --> GenUIComponent
```

## 4. 节点输入/输出定义

### 4.1 Planner Node

**输入：**
- `userMessage: string` - 用户文本输入
- `maskData?: string` - 可选的蒙版数据（Base64）
- `currentImageUrl?: string` - 当前画布图片 URL

**输出：**
- `intent: IntentResult` - 结构化的意图结果
- `thoughtLog: ThoughtLog` - 思考日志

**条件分支：**
```mermaid
graph TD
    PInput[Planner 输入] --> PCheck{有蒙版数据?}
    PCheck -->|是| PForceInpaint[强制 action=inpainting]
    PCheck -->|否| PCallAPI[调用 DeepSeek]
    PForceInpaint --> PCallAPI
    PCallAPI --> PParse[解析 JSON]
    PParse --> PValidate{验证成功?}
    PValidate -->|是| POutput[输出 IntentResult]
    PValidate -->|否| PError[返回错误]
```

### 4.2 RAG Node

**输入：**
- `intent: IntentResult` - Planner 节点的输出
- `intent.style?: string` - 风格关键词

**输出：**
- `enhancedPrompt: string` - 增强后的完整 Prompt
- `thoughtLog?: ThoughtLog` - 思考日志（如果有检索结果）

**条件分支：**
```mermaid
graph TD
    RInput[RAG 输入] --> RCheck{有风格关键词?}
    RCheck -->|是| RSearch[向量检索]
    RCheck -->|否| RSkip[跳过, 使用原始 Prompt]
    RSearch --> RResult{检索到结果?}
    RResult -->|是| REnhance[拼接增强 Prompt]
    RResult -->|否| RUseOriginal[使用原始 Prompt]
    REnhance --> ROutput[输出 EnhancedPrompt]
    RUseOriginal --> ROutput
    RSkip --> ROutput
```

### 4.3 Executor Node

**输入：**
- `intent: IntentResult` - 用户意图
- `enhancedPrompt: string` - 增强后的 Prompt
- `maskData?: string` - 蒙版数据（inpainting 时使用）
- `currentImageUrl?: string` - 当前图片 URL（编辑任务时使用）

**输出：**
- `generatedImageUrl: string` - 生成的图片 URL
- `uiComponents: GenUIComponent[]` - GenUI 组件数组
- `thoughtLog: ThoughtLog` - 思考日志

**任务分发：**
```mermaid
graph TD
    EInput[Executor 输入] --> ECheck{intent.action?}
    ECheck -->|generate_image| EText2Img[文生图任务]
    ECheck -->|inpainting| EInpaint[局部重绘任务]
    ECheck -->|parameter_adjustment| EAdjust[参数调整任务]
    
    EText2Img --> EDelay1[延迟 2-3s]
    EInpaint --> EDelay2[延迟 3-4s]
    EAdjust --> EDelay3[延迟 2s]
    
    EDelay1 --> EGenerate[生成图片 URL]
    EDelay2 --> EGenerate
    EDelay3 --> EGenerate
    
    EGenerate --> EGenUI[生成 GenUI 组件]
    EGenUI --> EOutput[输出 ExecutionResult]
```

### 4.4 Critic Node

**输入：**
- `generatedImageUrl: string` - 生成的图片 URL
- `intent: IntentResult` - 原始意图
- `enhancedPrompt: string` - 使用的 Prompt

**输出：**
- `criticFeedback: CriticFeedback` - 审查反馈
- `uiComponents: GenUIComponent[]` - 更新的 UI 组件（包含建议）

**质量评估流程：**
```mermaid
graph TD
    CInput[Critic 输入] --> CEval[质量评估]
    CEval --> CScore{质量分数}
    CScore -->|< 0.6| CLow[质量不足]
    CScore -->|0.6-0.8| CMedium[质量尚可]
    CScore -->|> 0.8| CHigh[质量优秀]
    
    CLow --> CFeedback1[passed=false, needsRegeneration=true]
    CMedium --> CFeedback2[passed=true, needsRegeneration=false]
    CHigh --> CFeedback3[passed=true, needsRegeneration=false]
    
    CFeedback1 --> CGenUI1[生成建议性 UI + 重试按钮]
    CFeedback2 --> CGenUI2[生成优化建议]
    CFeedback3 --> CGenUI3[生成成功消息]
    
    CGenUI1 --> COutput[输出 CriticFeedback]
    CGenUI2 --> COutput
    CGenUI3 --> COutput
```

## 5. 条件分支详细说明

### 5.1 风格检索分支

```mermaid
graph LR
    A[Planner 输出] --> B{intent.style 存在?}
    B -->|是| C[进入 RAG Node]
    B -->|否| D[跳过 RAG Node]
    D --> E[直接使用 intent.prompt]
    C --> F[检索风格库]
    F --> G[增强 Prompt]
    E --> H[进入 Executor]
    G --> H
```

### 5.2 质量审查重试分支

```mermaid
graph TD
    A[Critic 输出] --> B{needsRegeneration?}
    B -->|是| C{retryCount < 3?}
    B -->|否| D[进入 GenUI]
    C -->|是| E[重试计数+1]
    C -->|否| D
    E --> F[返回 RAG Node]
    F --> G[重新执行流程]
```

### 5.3 错误回退分支

```mermaid
graph TD
    A[节点执行] --> B{执行成功?}
    B -->|是| C[继续下一个节点]
    B -->|否| D{错误类型?}
    D -->|可恢复| E[降级处理]
    D -->|不可恢复| F[进入 ErrorHandler]
    E --> C
    F --> G[推送错误消息]
    G --> H[流结束]
```

## 6. 多模态输入处理流程

### 6.1 文本 + 蒙版协调

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端
    participant Planner as Planner Node
    participant Executor as Executor Node
    
    User->>Frontend: 绘制蒙版 + 输入文本
    Frontend->>Planner: 发送请求 (text + maskData)
    Planner->>Planner: 检测到 maskData
    Planner->>Planner: 强制 action=inpainting
    Planner->>Planner: 解析文本指令
    Planner->>Executor: 输出 IntentResult
    Executor->>Executor: 执行局部重绘
    Executor->>Frontend: 返回新图片
```

## 7. SSE 事件推送时机

### 7.1 事件推送流程图

```mermaid
graph TD
    Start[工作流开始] --> P1[Planner 开始]
    P1 --> P2[推送 thought_log: 正在分析意图...]
    P2 --> P3[Planner 完成]
    P3 --> P4[推送 thought_log: 已识别意图]
    
    P4 --> R1{RAG Node?}
    R1 -->|是| R2[推送 thought_log: 正在检索风格库...]
    R2 --> R3[RAG 完成]
    R3 --> R4[推送 thought_log: 检索结果]
    R4 --> E1
    R1 -->|否| E1
    
    E1[Executor 开始] --> E2[推送 thought_log: 开始执行任务...]
    E2 --> E3[推送 progress: 执行中...]
    E3 --> E4[Executor 完成]
    E4 --> E5[推送 gen_ui_component: SmartCanvas]
    
    E5 --> C1[Critic 开始]
    C1 --> C2[推送 thought_log: 开始质量审查...]
    C2 --> C3[Critic 完成]
    C3 --> C4[推送 thought_log: 审查完成]
    C4 --> C5[推送 gen_ui_component: ActionPanel]
    
    C5 --> End[推送 stream_end]
```

## 8. 状态转换表

| 当前状态 | 事件/条件 | 下一状态 | 说明 |
|---------|----------|---------|------|
| START | 用户请求 | ValidateInput | 开始工作流 |
| ValidateInput | 验证通过 | Planner | 进入意图解析 |
| ValidateInput | 验证失败 | ErrorHandler | 输入无效 |
| Planner | 解析成功 | RAG/Executor | 根据是否有风格关键词决定 |
| Planner | 解析失败 | ErrorHandler | API 调用失败或解析错误 |
| RAG | 检索完成 | Executor | 无论是否检索到结果都继续 |
| Executor | 执行成功 | Critic | 进入质量审查 |
| Executor | 执行失败 | ErrorHandler | 任务执行异常 |
| Critic | 通过审查 | GenUI | 生成最终 UI |
| Critic | 未通过且可重试 | RAG | 重新执行（最多 3 次） |
| Critic | 未通过且不可重试 | GenUI | 返回结果但提示优化 |
| GenUI | 组件生成完成 | StreamEnd | 工作流结束 |
| ErrorHandler | 错误处理完成 | StreamEnd | 推送错误消息后结束 |

## 9. 错误处理流程

### 9.1 错误类型与处理策略

```mermaid
graph TD
    Error[发生错误] --> Type{错误类型?}
    
    Type -->|API_ERROR| Retry{可重试?}
    Type -->|VALIDATION_ERROR| UserMsg[返回用户友好提示]
    Type -->|RESOURCE_ERROR| Degrade[降级处理]
    Type -->|UNKNOWN_ERROR| Log[记录日志并返回通用错误]
    
    Retry -->|是| RetryLogic[重试逻辑]
    Retry -->|否| UserMsg
    
    RetryLogic --> RetryCheck{重试次数 < 最大次数?}
    RetryCheck -->|是| RetryExec[重新执行]
    RetryCheck -->|否| UserMsg
    
    Degrade --> Continue[继续执行]
    UserMsg --> End[推送错误事件]
    Log --> End
    RetryExec --> End
    Continue --> End
```

## 10. 性能优化点

### 10.1 并发控制

```mermaid
graph TD
    Request[新请求] --> Check{当前会话有正在执行的工作流?}
    Check -->|是| Queue[加入队列]
    Check -->|否| Execute[立即执行]
    Queue --> Wait[等待当前工作流完成]
    Wait --> Execute
    Execute --> Complete[完成]
```

### 10.2 缓存策略

```mermaid
graph LR
    A[请求] --> B{缓存命中?}
    B -->|是| C[返回缓存结果]
    B -->|否| D[执行节点]
    D --> E[保存到缓存]
    E --> F[返回结果]
```

## 11. 完整工作流示例

### 11.1 文生图流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant P as Planner
    participant R as RAG
    participant E as Executor
    participant C as Critic
    
    U->>F: "生成一只赛博朋克风格的猫"
    F->>P: 发送请求
    P->>F: thought_log: 正在分析意图...
    P->>P: 调用 DeepSeek API
    P->>F: thought_log: 已识别意图: generate_image
    P->>R: 传递 IntentResult (style: "cyberpunk")
    
    R->>F: thought_log: 正在检索风格库...
    R->>R: 向量检索
    R->>F: thought_log: 检索到相关风格
    R->>E: 传递 EnhancedPrompt
    
    E->>F: thought_log: 开始执行任务...
    E->>F: progress: 生成中...
    E->>E: 模拟生成 (2-3s)
    E->>F: gen_ui_component: SmartCanvas
    E->>C: 传递 ExecutionResult
    
    C->>F: thought_log: 开始质量审查...
    C->>C: 质量评估
    C->>F: thought_log: 审查完成, 评分: 85/100
    C->>F: gen_ui_component: ActionPanel
    C->>F: stream_end
```

### 11.2 局部重绘流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant P as Planner
    participant E as Executor
    participant C as Critic
    
    U->>F: 绘制蒙版 + "换成机械头盔"
    F->>P: 发送请求 (text + maskData)
    P->>F: thought_log: 检测到蒙版数据
    P->>P: 强制 action=inpainting
    P->>F: thought_log: 已识别意图: inpainting
    P->>E: 传递 IntentResult + maskData
    
    E->>F: thought_log: 开始执行局部重绘...
    E->>F: progress: 处理中...
    E->>E: 模拟生成 (3-4s)
    E->>F: gen_ui_component: SmartCanvas (新图片)
    E->>C: 传递 ExecutionResult
    
    C->>F: thought_log: 审查完成
    C->>F: gen_ui_component: AgentMessage
    C->>F: stream_end
```

## 12. 状态机实现要点

### 12.1 LangGraph 图构建

```typescript
// 伪代码示例
const workflow = new StateGraph<AgentState>({
  channels: {
    userMessage: { reducer: (x, y) => y ?? x },
    intent: { reducer: (x, y) => y ?? x },
    enhancedPrompt: { reducer: (x, y) => y ?? x },
    // ... 其他字段
  }
});

// 添加节点
workflow.addNode('planner', plannerNode);
workflow.addNode('rag', ragNode);
workflow.addNode('executor', executorNode);
workflow.addNode('critic', criticNode);
workflow.addNode('genui', genUINode);
workflow.addNode('error_handler', errorHandlerNode);

// 设置入口
workflow.setEntryPoint('planner');

// 添加条件边
workflow.addConditionalEdges('planner', shouldContinueToRAG);
workflow.addConditionalEdges('rag', shouldContinueToExecutor);
workflow.addConditionalEdges('executor', shouldContinueToCritic);
workflow.addConditionalEdges('critic', shouldContinueToGenUI);
```

### 12.2 条件函数示例

```typescript
function shouldContinueToRAG(state: AgentState): string {
  if (state.error) return 'error_handler';
  if (state.intent?.style && state.intent.style.trim() !== '') {
    return 'rag';
  }
  return 'executor'; // 跳过 RAG
}

function shouldContinueToGenUI(state: AgentState): string {
  if (state.error) return 'error_handler';
  if (state.criticFeedback?.needsRegeneration && state.metadata.retryCount < 3) {
    return 'rag'; // 重试
  }
  return 'genui';
}
```

