# 边界条件文档 (Boundary Conditions)

## 1. 概述

本文档定义前端应用的边界条件，包括输入验证、错误处理、性能边界等，与后端边界条件保持一致。

## 2. 输入验证边界

### 2.1 文本输入

**限制：**
- **最小长度**: 1 字符
- **最大长度**: 1000 字符（超出部分截断或提示错误）
- **空输入处理**: 禁用提交按钮，显示提示信息

**验证规则：**
```typescript
function validateTextInput(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: '输入不能为空' };
  }
  
  if (text.length > 1000) {
    return { valid: false, error: '输入长度不能超过 1000 个字符' };
  }
  
  return { valid: true };
}
```

**纯表情/符号处理：**
- 如果输入只包含表情或符号，后端可能识别为 `INTENT_UNKNOWN`
- 前端可以显示友好提示："请输入有效的文本描述"

### 2.2 蒙版数据

**限制：**
- **Base64 大小限制**: 最大 10MB
- **坐标点数量限制**: 单条路径最多 10000 个点
- **路径数量限制**: 单次请求最多 100 条路径
- **格式验证**: 必须是有效的 Base64 编码的 PNG/JPG 图片

**验证规则：**
```typescript
function validateMaskData(maskData: MaskData): { valid: boolean; error?: string } {
  // 验证 Base64 大小
  const size = Buffer.from(maskData.base64, 'base64').length;
  if (size > 10 * 1024 * 1024) {
    return { valid: false, error: '蒙版数据过大，最大 10MB' };
  }
  
  // 验证坐标点数量
  if (maskData.coordinates) {
    const totalPoints = maskData.coordinates.length;
    if (totalPoints > 10000) {
      return { valid: false, error: '坐标点数量过多，最多 10000 个点' };
    }
  }
  
  // 验证图片 URL
  if (!maskData.imageUrl.startsWith('http://') && !maskData.imageUrl.startsWith('https://')) {
    return { valid: false, error: '图片 URL 格式无效' };
  }
  
  return { valid: true };
}
```

### 2.3 图片 URL

**限制：**
- **协议限制**: 仅支持 `http://` 和 `https://`
- **大小限制**: 建议图片尺寸不超过 4096x4096
- **格式支持**: PNG, JPG, JPEG, WebP

**验证规则：**
```typescript
function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, error: '图片 URL 必须使用 http:// 或 https://' };
  }
  
  // 可选：验证图片格式
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext));
  if (!hasValidExtension) {
    return { valid: false, error: '不支持的图片格式' };
  }
  
  return { valid: true };
}
```

## 3. 错误处理边界

### 3.1 API 错误

**错误类型：**
- `LLM_API_ERROR`: LLM API 调用失败（可重试）
- `INVALID_INPUT`: 用户输入无效（不可重试）
- `MASK_DATA_MISSING`: 局部重绘缺少蒙版数据（不可重试）
- `EXECUTION_TIMEOUT`: 执行超时（可重试）
- `VECTOR_DB_ERROR`: 向量数据库错误（可重试）
- `WORKFLOW_ERROR`: 工作流执行错误（可重试）
- `UNKNOWN_ERROR`: 未知错误（不可重试）

**处理策略：**
```typescript
function handleAPIError(error: ErrorEvent) {
  if (error.data.retryable) {
    // 显示重试按钮
    return {
      showRetry: true,
      retryAfter: error.data.retryAfter,
      message: error.data.message,
    };
  } else {
    // 显示错误消息，不提供重试
    return {
      showRetry: false,
      message: error.data.message,
    };
  }
}
```

### 3.2 SSE 连接错误

**错误类型：**
- 网络连接失败
- 服务器断开连接
- 超时

**处理策略：**
- 自动重连（最多 3 次，指数退避：2s, 4s, 8s）
- 显示连接状态
- 提供手动重连按钮

### 3.3 超时处理

**超时时间：**
- **Planner Node**: 10 秒
- **RAG Node**: 5 秒
- **Executor Node**: 5 秒（Mock 延迟除外）
- **Critic Node**: 8 秒
- **总超时时间**: 单个工作流最长 60 秒

**前端处理：**
```typescript
// 设置总超时
const TIMEOUT = 60 * 1000; // 60 秒

useEffect(() => {
  const timeout = setTimeout(() => {
    if (isConnecting) {
      // 超时处理
      disconnect();
      setError(new Error('请求超时，请重试'));
    }
  }, TIMEOUT);

  return () => clearTimeout(timeout);
}, [isConnecting, disconnect]);
```

## 4. 性能边界

