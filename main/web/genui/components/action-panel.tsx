/**
 * ActionPanel 组件
 * 独立操作面板，展示在对话底部
 * 按钮显示 Icon，悬浮显示 label
 */

'use client';

import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionPanelProps as BaseActionPanelProps, ActionItem } from '@/lib/types/genui';

// Icon name to Lucide component map
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Download: LucideIcons.Download,
  ExternalLink: LucideIcons.ExternalLink,
  RefreshCw: LucideIcons.RefreshCw,
};

function getIconComponent(name?: string): React.ComponentType<{ className?: string }> | null {
  if (!name || !(name in ICON_MAP)) return null;
  return ICON_MAP[name];
}

export function ActionPanel({ actions, imageUrl, metadata, onAction }: BaseActionPanelProps) {
  const latestImageUrl = imageUrl ?? metadata?.imageUrl;

  const handleAction = (action: ActionItem) => {
    if (action.type !== 'button') return;

    if (action.id === 'download_btn' && latestImageUrl) {
      const link = document.createElement('a');
      link.href = latestImageUrl;
      link.download = `aivista-${Date.now()}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (action.id === 'preview_btn' && latestImageUrl) {
      window.open(latestImageUrl, '_blank');
      return;
    }

    if (action.id === 'regenerate_btn') {
      window.dispatchEvent(new CustomEvent('genui-action', { detail: { actionId: 'regenerate_btn' } }));
    }

    onAction?.(action);
  };

  return (
    <div className="flex items-center gap-2 pt-4 pb-2">
      {actions.map((action) => {
        if (action.type !== 'button') return null;

        const IconComponent = getIconComponent(action.icon);
        const isDisabled =
          (action.id === 'download_btn' || action.id === 'preview_btn') && !latestImageUrl;

        return (
          <div key={action.id} className="relative group">
            <Button
              size="icon"
              variant={action.buttonType === 'primary' ? 'default' : 'outline'}
              className="shrink-0"
              style={{ width: 36, height: 36, minWidth: 36 }}
              onClick={() => handleAction(action)}
              disabled={isDisabled || action.disabled}
              title={action.label}
            >
              {IconComponent ? (
                <IconComponent className="h-4 w-4" />
              ) : (
                <span className="text-xs truncate max-w-[2rem]">{action.label}</span>
              )}
            </Button>
            <span
              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-popover text-popover-foreground rounded-md border shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 whitespace-nowrap z-50"
              role="tooltip"
            >
              {action.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
