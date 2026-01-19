# GenUI 通信协议文档 (Generative UI Protocol)

本文档定义了 NestJS 后端与前端（Next.js Web / Flutter 客户端）之间交换的 JSON 数据结构，是前后端协议的统一规范。

## 1. 协议概述

### 1.1 设计原则

- **协议驱动**: 后端定义组件类型和属性，前端根据协议动态渲染
- **类型安全**: 前后端共享相同的类型定义，确保数据一致性
- **可扩展性**: 支持新增组件类型，无需修改核心渲染逻辑

### 1.2 通信方式

使用 Server-Sent Events (SSE) 实现服务端到客户端的单向流式推送。

```
客户端 --POST--> /api/agent/chat (发送用户消息)
服务端 --SSE-->  客户端 (流式推送事件)
```

## 2. SSE 事件类型

### 2.1 事件类型枚举

| 事件类型 | 说明 | 前端处理 |
|---------|------|---------|
| `connection` | 连接确认 | 更新连接状态 |
| `thought_log` | Agent 思考日志 | 渲染 ThoughtLogItem |
| `enhanced_prompt` | RAG 增强 Prompt | 渲染 EnhancedPromptView |
| `gen_ui_component` | GenUI 组件 | 根据 widgetType 渲染对应组件 |
| `progress` | 进度更新 | 更新进度条 |
| `error` | 错误信息 | 显示错误提示 |
| `stream_end` | 流结束 | 结束处理状态 |
| `heartbeat` | 心跳保活 | 维持连接 |

### 2.2 基础事件结构

每一个 SSE 事件的 Payload 都遵循此结构：

```json
{
  "type": "event_type",
  "timestamp": 1709888888,
  "data": { ... }
}
```

## 3. 事件数据定义

### 3.1 thought_log 事件

Agent 思考过程的日志，用于展示 AI 的推理步骤。

```json
{
  "type": "thought_log",
  "timestamp": 1709888888,
  "data": {
    "node": "planner",
    "message": "正在分析用户意图...",
    "progress": 50,
    "metadata": {
      "action": "generate_image",
      "confidence": 0.95
    }
  }
}
```

**node 字段枚举**:
- `planner`: 意图识别节点
- `rag`: 风格检索节点
- `executor`: 任务执行节点
- `critic`: 质量审查节点
- `genui`: 界面生成节点

### 3.2 enhanced_prompt 事件

RAG 检索结果和增强后的 Prompt。

```json
{
  "type": "enhanced_prompt",
  "timestamp": 1709888888,
  "data": {
    "original": "画一座赛博朋克风格的城市",
    "retrieved": [
      {
        "style": "赛博朋克",
        "prompt": "neon lights, futuristic cityscape, cyberpunk aesthetic...",
        "similarity": 0.92
      }
    ],
    "final": "A cyberpunk style city with neon lights, futuristic buildings..."
  }
}
```

### 3.3 gen_ui_component 事件

通用 GenUI 组件事件，支持多种组件类型。

```json
{
  "type": "gen_ui_component",
  "timestamp": 1709888888,
  "data": {
    "id": "component-uuid",
    "widgetType": "ImageView",
    "props": { ... },
    "updateMode": "append",
    "targetId": null
  }
}
```

**updateMode 说明**:
- `append`: 追加到组件列表末尾（默认）
- `replace`: 替换指定 ID 的组件
- `update`: 更新指定 ID 组件的部分属性

## 4. 组件定义 (widgetType)

### 4.1 SmartCanvas - 智能画布

当 Agent 想要展示图片或允许用户进行修图/重绘时使用。

```json
{
  "widgetType": "SmartCanvas",
  "props": {
    "imageUrl": "https://example.com/image.jpg",
    "mode": "view",
    "ratio": 1.5
  }
}
```

| 属性 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| imageUrl | string | 是 | 图片 URL |
| mode | "view" \| "draw_mask" | 是 | 查看模式或绘制蒙版模式 |
| ratio | number | 否 | 图片宽高比 |

### 4.2 ImageView - 图片展示

简单的图片展示组件，支持下载和查看操作。

