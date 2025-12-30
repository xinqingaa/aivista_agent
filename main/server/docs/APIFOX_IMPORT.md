# Apifox 导入 Swagger 文档指南

## 概述

本文档指导如何将 AiVista Agent API 的 Swagger 文档导入到 Apifox 中进行调试和测试。

## 前置条件

1. 后端服务已启动（`pnpm run start:dev`）
2. 服务运行在 `http://localhost:3000`
3. 已安装 Apifox 客户端或使用 Apifox Web 版

## 导入步骤

### 方法一：通过 OpenAPI JSON URL 导入（推荐）

1. **获取 OpenAPI JSON 地址**
   - 启动服务后，访问：`http://localhost:3000/api-docs-json`
   - 或直接使用 URL：`http://localhost:3000/api-docs-json`

2. **在 Apifox 中导入**
   - 打开 Apifox
   - 点击左侧菜单的 **"导入"** 按钮（或使用快捷键 `Cmd/Ctrl + I`）
   - 选择 **"OpenAPI/Swagger"**
   - 选择 **"URL 导入"** 标签页
   - 输入 URL：`http://localhost:3000/api-docs-json`
   - 点击 **"导入"** 按钮

3. **配置导入选项**
   - ✅ 自动生成测试用例（可选）
   - ✅ 导入后自动运行（可选）
   - 点击 **"确定"** 完成导入

### 方法二：通过文件导入

1. **导出 OpenAPI JSON 文件**
   - 访问：`http://localhost:3000/api-docs-json`
   - 复制所有 JSON 内容
   - 保存为 `aivista-api.json` 文件

2. **在 Apifox 中导入**
   - 打开 Apifox
   - 点击 **"导入"** → **"OpenAPI/Swagger"**
   - 选择 **"文件导入"** 标签页
   - 选择刚才保存的 `aivista-api.json` 文件
   - 点击 **"导入"**

## 环境配置

导入后，需要配置环境变量以便测试：

1. **创建环境**
   - 在 Apifox 左侧菜单点击 **"环境"**
   - 点击 **"新建环境"**
   - 环境名称：`AiVista 开发环境`

2. **配置变量**
   - 变量名：`baseUrl`
   - 变量值：`http://localhost:3000`
   - 变量类型：`字符串`
   - 点击 **"保存"**

3. **设置为当前环境**
   - 在环境列表中选择刚创建的环境
   - 点击 **"设为当前环境"**

## 接口测试

### 1. GET /api/agent - API 信息

- **方法**：GET
- **URL**：`{{baseUrl}}/api/agent`
- **说明**：测试基础接口，验证服务是否正常运行

### 2. POST /api/agent/chat - SSE 流式对话

**注意**：此接口返回 SSE 流式响应，需要特殊配置。

#### Apifox 配置步骤：

1. **创建请求**
   - 在 Apifox 中找到 `POST /api/agent/chat` 接口
   - 点击打开

2. **配置请求**
   - **方法**：POST
   - **URL**：`{{baseUrl}}/api/agent/chat`
   - **Headers**：
     - `Content-Type: application/json`
     - `Accept: text/event-stream`（重要！）

3. **配置请求体**
   - 选择 **"Body"** → **"JSON"**
   - 输入示例：
   ```json
   {
     "text": "生成一只赛博朋克风格的猫"
   }
   ```

4. **查看流式响应**
   - 点击 **"发送"** 按钮
   - 在 **"响应"** 面板中，切换到 **"实时响应"** 标签（如果可用）
   - 或查看 **"响应体"**，应该能看到 SSE 格式的事件流

#### 预期响应格式：

```
event: connection
data: {"status":"connected","sessionId":"session_1234567890"}

event: thought_log
data: {"type":"thought_log","timestamp":1234567890,"data":{"node":"planner","message":"已识别意图：generate_image"}}

event: gen_ui_component
data: {"type":"gen_ui_component","timestamp":1234567890,"data":{"widgetType":"SmartCanvas","props":{"imageUrl":"https://picsum.photos/800/600"}}}

event: stream_end
data: {"type":"stream_end","timestamp":1234567890,"data":{"sessionId":"session_1234567890","summary":"任务完成"}}
```

## 常见问题

### 1. 导入失败

**问题**：无法导入 OpenAPI JSON

**解决方案**：
- 确保服务已启动
- 检查 URL 是否正确：`http://localhost:3000/api-docs-json`
- 尝试使用文件导入方式

### 2. SSE 响应无法查看

**问题**：在 Apifox 中看不到流式响应

**解决方案**：
- 确保请求头包含 `Accept: text/event-stream`
- 使用 Apifox 的"实时响应"功能（如果可用）
- 或使用 curl 命令测试（参考 `SSE_DEBUG_GUIDE.md`）

### 3. 环境变量未生效

**问题**：`{{baseUrl}}` 未替换为实际值

**解决方案**：
- 检查是否已创建环境并设置为当前环境
- 确认变量名拼写正确（区分大小写）
- 重新发送请求

## 测试用例建议

### 基础测试用例

1. **生成图片**
   ```json
   {
     "text": "生成一只猫"
   }
   ```

2. **生成指定风格图片**
   ```json
   {
     "text": "生成一只赛博朋克风格的猫"
   }
   ```

3. **带会话 ID**
   ```json
   {
     "text": "生成一只狗",
     "sessionId": "test_session_001"
   }
   ```

### 高级测试用例

1. **局部重绘（带蒙版）**
   ```json
   {
     "text": "将背景改为星空",
     "maskData": {
       "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
       "imageUrl": "https://example.com/image.jpg"
     }
   }
   ```

## 下一步

导入成功后，可以：
1. 测试所有接口
2. 创建测试用例集合
3. 配置自动化测试
4. 导出接口文档

更多调试信息，请参考 `SSE_DEBUG_GUIDE.md`。

