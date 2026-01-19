# 文件命名规范 (Naming Conventions)

## 1. 概述

本文档定义 AiVista Web 项目的文件命名规范，确保项目文件命名统一、清晰、易于维护。

## 2. 命名规范

### 2.1 基本原则

- **统一性**: 同一类型的文件使用相同的命名风格
- **可读性**: 文件名应该清晰表达文件内容
- **一致性**: 遵循项目既定的命名约定

### 2.2 命名风格

项目采用以下命名风格：

- **kebab-case（短横线连接小写）**: 用于所有代码文件（组件、工具、Hook、类型等）
  - 示例: `chat-interface.tsx`, `use-debounce.ts`, `api-client.ts`

## 3. 文件类型命名规范

### 3.1 React 组件文件

**规范**: 使用 kebab-case，文件名与组件名语义一致

**示例**:
```
components/
  layout/
    header.tsx          # Header 组件
    footer.tsx          # Footer 组件
  ui/
    button.tsx          # Button 组件
    card.tsx            # Card 组件
  features/
    knowledge-base/
      style-card.tsx    # StyleCard 组件
      style-list.tsx    # StyleList 组件
```

**规则**:
- 组件文件名必须与导出的组件名一致
- 一个文件通常只导出一个主要组件
- 如果文件包含多个相关组件，文件名使用主要组件名

### 3.2 Hook 文件

**规范**: 使用 kebab-case，以 `use-` 开头

**示例**:
```
hooks/
  use-debounce.ts       # useDebounce hook
  use-knowledge.ts      # useKnowledge, useStyles 等 hooks
  use-toast.ts          # useToast hook
```

**规则**:
- Hook 文件名必须使用 kebab-case
- 文件名以 `use-` 开头
- 文件名应该反映 Hook 的主要功能

### 3.3 工具函数文件

**规范**: 使用 kebab-case

**示例**:
```
lib/
  utils/
    cn.ts               # className 合并工具
    format.ts           # 格式化工具
    validation.ts       # 验证工具
  api/
    client.ts           # API 客户端
    knowledge.ts        # 知识库 API
```

**规则**:
- 工具文件使用 kebab-case
- 文件名应该清晰表达文件功能
- 相关工具可以组织在同一文件中

### 3.4 类型定义文件

**规范**: 使用 kebab-case

**示例**:
```
lib/
  types/
    knowledge.ts        # 知识库相关类型
    agent.ts            # Agent 相关类型
    genui.ts            # GenUI 相关类型
```

**规则**:
- 类型定义文件使用 kebab-case
- 文件名应该反映类型的主要领域

### 3.5 配置文件

**规范**: 使用 kebab-case 或标准配置文件名

**示例**:
```
next.config.js        # Next.js 配置（标准名称）
tailwind.config.js     # TailwindCSS 配置（标准名称）
tsconfig.json          # TypeScript 配置（标准名称）
components.json        # shadcn/ui 配置（标准名称）
.env.local             # 环境变量（标准名称）
```

**规则**:
- 遵循框架/工具的标准配置文件名
- 自定义配置文件使用 kebab-case

### 3.6 文档文件

**规范**: 使用 UPPER_SNAKE_CASE 或 kebab-case

**示例**:
```
docs/
  README.md
  development/
    SETUP.md
    NAMING_CONVENTIONS.md
    CODING_STANDARDS.md
  architecture/
    ARCHITECTURE.md
    TECHNOLOGY_STACK.md
```

**规则**:
- 重要文档使用 UPPER_SNAKE_CASE（如 README.md）
- 其他文档使用 kebab-case
- 文档文件名应该清晰表达内容

## 4. 目录命名规范

**规范**: 使用 kebab-case

**示例**:
```
components/
  features/
    knowledge-base/     # 知识库功能组件
    text-to-image/      # 文生图功能组件
  genui/                # GenUI 组件
lib/
  api/                  # API 相关
  types/                # 类型定义
  utils/                # 工具函数
```

**规则**:
- 目录名使用 kebab-case
- 目录名应该清晰表达目录内容
- 功能相关的组件组织在同一目录下

## 5. 变量和函数命名

### 5.1 变量命名

- **普通变量**: 使用 camelCase
  ```typescript
  const userName = 'John';
  const isLoading = true;
  ```

- **常量**: 使用 UPPER_SNAKE_CASE
  ```typescript
  const API_BASE_URL = 'http://localhost:3000';
  const MAX_RETRY_COUNT = 3;
  ```

### 5.2 函数命名

- **普通函数**: 使用 camelCase
  ```typescript
  function fetchData() {}
  function handleClick() {}
  ```

- **React 组件**: 使用 PascalCase（组件名本身），但文件名使用 kebab-case
  ```typescript
  function Header() {}
  function StyleCard() {}
  ```

- **Hook**: 使用 camelCase，以 `use` 开头
  ```typescript
  function useDebounce() {}
  function useKnowledge() {}
  ```

## 6. 示例对比

### 6.1 正确示例

```
hooks/
  use-debounce.ts       ✅ 正确
  use-knowledge.ts      ✅ 正确
  use-toast.ts          ✅ 正确

components/
  layout/
    header.tsx          ✅ 正确
  ui/
    button.tsx          ✅ 正确
```

### 6.2 错误示例

```
hooks/
  useDebounce.ts        ❌ 错误（应使用 kebab-case）
  UseDebounce.ts        ❌ 错误（Hook 文件不应使用 PascalCase）
  use_debounce.ts       ❌ 错误（不应使用下划线）

  components/
    Header.tsx            ❌ 错误（组件文件应使用 kebab-case）
    Button.tsx            ❌ 错误（组件文件应使用 kebab-case）
```

## 7. 迁移指南

如果发现不符合规范的现有文件，应该：

1. **重命名文件**: 使用正确的命名规范
2. **更新导入**: 更新所有引用该文件的地方
3. **提交更改**: 确保所有相关文件都已更新

## 8. 工具支持

### 8.1 ESLint 规则

可以在 ESLint 配置中添加规则来检查文件命名：

```json
{
  "rules": {
    "unicorn/filename-case": [
      "error",
      {
        "case": "kebabCase",
        "ignore": [
          "README.md",
          "next.config.js",
          "tailwind.config.js"
        ]
      }
    ]
  }
}
```

### 8.2 编辑器配置

在 VS Code 中，可以使用文件命名检查插件来确保命名规范。

## 9. 总结

- **组件文件**: kebab-case（如 `header.tsx`、`style-card.tsx`）
- **Hook 文件**: kebab-case，以 `use-` 开头（如 `use-debounce.ts`）
- **工具文件**: kebab-case（如 `api-client.ts`）
- **类型文件**: kebab-case（如 `knowledge.ts`）
- **目录**: kebab-case（如 `knowledge-base/`）
- **文档文件**: UPPER_SNAKE_CASE 或 kebab-case（如 `README.md` 或 `setup.md`）

遵循这些规范可以确保项目文件命名统一、清晰，便于团队协作和维护。
