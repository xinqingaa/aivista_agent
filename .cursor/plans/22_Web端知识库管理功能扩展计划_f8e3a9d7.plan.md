# Web端知识库管理功能扩展计划

## 🎯 功能需求分析

基于现有的知识库列表实现，需要新增以下核心功能：

1. **完整的CRUD支持** - 调用后端新增的删除和编辑接口
2. **交互式编辑** - 点击风格弹出编辑框，支持查看/编辑模式
3. **批量删除** - 列表中提供多选功能
4. **确认机制** - 删除时使用类似confirm的确认框进行二次确认

## 🏗️ 现有架构分析

基于代码分析，现有架构特点：

- ✅ **组件化架构** - 每个功能独立为组件
- ✅ **shadcn/ui组件库** - 提供完整的UI组件
- ✅ **本地状态管理** - 使用useState管理组件状态
- ✅ **统一API调用** - 通过fetchAPI封装
- ✅ **类型安全** - 完整TypeScript类型定义
- ✅ **响应式设计** - Tailwind CSS响应式布局

## 📝 详细实现计划

### 阶段1：API层扩展

#### 1.1 扩展API端点

```typescript
// lib/api/knowledge.ts
export async function updateStyle(id: string, data: UpdateStyleRequest): Promise<void>
export async function deleteStyle(id: string): Promise<void>
export async function deleteStyles(ids: string[]): Promise<BatchDeleteResponse>
```

#### 1.2 扩展类型定义

```typescript
// lib/types/knowledge.ts
interface UpdateStyleRequest {
  style?: string;
  prompt?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface BatchDeleteResponse {
  deleted: number;
  failed: string[];
}
```

### 阶段2：组件扩展

#### 2.1 增强StyleCard组件

- ✅ 添加选择框（checkbox）用于批量操作
- ✅ 添加编辑按钮和删除按钮
- ✅ 支持选中状态样式
- ✅ 保持原有的点击查看功能

#### 2.2 新增StyleEditDialog组件

- ✅ 基于现有Dialog组件实现
- ✅ 支持查看模式（只读）和编辑模式
- ✅ 集成StyleForm组件用于编辑
- ✅ 系统内置样式的保护逻辑

#### 2.3 新增BatchDeleteConfirm组件

- ✅ 基于Dialog组件实现
- ✅ 显示选中删除的项目列表
- ✅ 提供确认和取消按钮
- ✅ 显示删除失败的警告信息

#### 2.4 新增StyleActions组件

- ✅ 批量操作工具栏
- ✅ 全选/取消全选功能
- ✅ 批量删除按钮
- ✅ 显示选中数量

### 阶段3：页面集成

#### 3.1 扩展knowledge/page.tsx

- ✅ 集成批量选择状态管理
- ✅ 添加编辑和删除功能
- ✅ 集成确认对话框
- ✅ 更新错误处理和成功提示

#### 3.2 状态管理扩展

```typescript
// 新增状态
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [showEditDialog, setShowEditDialog] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [editingStyle, setEditingStyle] = useState<StyleData | null>(null);
const [isEditMode, setIsEditMode] = useState(false);
```

### 阶段4：用户体验优化

#### 4.1 加载和错误处理

- ✅ 扩展现有的loading状态
- ✅ 统一的错误消息处理
- ✅ 操作成功后的自动刷新

#### 4.2 交互细节优化

- ✅ 操作反馈动画
- ✅ 键盘快捷键支持（ESC关闭弹窗）
- ✅ 批量操作的进度显示

## 🔧 技术实现要点

### 组件设计原则

1. **保持一致性** - 使用现有的shadcn/ui组件和样式约定
2. **可访问性** - 支持键盘导航和屏幕阅读器
3. **响应式设计** - 适配移动端和桌面端
4. **性能优化** - 避免不必要的重渲染

### 状态管理模式

1. **本地状态优先** - 保持现有的简单状态管理方式
2. **状态同步** - 确保UI状态与数据状态一致
3. **错误边界** - 使用现有的错误处理模式

### API调用模式

1. **统一封装** - 复用现有的fetchAPI模式
2. **错误处理** - 使用现有的APIError和toast机制
3. **类型安全** - 完整的TypeScript类型支持

## 📱 移动端适配

### 响应式设计

- ✅ 移动端隐藏部分高级功能
- ✅ 触摸友好的按钮大小
- ✅ 简化的移动端操作流程

### 交互优化

- ✅ 长按显示操作菜单（可选）
- ✅ 滑动操作手势（可选）
- ✅ 底部固定的操作栏

## 🧪 测试策略

### 功能测试

1. **单元测试** - 核心组件的功能测试
2. **集成测试** - API调用的端到端测试
3. **用户测试** - 操作流程的可用性测试

### 边界情况测试

1. **网络错误** - API调用失败的处理
2. **空数据** - 无数据时的显示
3. **大量数据** - 性能和滚动测试

## 🎨 UI/UX设计规范

### 视觉一致性

- ✅ 使用现有的颜色系统和字体
- ✅ 保持现有的间距和布局规范
- ✅ 复用现有的图标和组件样式

### 交互模式

- ✅ 双击编辑，单击查看
- ✅ 右键显示操作菜单（桌面端）
- ✅ 批量操作的视觉反馈

## 📈 实施优先级

#### P0 - 核心功能

1. API层扩展
2. StyleCard组件增强
3. 编辑对话框实现
4. 删除确认框实现

#### P1 - 用户体验

1. 批量操作功能
2. 加载和错误状态
3. 移动端适配

#### P2 - 优化功能

1. 键盘快捷键
2. 高级搜索功能
3. 数据导出功能

## 🔗 文件结构规划

```
web/
├── app/knowledge/
│   └── page.tsx                    # 扩展主页面
├── components/knowledge/
│   ├── StyleCard.tsx              # 增强卡片组件
│   ├── StyleEditDialog.tsx         # 编辑对话框
│   ├── BatchDeleteConfirm.tsx       # 批量删除确认
│   ├── StyleActions.tsx           # 批量操作工具栏
│   └── index.ts                  # 导出文件
├── lib/api/knowledge.ts            # 扩展API调用
└── lib/types/knowledge.ts          # 扩展类型定义
```

这个计划基于现有代码架构，采用渐进式增强的方式，确保新功能与现有系统的无缝集成，同时保持代码的一致性和可维护性。