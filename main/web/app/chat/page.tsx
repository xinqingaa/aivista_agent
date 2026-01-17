/**
 * 聊天测试页面
 * 用于测试 SSE 连接和 Agent 工作流
 */

'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { TestGuideDialog } from '@/components/chat/TestGuideDialog';
import { Card } from '@/components/ui/card';

export default function ChatTestPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">AiVista</h1>
            <p className="text-xs text-muted-foreground">
            AI智绘，创意闪现
            </p>
          </div>
          <TestGuideDialog />
        </div>
      </div>

      {/* 聊天界面 */}
      <div className="flex-1 min-h-0 container mx-auto py-4">
        <Card className="h-full">
          <ChatInterface
            title="AI 画图"
            placeholder="输入你的创意，例如：生成一只赛博朋克风格的猫..."
          />
        </Card>
      </div>
    </div>
  );
}
