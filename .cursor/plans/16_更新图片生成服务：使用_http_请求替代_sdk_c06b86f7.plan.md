---
name: 更新图片生成服务：使用 HTTP 请求替代 SDK
overview: 将 AliyunImageService 从使用不存在的 SDK 改为使用原生 HTTP 请求调用阿里云 DashScope API。根据用户提供的 Python 示例，使用 fetch API 直接调用多模态对话接口生成图片。
todos:
  - id: remove-sdk-dependency
    content: 移除 package.json 中不存在的 @alicloud/dashscope 依赖
    status: completed
  - id: update-generate-image
    content: 更新 generateImage 方法，使用 HTTP 请求调用 DashScope API
    status: completed
  - id: update-edit-image
    content: 更新 editImage 方法，使用 HTTP 请求调用图片编辑 API
    status: completed
  - id: test-api-call
    content: 测试 API 调用，确认 endpoint 和参数格式正确
    status: completed
---

# 更新图片生成服务：使用 HTTP 请求替代 SDK

## 一、问题

当前实现尝试使用 `@alicloud/dashscope` npm 包，但该包不存在。需要改为使用原生 HTTP 请求调用阿里云 DashScope API。

## 二、解决方案

根据用户提供的 Python 示例，使用 HTTP 请求直接调用 DashScope API。从 Python 代码可以看到：

- 使用 `MultiModalConversation.call` 接口
- API endpoint: `https://dashscope.aliyuncs.com/api/v1`
- 请求格式：messages、model、size 等参数
- 认证方式：Bearer token（API Key）

## 三、实施任务

### 任务 1: 更新 package.json（移除不存在的依赖）

**文件**: `main/server/package.json`

**操作**: 移除 `@alicloud/dashscope` 依赖（如果已添加）

**预计工作量**: 2 分钟

---

### 任务 2: 更新 AliyunImageService 实现

**文件**: `main/server/src/image/services/aliyun-image.service.ts`

**变更内容**:

1. 移除 SDK 导入
2. 使用原生 `fetch` API（Node.js 18+ 原生支持）或检查是否需要 polyfill
3. 根据 Python 示例构建 HTTP 请求
4. 处理 API 响应

**API 调用格式**（根据 Python 示例）:

```typescript
// API endpoint（需要确认具体路径）
const endpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

// 请求体格式（根据 Python 代码推断）
const requestBody = {
  model: 'qwen-image-plus',
  messages: [
    {
      role: 'user',
      content: [
        {
          text: prompt, // 图片生成提示词
        },
      ],
    },
  ],
  size: '1024*1024', // 使用 * 分隔
  result_format: 'message',
  stream: false,
  watermark: false,
  prompt_extend: true,
  negative_prompt: '',
};

// HTTP 请求
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${this.apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
});
```

**注意事项**:

- API endpoint 路径需要根据实际文档确认（可能是 `/services/aigc/multimodal-generation/generation` 或 `/services/aigc/image-generation/generation`）
- 响应格式需要根据实际 API 文档处理
- 错误处理需要完善

**预计工作量**: 1-2 小时（需要测试和调整）

---

### 任务 3: 处理图片编辑 API（可选）

**文件**: `main/server/src/image/services/aliyun-image.service.ts`

**变更内容**: 更新 `editImage` 方法，使用 HTTP 请求调用图片编辑 API

**注意事项**:

- qwen-image-edit-plus 的 API endpoint 和参数格式需要查阅文档
- 可能需要不同的 endpoint 或参数

**预计工作量**: 1 小时

---

## 四、技术要点

### 4.1 API Endpoint 确认

根据搜索结果和 Python 示例，可能的 endpoint：

1. `/services/aigc/multimodal-generation/generation`（多模态对话接口）
2. `/services/aigc/image-generation/generation`（图片生成接口）

**建议**：先尝试多模态对话接口，因为 Python 示例使用的是 `MultiModalConversation.call`

### 4.2 请求格式

根据 Python 示例：

```python
response = MultiModalConversation.call(
    api_key=api_key,
    model="qwen-image-plus",
    messages=messages,
    result_format='message',
    stream=False,
    watermark=False,
    prompt_extend=True,
    negative_prompt='',
    size='1328*1328'
)
```

转换为 HTTP 请求：

```typescript
{
  model: 'qwen-image-plus',
  messages: [
    {
      role: 'user',
      content: [{ text: prompt }],
    },
  ],
  result_format: 'message',
  stream: false,
  watermark: false,
  prompt_extend: true,
  negative_prompt: '',
  size: '1024*1024',
}
```

### 4.3 响应格式处理

需要根据实际 API 响应格式处理，可能的格式：

- `response.output.images[0].url`
- `response.output.results[0].url`
- 或其他格式（需要实际测试）

### 4.4 错误处理

- HTTP 状态码检查
- API 错误码处理（response.code）
- 友好的错误消息

## 五、实施步骤

1. 移除不存在的 SDK 依赖
2. 更新 `generateImage` 方法使用 HTTP 请求
3. 测试 API 调用（可能需要调整 endpoint 和参数）
4. 更新 `editImage` 方法（如需要）
5. 完善错误处理

## 六、风险与注意事项

1. **API Endpoint 不确定**：需要实际测试确认正确的 endpoint
2. **响应格式不确定**：需要根据实际响应调整代码
3. **图片编辑 API**：qwen-image-edit-plus 的调用方式可能需要不同的 endpoint
4. **测试需要 API Key**：测试真实调用需要有效的 API Key

## 七、后续优化

1. 添加重试机制
2. 添加请求超时控制
3. 添加响应缓存（可选）
4. 完善错误处理和日志记录