export interface GenUIComponent {
  id?: string;
  widgetType: 'SmartCanvas' | 'ImageView' | 'AgentMessage' | 'ActionPanel';
  props: {
    // SmartCanvas props (用于未来画布功能)
    imageUrl?: string;
    mode?: 'view' | 'draw_mask';
    ratio?: number;
    // ImageView props (纯图片展示组件)
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scaleDown';
    // AgentMessage props
    state?: 'success' | 'loading' | 'failed';
    text?: string;
    isThinking?: boolean;
    // ActionPanel props
    actions?: Array<{
      id: string;
      label: string;
      type: 'button' | 'slider' | 'select';
      icon?: string; // Lucide icon name: Download, ExternalLink, RefreshCw
      buttonType?: 'primary' | 'secondary' | 'outline' | 'danger';
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  updateMode?: 'append' | 'replace' | 'update';
  targetId?: string;
  timestamp?: number;
}

