# 贡献指南

感谢你对 AiVista 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

1. 在 Issues 中搜索是否已有相关问题
2. 如果没有，创建新的 Issue，包含：
   - 清晰的标题和描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 环境信息（Node.js 版本、操作系统等）
   - 截图或错误日志

### 提交功能建议

1. 在 Issues 中描述你的功能想法
2. 说明使用场景和预期收益
3. 等待维护者反馈

### 提交代码

1. **Fork 项目**
   ```bash
   # 在 GitHub 上点击 Fork 按钮
   git clone https://github.com/your-username/aivista.git
   cd aivista
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行修改**
   - 遵循现有代码风格
   - 添加必要的测试
   - 更新相关文档

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add some feature"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` 修复 Bug
   - `docs:` 文档更新
   - `style:` 代码格式调整
   - `refactor:` 重构
   - `test:` 测试相关
   - `chore:` 构建/工具链相关

5. **推送到 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写 PR 模板
   - 等待 Code Review

## 开发规范

### 代码风格

- **TypeScript**: 使用 `tslint` 或 `eslint` 进行检查
- **命名规范**: 驼峰命名（camelCase）
- **注释**: 关键逻辑添加注释

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

示例：
```
feat(agent): add support for custom LLM providers

Implement a flexible LLM provider system that allows users to
switch between different AI models (Aliyun, DeepSeek, etc.)

Closes #123
```

### 测试

- 为新功能添加单元测试
- 确保所有测试通过
- 测试覆盖率不应降低

## 获取帮助

- 查看 [文档](./docs/README_RE.md)
- 在 [Discussions](https://github.com/your-username/aivista/discussions) 中提问
- 联系维护者

## 行为准则

- 尊重所有贡献者
- 欢迎不同观点和建设性反馈
- 专注于对项目最有利的事情

再次感谢你的贡献！🎉
