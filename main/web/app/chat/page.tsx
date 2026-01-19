/**
 * 聊天测试页面
 * 用于测试 SSE 连接和 Agent 工作流
 */

'use client';

import Link from 'next/link';
import { ChatInterface } from '@/components/chat/chat-interface';
import { TestGuideDialog } from '@/components/chat/test-guide-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home } from 'lucide-react';

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
          <div className="flex items-center gap-2">
          <TestGuideDialog />
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            
          </div>
        </div>
      </div>

      {/* 聊天界面 */}
      <div className="flex-1 min-h-0 container mx-auto py-4">
        <Card className="h-full border-0 sm:border bg-background/50 backdrop-blur-sm shadow-sm">
          <ChatInterface
            title="AI 画图"
            placeholder="输入你的创意，例如：生成一只赛博朋克风格的猫..."
          />
        </Card>
      </div>
    </div>
  );
}
