# 知识库初始化数据文档 (Knowledge Base Initialization)

## 1. 目标

本文档定义知识库（向量数据库）的初始化数据格式、内容和初始化流程，确保项目启动时能够自动加载风格数据。

## 2. 知识库内容

系统启动时会自动初始化 5 条默认风格数据到向量数据库（LanceDB）。以下是完整的知识库内容：

| ID | 风格名称 | 中文名称 | Prompt | 描述 | 标签 | 分类 | 流行度 |
|----|---------|---------|--------|------|------|------|--------|
| style_001 | Cyberpunk | 赛博朋克 | neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic, vibrant colors, urban decay | 赛博朋克风格：霓虹灯、高科技、低生活、未来主义城市背景 | cyberpunk, futuristic, neon, urban, sci-fi | digital | 85 |
| style_002 | Watercolor | 水彩 | soft pastel colors, artistic fluidity, paper texture, watercolor painting, gentle brushstrokes, translucent layers, artistic expression | 水彩画风格：柔和的 pastel 色彩、艺术流动性、纸张纹理 | watercolor, artistic, pastel, painting, traditional | traditional | 75 |
| style_003 | Minimalist | 极简 | minimalist design, clean lines, simple composition, negative space, monochromatic, geometric shapes, modern aesthetic | 极简主义风格：简洁线条、简单构图、留白、单色调 | minimalist, clean, simple, modern, geometric | digital | 70 |
| style_004 | Oil Painting | 油画 | oil painting, rich textures, bold brushstrokes, classical art, vibrant colors, canvas texture, artistic masterpiece | 油画风格：丰富纹理、大胆笔触、古典艺术、鲜艳色彩 | oil, painting, classical, texture, traditional | traditional | 80 |
| style_005 | Anime | 动漫 | anime style, manga art, vibrant colors, expressive characters, detailed backgrounds, Japanese animation, cel-shading | 动漫风格：日式动画、鲜艳色彩、表情丰富的人物、详细背景 | anime, manga, japanese, cartoon, colorful | digital | 90 |

**数据来源**: `main/server/src/knowledge/data/initial-styles.ts`

**数据库位置**: `main/server/data/lancedb/styles.lance/`

**数据库大小**: 约 156KB（包含 5 条初始风格数据）

### 2.1 Git 版本控制

初始知识库数据库已纳入 Git 版本控制：

- **文件**: `data/lancedb/styles.lance/`
- **大小**: 约 156KB
- **说明**: `data/README.md`

**优势**:
- ✅ 用户 clone 后可直接使用，无需额外配置
- ✅ 避免首次启动时的 Embedding API 调用成本
- ✅ 开发环境立即可用

**注意事项**:
- ⚠️ 数据库文件是二进制格式，Git 无法做 diff
- ⚠️ 如果后续修改数据库，需要重新生成文件
- ⚠️ 开发者和生产环境数据可能不一致（这是预期行为）

**重新初始化**:
```bash
# 删除现有数据库
rm -rf data/lancedb/

# 设置强制初始化环境变量
export FORCE_INIT_KNOWLEDGE_BASE=true

# 启动服务（会自动生成数据库）
pnpm run start:dev
```

## 3. 本地数据库查看方法

### 3.1 方法 1：使用管理 API（推荐）

**查看所有风格**:
```bash
GET http://localhost:3000/api/knowledge/styles
```

**查看单个风格**:
```bash
GET http://localhost:3000/api/knowledge/styles/style_001
```

**测试检索功能**:
```bash
GET http://localhost:3000/api/knowledge/search?query=赛博朋克
```

**查看统计信息**:
```bash
GET http://localhost:3000/api/knowledge/stats
```

返回所有风格数据（JSON 格式），可以在浏览器、Postman、Apifox 中直接查看。

### 3.2 方法 2：查看数据库文件

**数据库路径**: `main/server/data/lancedb/styles.lance/`

**文件结构**:
```
styles.lance/
├── _latest.manifest          # 最新版本的清单文件
├── _versions/                # 版本历史
│   └── 1.manifest
└── _transactions/            # 事务日志
    └── 0-{uuid}.txn
```

**注意**: LanceDB 文件是二进制格式（基于 Apache Arrow），不建议直接查看文件内容。建议使用管理 API 查看。

