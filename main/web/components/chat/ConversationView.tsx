/**
 * 对话视图组件
 * 按消息分组展示用户提问和 AI 响应
 */

'use client';

import { useMemo } from 'react';
import { useConversationStore } from '@/stores/conversation-store';
import { Message, GenUIComponent as StoreGenUIComponent } from '@/lib/types/conversation';
import { GenUIComponent, GenUIRenderer } from '@/genui';
import { ImageActionButtons } from './ActionButtons';
import { cn } from '@/lib/utils';

interface MessageGroup {
  userMessage: Message;
  assistantComponents: StoreGenUIComponent[];
}

export function ConversationView() {
  const { getActiveConversation, activeConversationId } = useConversationStore();
  const activeConversation = getActiveConversation();

  // 按消息分组
  const messageGroups = useMemo(() => {
    if (!activeConversation) return [];

    const groups: MessageGroup[] = [];
    let currentUserMessage: Message | null = null;
    const currentComponents: StoreGenUIComponent[] = [];

    // 按时间顺序遍历消息
    activeConversation.messages.forEach((message) => {
      if (message.role === 'user') {
        // 保存上一组
        if (currentUserMessage) {
          groups.push({
            userMessage: currentUserMessage,
            assistantComponents: [...currentComponents],
          });
          currentComponents.length = 0;
        }
        currentUserMessage = message;
      }
    });

    // 添加最后一组（包含当前正在生成的组件）
    if (currentUserMessage) {
      groups.push({
        userMessage: currentUserMessage,
        assistantComponents: activeConversation.genUIComponents,
      });
    }

    return groups;
  }, [activeConversation]);

  if (!activeConversation) {
    return null;
  }

  return (
    <div className="space-y-8">
      {messageGroups.map((group, groupIndex) => (
        <div key={group.userMessage.id} className="space-y-4">
          {/* 用户消息 */}
          <div className="flex justify-end animate-in slide-in-from-bottom-2">
            <div className="max-w-[85%] bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {group.userMessage.content}
              </p>
            </div>
          </div>

          {/* AI 响应（GenUI 组件） */}
          {group.assistantComponents.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {group.assistantComponents.map((component, index) => {
                // 转换为 GenUI 系统的组件格式
                const genUIComponent: GenUIComponent = {
                  id: component.id,
                  widgetType: component.widgetType,
                  props: component.props,
                  updateMode: component.updateMode,
                  targetId: component.targetId,
                };

                // 为 ImageView 添加操作按钮
                if (component.widgetType === 'ImageView') {
                  return (
                    <div key={component.id} className="relative group">
                      <GenUIRenderer component={genUIComponent} />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageActionButtons
                          imageUrl={component.props.imageUrl}
                          conversationId={activeConversationId || undefined}
                          className="bg-background/90 backdrop-blur-sm rounded-lg shadow-lg p-1"
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <GenUIRenderer
                    key={component.id}
                    component={genUIComponent}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
