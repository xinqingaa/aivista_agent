# GenUI 通信协议文档 (Generative UI Protocol)

本文档定义了 NestJS 后端与 Flutter 前端之间交换的 JSON 数据结构。

## 1. 基础响应结构
每一个 SSE 事件的 Payload 都遵循此结构：

```json
{
  "type": "gen_ui_component", // 或 "thought_log" (思考日志)
  "timestamp": 1709888888,
  "data": { ... } // 根据 widgetType 变化的动态内容
}
```
## 2. 组件定义 ("data" 字段详情)

### 2.1 智能画布 (SmartCanvas - 核心组件)
当 Agent 想要展示图片或允许用户进行修图/重绘时使用。

```json
{
  "widgetType": "SmartCanvas",
  "props": {
    "imageUrl": "[https://picsum.photos/seed/123/800/600](https://picsum.photos/seed/123/800/600)",
    "mode": "view", // "view" (查看模式) | "draw_mask" (绘制蒙版模式)
    "ratio": 1.5 // 可选
  }
}
```
### 2.2 Agent 消息气泡 (AgentMessage)
标准的文本回复组件。

```json
{
  "widgetType": "AgentMessage",
  "props": {
    "state": "success", // 可选loading、failed等
    "text": "我已经为您生成了一座赛博朋克风格的城市。您可以圈选您想要修改的区域。",
    "isThinking": false // 是否显示加载动画
  }
}
```
### 2.3 操作面板 (ActionPanel - 动态交互)
用于展示滑块、按钮或选择器，由 Agent 根据当前任务动态生成。

```json
{
  "widgetType": "ActionPanel",
  "props": {
    "actions": [
      {
        "id": "regenerate_btn",
        "label": "重新生成",
        "type": "button"
      },
      {
        "id": "style_strength",
        "label": "风格化强度",
        "type": "slider",
        "min": 0,
        "max": 100
      }
    ]
  }
}
```
