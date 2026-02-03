/**
 * 聊天页面
 * 集成侧边栏和会话管理
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ChatInterface } from '@/components/chat/chat-interface';
import { Sidebar } from '@/components/layout/sidebar';
import { SessionList } from '@/components/layout/session-list';
import { TestGuideDialog } from '@/components/chat/test-guide-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useSessionStore } from '@/stores/session-store';
import { Home, Menu, Plus } from 'lucide-react';

export default function ChatPage() {
  const [mobileSessionOpen, setMobileSessionOpen] = useState(false);

  const {
    sessions,
    currentSessionId,
    isLoading,
    createSession,
    selectSession,
    deleteSession,
    updateSessionTitle,
  } = useSessionStore();

  const handleMobileCreateSession = useCallback(async () => {
    try {
      const sessionId = await createSession();
      await selectSession(sessionId);
    } catch (error) {
      console.error('[ChatPage] Failed to create session:', error);
    }
  }, [createSession, selectSession]);

  const handleMobileSelectSession = useCallback(
    async (sessionId: string) => {
      await selectSession(sessionId);
      setMobileSessionOpen(false);
    },
    [selectSession]
  );

  const handleMobileDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);
    },
    [deleteSession]
  );

  const handleMobileUpdateTitle = useCallback(
    async (sessionId: string, title: string) => {
      await updateSessionTitle(sessionId, title);
    },
    [updateSessionTitle]
  );

  return (
    <div className="h-screen mx-auto container flex flex-col border">
      {/* 顶部工具栏 */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          {/* 移动端：Menu 左侧 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 md:hidden"
            onClick={() => setMobileSessionOpen(true)}
            aria-label="打开对话列表"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold truncate">AiVista</h1>
            <p className="text-xs text-muted-foreground truncate">AI智绘，创意闪现</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <TestGuideDialog />
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            {/* 移动端：Plus 最右侧 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 md:hidden"
              onClick={handleMobileCreateSession}
              aria-label="发起新对话"
            >
              <div className="w-7 h-7 bg-gradient-to-tr from-blue-500 rounded-lg flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区域：侧边栏 + 聊天界面 */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 聊天界面 */}
        <div className="flex-1 min-w-0 mx-auto py-4">
          <Card className="h-full border-0 sm:border bg-background/50 backdrop-blur-sm shadow-sm">
            <ChatInterface
              title="AI 画图"
              placeholder="输入创意，如：赛博朋克猫…"
            />
          </Card>
        </div>
      </div>

      {/* 移动端：会话列表侧滑层 */}
      <Sheet open={mobileSessionOpen} onOpenChange={setMobileSessionOpen}>
        <SheetContent
          side="left"
          className="w-[85%] max-w-[320px] p-0 flex flex-col"
          showCloseButton={true}
        >
          <SheetHeader className="p-4 pb-2 border-b">
            <SheetTitle>对话列表</SheetTitle>
          </SheetHeader>
          <SessionList
            sessions={sessions}
            currentSessionId={currentSessionId}
            isLoading={isLoading}
            collapsed={false}
            onSelect={handleMobileSelectSession}
            onDelete={handleMobileDeleteSession}
            onUpdateTitle={handleMobileUpdateTitle}
            alwaysShowActions={true}
            className="flex-1"
          />
          {sessions.length > 0 && (
            <div className="p-3 border-t text-xs text-muted-foreground text-center">
              共 {sessions.length} 个对话
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
