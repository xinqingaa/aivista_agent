# AiVista(即梦 AI 复刻版) MVP 产品规格说明书

## 1. 核心交互流程 (User Flow)

### 阶段一：文生图 (Text-to-Image)
1.  **用户:** 输入 "一只在雨中哭泣的猫，赛博朋克风格"。
2.  **Agent (后端):**
    * **Planner:** 识别意图 `Generate`。
    * **RAG:** 检索 "Cyberpunk" -> 获取 prompt 增强词。
    * **Executor:** 模拟生成，返回 Mock 图片 URL。
3.  **UI (前端):** 接收流式数据，先显示思考过程，后展示图片卡片。

### 阶段二：智能画布编辑 (Inpainting)
**这是核心复刻点。**
1.  **用户:** 点击图片进入“编辑模式”。
2.  **操作:** 使用红色画笔在猫头部涂抹。
3.  **指令:** 输入 "换成机械头盔"。
4.  **数据流:** 前端发送 `Action: Inpaint` + `Mask Base64` + `Prompt`。
5.  **Agent:** 识别为修图任务 -> 模拟处理 -> 返回新图。

### 阶段三：参数调整 (GenUI)
1.  **场景:** Agent 认为当前生成可能需要调整参数。
2.  **响应:** 后端下发 `ActionPanel` 组件（包含“风格强度”滑块）。
3.  **前端:** 渲染滑块，用户拖动滑块后触发重新生成。

## 2. 数据结构要求 (Canvas State)
前端需维护状态栈以支持撤销/重做：
- `currentImageUrl`: 当前显示的底图。
- `maskPaths`: 用户绘制的路径集合。
- `history`: 操作历史栈。

**演示脚本 (Happy Path):**
1.  **用户:** “帮我生成一张赛博朋克风格的猫。”
2.  **Agent:** (思考中...) -> “已识别意图：文生图。正在检索‘赛博朋克’风格库...” -> (生成模拟图片)。
3.  **UI:** 屏幕弹出一张猫的图片 (Mock图)，下方出现“风格强度”滑块。
4.  **用户:** (在图片猫的头部画了一个红圈) -> “把这里改成机械头盔。”
5.  **Agent:** (思考中...) -> “识别到蒙版区域。正在执行局部重绘...” -> (返回新的Mock图)。

## 2. 功能模块拆解

### 2.1 意图识别 (The Brain - Real)
- **输入:** 用户文本。
- **处理:** 调用 LLM API（通过 LLM 服务适配层，支持多模型切换）。
- **输出:** 结构化 JSON。
    - 示例: `{ "action": "generate_image", "subject": "cat", "style": "cyberpunk" }`
    - 示例: `{ "action": "inpainting", "mask_detected": true, "prompt": "mechanical helmet" }`

### 2.2 风格知识库 (The Memory - Real Implementation, Fake Data)
- **存入:** 项目启动时，自动写入 5 条风格数据到 LanceDB：
    - "Cyberpunk" -> Prompt: "neon lights, high tech, low life, dark city background"
    - "Watercolor" -> Prompt: "soft pastel colors, artistic fluidity, paper texture"
- **读取:** 当用户提到相关词汇时，RAG 节点必须检索出对应的 Prompt 拼接到 LLM 的上下文中。

### 2.3 伪·生图引擎 (The Mock Engine)
- **接口:** `generateImage(prompt)`
- **逻辑:**
    - 不调用 AI。
    - 返回 `https://picsum.photos/seed/{random_id}/800/600`。
    - **关键:** 必须模拟 2-3 秒的延迟，让前端展示“生成中”的状态，增加真实感。

### 2.4 GenUI 协议响应
- 后端必须根据 Agent 的当前状态，下发不同的 UI 组件：
    - **思考时:** 下发 `AgentMessage(isThinking: true)`。
    - **出图时:** 下发 `SmartCanvas(imageUrl: "...", mode: "view")`。
    - **修图时:** 下发 `SmartCanvas(imageUrl: "...", mode: "masking")`。