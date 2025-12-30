---
name: 文档完善：LLM灵活配置、边界条件、环境变量、知识库数据
overview: 根据用户需求，完善文档：1) 将所有写死的DeepSeek替换为灵活的LLM服务配置；2) 审查并约束边界条件；3) 规范环境变量清单；4) 补充知识库初始化数据文档。
todos:
  - id: replace_deepseek_workflow
    content: 更新AGENT_WORKFLOW_DESIGN.md，将所有DeepSeek引用改为LLM服务
    status: completed
  - id: replace_deepseek_errors
    content: 更新ERROR_HANDLING_DESIGN.md，将错误代码改为通用LLM错误
    status: completed
  - id: replace_deepseek_sse
    content: 更新SSE_STREAMING_DESIGN.md，更新错误代码定义
    status: completed
  - id: replace_deepseek_other
    content: 更新其他文档（DATA_MODELS、PROMPT_README、architecture等）
    status: completed
  - id: review_boundaries
    content: 审查所有文档，补充边界条件约束
    status: completed
  - id: create_env_vars
    content: 创建环境变量清单并补充到PROMPT_README.md
    status: completed
  - id: create_knowledge_init
    content: 创建知识库初始化数据文档
    status: completed
---

# 文档完善计划：LLM灵活配置、边

界条件、环境变量、知识库数据

## 需求分析

### 需求1：LLM服务灵活配置

- 检查所有文档中写死DeepSeek的地方
- 替换为灵活的LLM服务配置（使用ILlmService接口）
- 涉及文档：
- `AGENT_WORKFLOW_DESIGN.md` - 多处提到DeepSeek API调用
- `ERROR_HANDLING_DESIGN.md` - 错误代码和错误处理示例
- `SSE_STREAMING_DESIGN.md` - 错误代码定义
- `DATA_MODELS_DESIGN.md` - 注释中的DeepSeek引用
- `PROMPT_README.md` - 依赖包说明
- `architecture.md` - AI模型说明
- `product_spec.md` - 功能模块说明
- `decision_matrix.md` - 技术决策
- `backend_roadmap.md` - 里程碑描述
- `agent_state_machine.md` - 流程图中的DeepSeek

### 需求2：边界条件审查和约束

- 审查所有设计文档，补充边界条件约束
- 重点关注：
- 输入验证边界（文本长度、蒙版大小等）
- 性能边界（超时时间、并发数、历史记录大小等）
- 资源边界（内存、存储、API调用限制等）
- 业务逻辑边界（重试次数、会话超时等）

### 需求3：环境变量清单

- 创建完整的环境变量清单文档
- 包含：
- LLM相关配置（多模型支持）
- 数据库配置
- 服务配置（端口、超时等）
- 安全配置
- 补充到`PROMPT_README.md`

### 需求4：知识库初始化数据

- 确认知识库初始化数据的必要性
- 如果需要，补充：
- 初始化数据的格式和内容
- 初始化时机和方式
- 数据示例（5条风格数据）

## 实施步骤

### 步骤1：替换DeepSeek为灵活配置

1. 更新`AGENT_WORKFLOW_DESIGN.md` - 将所有DeepSeek API调用改为LLM服务调用
2. 更新`ERROR_HANDLING_DESIGN.md` - 将错误代码改为通用的LLM_API_ERROR
3. 更新`SSE_STREAMING_DESIGN.md` - 更新错误代码定义
4. 更新`DATA_MODELS_DESIGN.md` - 更新注释
5. 更新`PROMPT_README.md` - 更新依赖说明，引用LLM_SERVICE_DESIGN.md
6. 更新`architecture.md` - 改为"支持多LLM模型（DeepSeek、阿里云通义千问等）"
7. 更新`product_spec.md` - 改为"调用LLM API"
8. 更新`decision_matrix.md` - 改为"真实LLM调用"
9. 更新`backend_roadmap.md` - 改为"LLM服务"
10. 更新`agent_state_machine.md` - 流程图中的描述

### 步骤2：边界条件审查和约束

1. 审查`AGENT_WORKFLOW_DESIGN.md` - 补充节点超时、重试次数等边界
2. 审查`SSE_STREAMING_DESIGN.md` - 补充连接超时、心跳间隔等边界
3. 审查`ERROR_HANDLING_DESIGN.md` - 补充错误处理边界
4. 审查`SMART_CANVAS_DESIGN.md` - 补充画布交互边界（缩放范围、历史记录大小等）
5. 审查`STATE_MANAGEMENT_DESIGN.md` - 补充状态管理边界
6. 审查`GENUI_RENDERER_DESIGN.md` - 补充组件渲染边界