### 3.3 方法 3：使用代码查看

查看初始化数据源文件:
```typescript
// main/server/src/knowledge/data/initial-styles.ts
export const INITIAL_STYLES: StyleData[] = [
  // ... 5 条风格数据
];
```

### 3.4 验证数据是否正确初始化

**方法 1**: 检查启动日志
```
[KnowledgeService] Knowledge base initialized successfully with 5 styles
```

**方法 2**: 调用统计 API
```bash
curl http://localhost:3000/api/knowledge/stats
# 返回: { "count": 5, "dimension": 1536, ... }
```

**方法 3**: 检查数据库文件是否存在
```bash
ls -la main/server/data/lancedb/styles.lance/
# 应该看到 _latest.manifest 等文件
```

## 4. 初始化数据必要性

**需要初始化数据。** 根据产品规格（`product_spec.md`），项目启动时需要自动写入 5 条风格数据到 LanceDB，用于 RAG 检索功能。

## 3. 数据格式定义

### 3.1 StyleData 接口

```typescript
interface StyleData {
  id: string;                 // 唯一标识（自动生成）
  style: string;              // 风格名称（如 "Cyberpunk"）
  prompt: string;             // 风格提示词（英文）
  description?: string;       // 风格描述（中文，可选）
  tags?: string[];           // 标签（用于检索，可选）
  metadata?: {
    category?: string;        // 分类（如 "digital", "traditional"）
    popularity?: number;      // 流行度分数（0-100，可选）
    [key: string]: any;
  };
}
```

### 3.2 向量嵌入

- **模型:** 使用 OpenAI text-embedding-ada-002 或兼容模型
- **维度:** 1536 维
- **字段:** 对 `style` + `prompt` + `description` 的组合文本进行嵌入

## 4. 初始化数据内容

### 4.1 5 条示例风格数据

```typescript
const INITIAL_STYLES: StyleData[] = [
  {
    id: 'style_001',
    style: 'Cyberpunk',
    prompt: 'neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic, vibrant colors, urban decay',
    description: '赛博朋克风格：霓虹灯、高科技、低生活、未来主义城市背景',
    tags: ['cyberpunk', 'futuristic', 'neon', 'urban', 'sci-fi'],
    metadata: {
      category: 'digital',
      popularity: 85
    }
  },
  {
    id: 'style_002',
    style: 'Watercolor',
    prompt: 'soft pastel colors, artistic fluidity, paper texture, watercolor painting, gentle brushstrokes, translucent layers, artistic expression',
    description: '水彩画风格：柔和的 pastel 色彩、艺术流动性、纸张纹理',
    tags: ['watercolor', 'artistic', 'pastel', 'painting', 'traditional'],
    metadata: {
      category: 'traditional',
      popularity: 75
    }
  },
  {
    id: 'style_003',
    style: 'Minimalist',
    prompt: 'minimalist design, clean lines, simple composition, negative space, monochromatic, geometric shapes, modern aesthetic',
    description: '极简主义风格：简洁线条、简单构图、留白、单色调',
    tags: ['minimalist', 'clean', 'simple', 'modern', 'geometric'],
    metadata: {
      category: 'digital',
      popularity: 70
    }
  },
  {
    id: 'style_004',
    style: 'Oil Painting',
    prompt: 'oil painting, rich textures, bold brushstrokes, classical art, vibrant colors, canvas texture, artistic masterpiece',
    description: '油画风格：丰富纹理、大胆笔触、古典艺术、鲜艳色彩',
    tags: ['oil', 'painting', 'classical', 'texture', 'traditional'],
    metadata: {
      category: 'traditional',
      popularity: 80
    }
  },
  {
    id: 'style_005',
    style: 'Anime',
    prompt: 'anime style, manga art, vibrant colors, expressive characters, detailed backgrounds, Japanese animation, cel-shading',
    description: '动漫风格：日式动画、鲜艳色彩、表情丰富的人物、详细背景',
    tags: ['anime', 'manga', 'japanese', 'cartoon', 'colorful'],
    metadata: {
      category: 'digital',
      popularity: 90
    }
  }
];
```

## 5. 初始化流程

### 5.1 初始化时机