```json
{
  "widgetType": "ImageView",
  "props": {
    "imageUrl": "https://example.com/image.jpg",
    "prompt": "生成图片的提示词",
    "alt": "图片描述",
    "actions": []
  }
}
```

| 属性 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| imageUrl | string | 是 | 图片 URL |
| prompt | string | 否 | 生成图片的提示词 |
| alt | string | 否 | 图片替代文本 |
| width | number | 否 | 图片宽度 |
| height | number | 否 | 图片高度 |
| fit | "contain" \| "cover" \| "fill" | 否 | 图片填充模式 |
| actions | ActionItem[] | 否 | 关联的操作按钮 |

### 4.3 AgentMessage - Agent 消息气泡

标准的文本回复组件。

```json
{
  "widgetType": "AgentMessage",
  "props": {
    "text": "我已经为您生成了一座赛博朋克风格的城市。",
    "state": "success",
    "isThinking": false,
    "metadata": {
      "node": "executor"
    }
  }
}
```

| 属性 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| text | string | 是 | 消息文本 |
| state | "success" \| "loading" \| "failed" | 否 | 消息状态 |
| isThinking | boolean | 否 | 是否显示思考动画 |
| metadata | object | 否 | 额外元数据 |

### 4.4 ActionPanel - 操作面板

用于展示滑块、按钮或选择器，由 Agent 根据当前任务动态生成。

```json
{
  "widgetType": "ActionPanel",
  "props": {
    "actions": [
      {
        "id": "regenerate_btn",
        "label": "重新生成",
        "type": "button",
        "buttonType": "primary"
      },
      {
        "id": "style_strength",
        "label": "风格化强度",
        "type": "slider",
        "min": 0,
        "max": 100,
        "value": 50
      }
    ],
    "metadata": {
      "context": "image_generation"
    }
  }
}
```

**ActionItem 定义**:

| 属性 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| id | string | 是 | 操作唯一标识 |
| label | string | 是 | 显示标签 |
| type | "button" \| "slider" \| "select" \| "input" | 是 | 操作类型 |
| buttonType | "primary" \| "secondary" \| "outline" \| "danger" | 否 | 按钮样式 |
| disabled | boolean | 否 | 是否禁用 |
| value | any | 否 | 当前值 |
| min | number | 否 | 最小值（slider） |
| max | number | 否 | 最大值（slider） |
| step | number | 否 | 步进值（slider） |
| options | Array<{value, label}> | 否 | 选项列表（select） |
| placeholder | string | 否 | 占位文本（input） |

### 4.5 ThoughtLogItem - 思考日志项

展示 Agent 节点的思考过程（前端内部组件，由 thought_log 事件触发）。

```json
{
  "widgetType": "ThoughtLogItem",
  "props": {
    "node": "planner",
    "message": "正在分析用户意图...",
    "progress": 50,
    "metadata": {
      "action": "generate_image",
      "confidence": 0.95
    },
    "timestamp": 1709888888,
    "isLast": false
  }
}
```

| 属性 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| node | string | 是 | 节点名称 |
| message | string | 是 | 日志消息 |
| progress | number | 否 | 进度百分比 (0-100) |
| metadata | object | 否 | 额外元数据 |
| timestamp | number | 否 | 时间戳 |
| isLast | boolean | 否 | 是否为最后一项（用于时间轴渲染） |

### 4.6 EnhancedPromptView - 增强 Prompt 展示

展示 RAG 检索结果和增强后的 Prompt（前端内部组件，由 enhanced_prompt 事件触发）。

```json
{
  "widgetType": "EnhancedPromptView",
  "props": {
    "original": "画一座赛博朋克风格的城市",
    "retrieved": [
      {
        "style": "赛博朋克",
        "prompt": "neon lights, futuristic cityscape...",
        "similarity": 0.92
      }
    ],
    "final": "A cyberpunk style city with neon lights..."
  }
}
```

| 属性 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| original | string | 是 | 原始用户输入 |
| retrieved | Array | 是 | RAG 检索结果列表 |
| retrieved[].style | string | 是 | 风格名称 |
| retrieved[].prompt | string | 是 | 参考提示词 |
| retrieved[].similarity | number | 是 | 相似度分数 |
| final | string | 是 | 最终增强后的 Prompt |

