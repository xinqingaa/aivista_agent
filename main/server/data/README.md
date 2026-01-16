# Data Directory

本目录包含应用程序运行时生成的数据文件。

## 目录结构

```
data/
├── lancedb/              # LanceDB 向量数据库
│   └── styles.lance/     # 风格知识库数据表
└── README.md             # 本说明文件
```

## 初始知识库

### Git 跟踪的文件

以下文件被提交到 Git，用于提供初始开发环境：

- **`lancedb/styles.lance/`** - 包含 5 条系统内置风格数据（约 156KB）

这些初始数据包括：
1. Cyberpunk（赛博朋克）
2. Watercolor（水彩）
3. Minimalist（极简）
4. Oil Painting（油画）
5. Anime（动漫）

### 数据库初始化

**首次启动**：
- 如果数据库文件存在，直接使用
- 如果不存在，自动调用 Embedding API 生成初始数据

**强制重新初始化**：
```bash
export FORCE_INIT_KNOWLEDGE_BASE=true
```

### 数据库文件说明

- `_latest.manifest` - 最新版本清单
- `_versions/` - 版本历史记录
- `_transactions/` - 事务日志
- `data/` - 实际数据文件（Lance 格式）

### 注意事项

1. **二进制格式**：数据库文件是二进制格式，Git 无法做 diff
2. **初始数据**：Git 中的数据库只包含 5 条系统内置风格
3. **生产环境**：生产环境可能需要额外的风格数据，通过 API 添加
4. **文件大小**：初始数据库约 156KB，不会拖慢 Git clone 速度

### 知识库管理

#### 查看 API 文档
- [API 参考文档](../docs/api/API_REFERENCE.md#knowledge-api)

#### 常用操作

```bash
# 获取所有风格
curl http://localhost:3000/api/knowledge/styles

# 搜索风格
curl "http://localhost:3000/api/knowledge/search?query=赛博朋克"

# 添加新风格
curl -X POST http://localhost:3000/api/knowledge/styles \
  -H "Content-Type: application/json" \
  -d '{
    "id": "style_006",
    "style": "Impressionist",
    "prompt": "impressionist painting, soft brushstrokes...",
    "description": "印象派风格"
  }'

# 更新风格
curl -X PUT http://localhost:3000/api/knowledge/styles/style_006 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新后的描述"
  }'

# 删除风格（仅限非系统内置风格）
curl -X DELETE http://localhost:3000/api/knowledge/styles/style_006

# 批量删除
curl -X POST http://localhost:3000/api/knowledge/styles/batch-delete \
  -H "Content-Type: application/json" \
  -d '{"ids": ["style_006", "style_007"]}'
```

#### 系统内置风格保护

以下 5 个风格为系统内置，**不能删除**，只能修改部分字段：
- `style_001` - Cyberpunk
- `style_002` - Watercolor
- `style_003` - Minimalist
- `style_004` - Oil Painting
- `style_005` - Anime

详细信息请参考：[知识库初始化文档](../docs/knowledge/KNOWLEDGE_BASE_INIT.md)
