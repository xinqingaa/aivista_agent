# 开发路线图

## 当前状态

✅ **Milestone 3 已完成**：
- ✅ 基础 Agent 工作流（Planner + RAG + Executor）
- ✅ LLM 服务集成（支持阿里云、DeepSeek、OpenAI，动态切换）
- ✅ RAG 节点实现（LanceDB 向量数据库集成）
- ✅ 知识库初始化（5 条默认风格数据）
- ✅ Embedding 服务集成（支持阿里云、OpenAI，动态切换）
- ✅ SSE 流式响应
- ✅ Swagger API 文档
- ✅ 基础错误处理
- ✅ 知识库管理 API

✅ **Milestone 4 已完成**：
- ✅ Critic Node（质量审查节点）
- ✅ 循环重试机制（最多 3 次重试）
- ✅ 工作流图更新（Planner → RAG → Executor → Critic）
- ✅ 配置项添加（CRITIC_TIMEOUT、CRITIC_PASS_THRESHOLD、MAX_RETRY_COUNT）
- ✅ 支持简化版本和 LLM 真实审查两种模式

## 下一步开发任务

### 1. 完善错误处理和重试机制 🟡 中优先级

### 2. 添加单元测试和集成测试 🟢 低优先级

**目标**：提高系统的健壮性和用户体验。

**任务清单**：
- [ ] 实现 LLM API 调用重试机制（指数退避）
- [ ] 添加超时处理
- [ ] 完善错误消息（用户友好）
- [ ] 实现错误恢复机制
- [ ] 添加错误日志和监控

**相关文档**：
- [错误处理设计](../design/ERROR_HANDLING_DESIGN.md) - 错误处理设计

**预计工作量**：1-2 天

### 3. 前端集成（Flutter 应用） 🔴 高优先级

**目标**：确保代码质量和功能稳定性。

**任务清单**：
- [ ] 为 PlannerNode 编写单元测试
- [ ] 为 RAGNode 编写单元测试
- [ ] 为 ExecutorNode 编写单元测试
- [ ] 为 AgentService 编写集成测试
- [ ] 为 AgentController 编写 E2E 测试
- [ ] 配置测试覆盖率报告

**预计工作量**：2-3 天

## 已完成任务

### ✅ Milestone 4: Critic Node 和循环机制

**完成日期**: 2026-01-10

**任务清单**：
- [x] 设计 Critic 节点接口
- [x] 实现结果评估逻辑（简化版本和 LLM 版本）
  - 检查图片是否生成成功
  - 评估图片质量（基于 intent.confidence 和随机因素，或使用 LLM）
  - 检查是否符合用户意图
- [x] 实现重试机制（如果评估不通过，最多 3 次重试）
- [x] 在 AgentService 中集成 Critic 节点
- [x] 更新工作流图（Planner → RAG → Executor → Critic）
- [x] 添加配置项（CRITIC_TIMEOUT、CRITIC_PASS_THRESHOLD、MAX_RETRY_COUNT）
- [x] 更新文档

**相关文档**：
- [工作流设计](../workflow/AGENT_WORKFLOW_DESIGN.md) - Agent 工作流设计（Critic 节点部分）
- [工作流指南](../workflow/WORKFLOW_GUIDE.md) - 完整工作流说明

## 待完成任务

**目标**：实现前后端联调，完成完整的用户体验。

**任务清单**：
- [ ] 实现 Flutter SSE 客户端
- [ ] 实现 GenUI 组件渲染器
- [ ] 实现 ImageView 组件
- [ ] 实现状态管理（Provider）
- [ ] 实现 UI 交互逻辑
- [ ] 端到端测试

**相关文档**：
- [数据模型设计](../design/DATA_MODELS_DESIGN.md) - GenUI 组件定义
- [SSE 流式设计](../workflow/SSE_STREAMING_DESIGN.md) - SSE 协议说明

**预计工作量**：5-7 天

## 推荐开发顺序

### 第一阶段：完善后端核心功能（1-2 周）

1. ✅ **Critic 节点** - 确保输出质量，完成 Milestone 4
2. **错误处理优化** - 提高系统稳定性

### 第二阶段：测试和优化（1 周）

3. **单元测试和集成测试** - 确保代码质量
4. **性能优化** - 优化响应时间
5. **监控和日志** - 便于问题排查

### 第三阶段：前端集成（1-2 周）

6. **Flutter 应用开发** - 完成用户界面
7. **端到端测试** - 验证完整流程
8. **用户体验优化** - 提升交互体验

## 技术债务

以下问题需要在后续版本中解决：

- [ ] 图片生成目前使用 mock（picsum.photos），需要集成真实的图片生成 API（Midjourney、Stable Diffusion 等）
- [ ] 会话管理需要持久化（当前为内存存储）
- [ ] 需要添加认证和授权机制
- [ ] 需要添加速率限制（Rate Limiting）
- [ ] 需要添加请求日志和审计
- [ ] 支持动态添加和管理风格数据（当前只有 5 条默认风格）

## 性能优化建议

1. **缓存机制**：
   - 缓存 LLM 响应（相同输入）
   - 缓存向量检索结果

2. **并发处理**：
   - 支持多会话并发
   - 优化工作流执行顺序

3. **资源优化**：
   - 优化向量数据库查询
   - 减少不必要的 LLM 调用

## 监控和运维

1. **日志系统**：
   - 结构化日志
   - 日志聚合和分析

2. **监控指标**：
   - API 响应时间
   - 错误率
   - LLM API 调用次数和成本
   - 工作流节点执行时间

3. **告警机制**：
   - 错误率告警
   - 性能下降告警

## 文档更新

随着功能开发，需要更新以下文档：

- [x] 更新工作流文档（Milestone 3 完成）
- [x] 更新工作流设计文档（添加 Critic 节点，Milestone 4 完成）
- [x] 更新工作流指南（添加 Critic 节点说明，Milestone 4 完成）
- [ ] 创建部署指南
- [ ] 创建贡献指南

## 参考资源

- [LangGraph 文档](https://langchain-ai.github.io/langgraph/)
- [NestJS 文档](https://docs.nestjs.com/)
- [LanceDB 文档](https://lancedb.github.io/lancedb/)
- [Swagger/OpenAPI 规范](https://swagger.io/specification/)

## 问题反馈

如有问题或建议，请：
1. 创建 Issue
2. 提交 Pull Request
3. 联系项目维护者
