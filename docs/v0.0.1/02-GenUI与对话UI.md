# GenUI 与对话 UI

## 一、GenUI 组件（AgentMessage / ActionPanel）

### 需求

- **ActionPanel 独立**：不与 ImageView 合并，作为独立组件放在对话区域最底部；扩展按钮：下载、预览、重新生成；按钮显示 Icon，悬浮显示中文文案。
- **AgentMessage**：展示文本、state（success/loading/failed）、可选 isThinking 动画。
- **ImageView**：移除无 actions 时的默认下载/查看按钮，仅保留纯图片与可选 prompt。
- **布局**：ThoughtLog → EnhancedPrompt → ImageView(s) → AgentMessage(s) → ActionPanel（底部）。

### 涉及文件

- 类型：[main/web/lib/types/genui.ts](main/web/lib/types/genui.ts) ActionItem 增加 `icon?: string`
- 组件：[main/web/genui/components/agent-message.tsx](main/web/genui/components/agent-message.tsx)、[action-panel.tsx](main/web/genui/components/action-panel.tsx)、[image-view.tsx](main/web/genui/components/image-view.tsx)（移除默认操作按钮）
- 后端：[main/server/src/agent/nodes/executor.node.ts](main/server/src/agent/nodes/executor.node.ts) 扩展 ActionPanel.actions（download/preview/regenerate）

---

## 二、多轮对话

### 行为

- 第二轮发送时保留第一轮思考与结果，追加第二轮内容。
- 第二轮文生图：请求携带历轮原始提示词（previousPrompts），不使用 enhancedPrompt.final。

### 实现要点

- 前端：`sendMessage(text, { previousPrompts })`，handleSend 时 `previousPrompts = messages.filter(m => m.role === 'user').map(m => m.content)`（不含当前输入）。
- 后端：ChatRequestDto 增加 `previousPrompts?: string[]`；executor 中当 `previousPrompts?.length > 0` 时 `prompt = [...previousPrompts, userInput.text].join('\n')`。
- 保存：每轮一条 assistant 消息，onChatEnd 只保存本轮新增的 genUIComponents。

---

## 三、重新生成时清空旧回答

### 现象与根因

点击「重新生成」后页面同时出现两条 AI 回答（旧 + 新流式）。原因：turns 中上一轮的 assistant 未被移除，新流式写入 streamingComponents，渲染时 turns 的 assistant1 + streamingComponents 新回答一起显示。

### 修复

在 genui-action 的 regenerate 逻辑中，**在调用 sendMessage 之前**，从 turns 中移除最后一个 assistant turn：

```typescript
if (lastUser?.content) {
  const previousPrompts = userTurns.map((t) => t.content);
  setTurns((prev) => {
    const next = [...prev];
    if (next[next.length - 1]?.role === 'assistant') next.pop();
    return next;
  });
  sendMessage(lastUser.content, { previousPrompts });
}
```

---

## 四、Chat UI 微调

- **ActionPanel 按钮**：强制正方形，如 `className="h-9 w-9 min-w-9 aspect-square shrink-0"`。
- **多轮布局**：目标为「问题1 → 回答1 → 问题2 → 回答2」。若采用按轮次数据结构（turns / ConversationTurn），渲染按轮展示用户消息 + 对应 GenUI 块；加载时可将 messages 聚合为轮次或保持扁平按 role 拆分后按序交错渲染。

---

## 五、SmartCanvas（后续）

- 协议支持 SmartCanvas；当前 Executor 仅返回 AgentMessage、ImageView、ActionPanel。
- 前端：新建 [main/web/genui/components/smart-canvas.tsx](main/web/genui/components/smart-canvas.tsx)，实现 view/draw_mask、蒙版导出，并在 genui/index.ts 注册。
- 后端：inpainting 时可在 Executor 中返回 SmartCanvas 替代 ImageView，与前端实现同步。
