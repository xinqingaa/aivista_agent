/**
 * 测试指南弹窗组件
 * 提供使用和测试说明
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TestGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          测试指南
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>测试指南</DialogTitle>
          <DialogDescription>
            了解如何使用和测试 AI 对话功能
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* 功能测试 */}
            <div>
              <h3 className="font-medium mb-2">功能测试</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>输入文本，点击发送（或按 Enter）</li>
                <li>观察 AI 思考过程日志</li>
                <li>查看节点状态（意图识别、风格检索、任务执行、质量审查）</li>
                <li>查看进度条</li>
              </ul>
            </div>

            {/* 预期事件流程 */}
            <div>
              <h3 className="font-medium mb-2">预期事件流程</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-500">1. Planner (意图识别)</span>
                  <span className="text-muted-foreground">识别用户意图</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-purple-500">2. RAG (风格检索)</span>
                  <span className="text-muted-foreground">检索相关风格</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-500">3. Executor (任务执行)</span>
                  <span className="text-muted-foreground">执行生成任务</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-orange-500">4. Critic (质量审查)</span>
                  <span className="text-muted-foreground">质量检查</span>
                </div>
              </div>
            </div>

            {/* 注意事项 */}
            <div>
              <h3 className="font-medium mb-2">注意事项</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>确保后端服务正在运行（http://localhost:3000）</li>
                <li>确保知识库已初始化</li>
                <li>打开浏览器开发者工具查看 SSE 连接日志</li>
                <li>如果连接失败，检查控制台错误信息</li>
              </ul>
            </div>

            {/* 调试技巧 */}
            <div>
              <h3 className="font-medium mb-2">调试技巧</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>打开 Console 标签，查看 SSE 事件日志</li>
                <li>打开 Network 标签，查看 SSE 连接状态</li>
                <li>检查 EventStream 类型的请求</li>
                <li>查看响应内容是否正确</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
