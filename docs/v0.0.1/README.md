# v0.0.1 前端会话与 UI 优化文档

本目录为 v0.0.1 阶段前端（main/web）会话管理、AI 回复缓存、GenUI 与侧边栏等改动的整合文档，由原 `.cursor/plans` 中的多份计划合并精简而成。

## 文档索引

| 文档 | 内容概要 |
|------|----------|
| [01-会话与AI回复缓存](01-会话与AI回复缓存.md) | AI 回复未保存根因（闭包/ref）、ref 同步更新、加载竞态、sessionIdWhenSendRef |
| [02-GenUI与对话UI](02-GenUI与对话UI.md) | GenUI 组件（AgentMessage/ActionPanel）、多轮对话、重新生成清空、Chat UI 微调 |
| [03-侧边栏与会话项](03-侧边栏与会话项.md) | 侧边栏收起布局、lastMessage 显示、SessionItem 编辑/删除、标题与时间逻辑 |

## 涉及主要文件

- **会话与聊天**：`main/web/components/chat/chat-interface.tsx`、`main/web/hooks/use-sse.ts`、`main/web/lib/sse/sse-client.ts`
- **消息持久化**：`main/web/lib/services/message-service.ts`、`main/web/lib/db/database.ts`
- **会话状态**：`main/web/stores/session-store.ts`
- **侧边栏与会话项**：`main/web/components/layout/sidebar.tsx`、`main/web/components/layout/session-item.tsx`
- **GenUI**：`main/web/genui/`、`main/web/lib/types/genui.ts`