## 5. 前后端类型映射

### 5.1 事件到组件映射

| 后端事件类型 | 前端 widgetType | Props 接口 (TypeScript) |
|-------------|----------------|------------------------|
| `thought_log` | `ThoughtLogItem` | `ThoughtLogItemProps` |
| `enhanced_prompt` | `EnhancedPromptView` | `EnhancedPromptViewProps` |
| `gen_ui_component` (widgetType: SmartCanvas) | `SmartCanvas` | `SmartCanvasProps` |
| `gen_ui_component` (widgetType: ImageView) | `ImageView` | `ImageViewProps` |
| `gen_ui_component` (widgetType: AgentMessage) | `AgentMessage` | `AgentMessageProps` |
| `gen_ui_component` (widgetType: ActionPanel) | `ActionPanel` | `ActionPanelProps` |

### 5.2 前端类型定义位置

- **类型定义**: `main/web/lib/types/genui.ts`
- **SSE 类型**: `main/web/lib/types/sse.ts`
- **组件实现**: `main/web/components/genui/components/`

## 6. 数据流示意

```
┌─────────────────────────────────────────────────────────────────────┐
│                          NestJS Backend                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    LangGraph Workflow                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐        │   │
│  │  │ Planner │→ │   RAG   │→ │ Executor │→ │ Critic │        │   │
│  │  └────┬────┘  └────┬────┘  └────┬─────┘  └────┬───┘        │   │
│  │       │            │            │             │             │   │
│  │       ▼            ▼            ▼             ▼             │   │
│  │  thought_log  enhanced_   gen_ui_component  thought_log    │   │
│  │              prompt      (ImageView)                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│                         SSE Stream                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    useAgentChat Hook                         │   │
│  │  ┌────────────────┐  ┌───────────────┐  ┌───────────────┐   │   │
│  │  │ onThoughtLog   │  │onEnhancedPrompt│ │onGenUIComponent│   │   │
│  │  └───────┬────────┘  └───────┬───────┘  └───────┬───────┘   │   │
│  │          │                   │                  │            │   │
│  │          ▼                   ▼                  ▼            │   │
│  │       addGenUIComponent(ThoughtLogItem/EnhancedPromptView/...) │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   genUIComponents State                      │   │
│  │  [ThoughtLogItem, ThoughtLogItem, EnhancedPromptView, ...]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    GenUIRenderer                             │   │
│  │  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐       │   │
│  │  │GenUIRegistry │→ │Get Component│→ │Render Component│       │   │
│  │  └──────────────┘  └─────────────┘  └───────────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 7. 错误处理

### 7.1 error 事件

```json
{
  "type": "error",
  "timestamp": 1709888888,
  "data": {
    "code": "INTENT_UNKNOWN",
    "message": "无法识别用户意图",
    "node": "planner",
    "details": "..."
  }
}
```

### 7.2 错误码枚举

| 错误码 | 说明 |
|-------|------|
| `INTENT_UNKNOWN` | 无法识别用户意图 |
| `RAG_FAILED` | RAG 检索失败 |
| `EXECUTION_FAILED` | 任务执行失败 |
| `QUALITY_CHECK_FAILED` | 质量检查未通过 |
| `WORKFLOW_ERROR` | 工作流执行错误 |

## 8. 扩展指南

### 8.1 添加新组件类型

1. **后端**: 在 Agent 节点中定义新的 GenUI 组件事件
2. **协议**: 在本文档中添加组件定义
3. **前端类型**: 在 `lib/types/genui.ts` 中添加类型定义
4. **前端组件**: 在 `components/genui/components/` 中实现组件
5. **注册组件**: 在 `components/genui/index.ts` 中注册到 GenUIRegistry

### 8.2 版本兼容

- 新增组件类型不影响旧版本客户端
- 前端应优雅处理未知组件类型
- 使用 `updateMode` 实现增量更新

## 9. 相关文档

- [前端 GenUI 组件系统](main/web/docs/components/GENUI_COMPONENTS.md)
- [前端 SSE 客户端实现](main/web/docs/api/SSE_CLIENT.md)
- [Agent 工作流设计](docs/architecture.md)