- **项目启动时:** 应用启动（`main.ts`）后，在 KnowledgeService 初始化时执行
- **检查机制:** 如果向量数据库已存在且包含数据，跳过初始化
- **强制初始化:** 可通过环境变量 `FORCE_INIT_KNOWLEDGE_BASE=true` 强制重新初始化

### 5.2 初始化步骤

```typescript
class KnowledgeService {
  async initialize(): Promise<void> {
    // 1. 检查数据库是否已存在
    const dbExists = await this.checkDatabaseExists();
    if (dbExists && !process.env.FORCE_INIT_KNOWLEDGE_BASE) {
      this.logger.log('Knowledge base already exists, skipping initialization');
      return;
    }

    // 2. 创建或打开数据库
    const db = await this.openOrCreateDatabase();

    // 3. 生成向量嵌入
    const stylesWithEmbeddings = await this.generateEmbeddings(INITIAL_STYLES);

    // 4. 写入数据库
    await this.insertStyles(db, stylesWithEmbeddings);

    this.logger.log(`Initialized knowledge base with ${INITIAL_STYLES.length} styles`);
  }

  private async generateEmbeddings(styles: StyleData[]): Promise<StyleDataWithEmbedding[]> {
    // 使用 OpenAI Embedding API 或兼容模型
    const embeddingService = new EmbeddingService();
    
    return Promise.all(styles.map(async (style) => {
      const text = `${style.style} ${style.prompt} ${style.description || ''}`;
      const embedding = await embeddingService.embed(text);
      
      return {
        ...style,
        vector: embedding
      };
    }));
  }
}
```

### 5.3 错误处理

- **嵌入生成失败:** 记录错误，跳过该条数据，继续处理其他数据
- **数据库写入失败:** 抛出异常，阻止应用启动
- **部分数据失败:** 记录警告，已成功的数据保留

## 6. 数据扩展

### 6.1 添加新风格

可以通过以下方式添加新风格：

1. **代码添加:** 修改 `INITIAL_STYLES` 数组，重新启动应用（需要设置 `FORCE_INIT_KNOWLEDGE_BASE=true`）
2. **API 添加:** 实现管理接口，动态添加风格数据（未来功能）
3. **配置文件:** 从 JSON 文件加载风格数据（推荐用于生产环境）

### 6.2 配置文件方式（推荐）

创建 `data/styles.json`:

```json
[
  {
    "style": "Cyberpunk",
    "prompt": "neon lights, high tech, low life, dark city background",
    "description": "赛博朋克风格",
    "tags": ["cyberpunk", "futuristic"],
    "metadata": {
      "category": "digital",
      "popularity": 85
    }
  }
]
```

在初始化时从文件加载：

```typescript
async loadStylesFromFile(filePath: string): Promise<StyleData[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}
```

## 7. 验证测试

### 7.1 初始化验证

```typescript
describe('Knowledge Base Initialization', () => {
  it('should initialize with 5 default styles', async () => {
    await knowledgeService.initialize();
    const count = await knowledgeService.count();
    expect(count).toBe(5);
  });

  it('should skip initialization if database exists', async () => {
    await knowledgeService.initialize();
    const firstCount = await knowledgeService.count();
    
    await knowledgeService.initialize();
    const secondCount = await knowledgeService.count();
    
    expect(secondCount).toBe(firstCount);
  });

  it('should force reinitialize when FORCE_INIT_KNOWLEDGE_BASE=true', async () => {
    process.env.FORCE_INIT_KNOWLEDGE_BASE = 'true';
    await knowledgeService.initialize();
    const count = await knowledgeService.count();
    expect(count).toBe(5);
  });
});
```

## 8. 环境变量

```bash
# 强制重新初始化知识库（可选，默认: false）
FORCE_INIT_KNOWLEDGE_BASE=false

# 风格数据文件路径（可选，默认: 使用代码中的 INITIAL_STYLES）
STYLES_DATA_FILE=./data/styles.json

# Embedding 模型配置（如果使用自定义模型）
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSION=1536
```

## 9. 相关文档

- **产品规格:** `../../docs/product_spec.md` - 定义了需要 5 条风格数据
- **RAG Node 设计:** [工作流设计](../workflow/AGENT_WORKFLOW_DESIGN.md) - 说明了如何使用检索结果
- **向量数据库配置:** [后端实施文档](../design/PROMPT_README.md) - 环境变量中的 `VECTOR_DB_PATH`

