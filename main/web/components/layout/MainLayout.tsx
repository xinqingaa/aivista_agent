/**
 * 主布局组件
 * 整合侧边栏和聊天界面，支持响应式布局
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useConversationStore } from '@/stores/conversation-store';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { ui, setIsMobile, setSidebarState } = useConversationStore();
  const [isClient, setIsClient] = useState(false);
  const initializedRef = useRef(false);

  // 客户端渲染标记
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 检测移动端
  useEffect(() => {
    if (!isClient) return;

    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;

      // 只在状态真正改变时才更新
      if (ui.isMobile !== isMobileView) {
        setIsMobile(isMobileView);
      }

      // 移动端默认隐藏侧边栏（只在初始化时执行一次）
      if (!initializedRef.current && isMobileView && ui.sidebar.state === 'expanded') {
        initializedRef.current = true;
        setSidebarState('hidden');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [isClient, setIsMobile, setSidebarState]);

  if (!isClient) {
    // 服务端渲染返回 null，避免水合不匹配
    return null;
  }

  const isMobile = ui.isMobile;
  const isHidden = ui.sidebar.state === 'hidden';
  const isCollapsed = ui.sidebar.state === 'collapsed';
  const isExpanded = ui.sidebar.state === 'expanded';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏（PC端和移动端都使用同一个组件，通过状态控制） */}
      <Sidebar />

      {/* 主内容区 */}
      <main
        className={cn(
          'flex-1 overflow-hidden transition-all duration-300',
          !isMobile && !isHidden && isExpanded && 'ml-[280px]',
          !isMobile && !isHidden && isCollapsed && 'ml-16',
          isMobile && 'ml-0'
        )}
      >
        <ChatInterface />
      </main>

      {/* 移动端遮罩层（侧边栏打开时显示） */}
      {isMobile && !isHidden && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => {
            useConversationStore.setState({
              ui: {
                ...ui,
                sidebar: {
                  ...ui.sidebar,
                  state: 'hidden',
                },
              },
            });
          }}
        />
      )}
    </div>
  );
}