### 4.1 消息历史

**限制：**
- **最大消息数**: 50 条
- **超出处理**: 删除最旧的消息，保留最近 50 条

**实现：**
```typescript
function addMessage(messages: ChatMessage[], newMessage: ChatMessage): ChatMessage[] {
  const updated = [...messages, newMessage];
  if (updated.length > 50) {
    return updated.slice(-50); // 保留最后 50 条
  }
  return updated;
}
```

### 4.2 UI 组件列表

**限制：**
- **最大组件数**: 100 个
- **超出处理**: 删除最旧的组件

### 4.3 虚拟滚动

**使用场景：**
- 消息列表超过 20 条时使用虚拟滚动
- 知识库列表超过 50 项时使用虚拟滚动
- 思考日志超过 30 条时使用虚拟滚动

### 4.4 图片加载

**限制：**
- 同时加载的图片数量不超过 10 张
- 使用懒加载（Intersection Observer）
- 图片大小限制：单张图片不超过 5MB

## 5. 并发控制

### 5.1 单会话并发

**限制：**
- 同一会话同时只能执行一个工作流
- 如果已有工作流在执行，新的请求需要等待或提示用户

**实现：**
```typescript
const [isProcessing, setIsProcessing] = useState(false);

const sendMessage = async (request: ChatRequest) => {
  if (isProcessing) {
    // 提示用户等待
    toast({
      title: '提示',
      description: '上一个请求正在处理中，请稍候',
    });
    return;
  }

  setIsProcessing(true);
  try {
    // 发送请求
  } finally {
    setIsProcessing(false);
  }
};
```

### 5.2 全局并发

**限制：**
- 最多支持 50 个并发会话（后端限制）
- 超出限制时显示友好提示

## 6. 重试机制

### 6.1 自动重试

**规则：**
- **最大重试次数**: 3 次
- **重试间隔**: 指数退避（5s, 10s, 20s）
- **重试条件**: 仅对 `retryable: true` 的错误进行重试

**实现：**
```typescript
async function retryWithBackoff(
  fn: () => Promise<void>,
  maxRetries = 3
): Promise<void> {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      await fn();
      return;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 6.2 手动重试

**场景：**
- 用户点击重试按钮
- 错误消息中显示重试按钮（如果 `retryable: true`）

## 7. 数据验证

### 7.1 前端验证

**原则：**
- 在发送请求前进行前端验证
- 提供即时反馈
- 减少无效请求

**验证时机：**
- 用户输入时（实时验证）
- 提交前（完整验证）

### 7.2 后端验证

**原则：**
- 前端验证不能替代后端验证
- 后端验证是最终保障
- 前端需要处理后端返回的验证错误

## 8. 状态管理边界

### 8.1 会话状态

**限制：**
- 会话状态存储在内存中
- 30 分钟无活动自动清理
- 刷新页面会丢失会话状态（除非使用持久化存储）

### 8.2 消息历史

**限制：**
- 最多保留 50 条消息
- 超出时删除最旧的消息

### 8.3 本地存储

**使用场景：**
- 主题偏好（深色/浅色模式）
- 用户设置（可选）

**不使用场景：**
- 敏感信息（API Key、会话 Token）
- 大量数据（消息历史）

## 9. 网络边界

### 9.1 请求超时

**超时时间：**
- **普通 API 请求**: 30 秒
- **SSE 连接**: 60 秒（总超时）
- **图片加载**: 10 秒

### 9.2 重连机制

**SSE 重连：**
- 最大重连次数: 3 次
- 重连间隔: 指数退避（2s, 4s, 8s）
- 重连超时: 每次重连最多等待 10 秒

### 9.3 离线处理

**检测离线：**
```typescript
useEffect(() => {
  const handleOnline = () => {
    // 网络恢复
    if (wasOffline) {
      // 尝试重新连接
      reconnect();
    }
  };

  const handleOffline = () => {
    // 网络断开
    setWasOffline(true);
    disconnect();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

## 10. 浏览器兼容性

### 10.1 最低要求

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### 10.2 特性支持

- **EventSource API**: 需要支持（或使用 polyfill）
- **ReadableStream**: 需要支持（用于 POST SSE）
- **Intersection Observer**: 需要支持（用于懒加载）

## 11. 相关文档

- [后端边界条件](../../../main/server/docs/workflow/AGENT_WORKFLOW_DESIGN.md#边界条件约束)
- [SSE 客户端实现](../api/SSE_CLIENT.md)
- [错误处理设计](../../../main/server/docs/design/ERROR_HANDLING_DESIGN.md)
