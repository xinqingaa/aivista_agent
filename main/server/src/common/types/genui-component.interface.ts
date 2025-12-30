export interface GenUIComponent {
  id?: string;
  widgetType: 'SmartCanvas' | 'AgentMessage' | 'ActionPanel';
  props: {
    // SmartCanvas props
    imageUrl?: string;
    mode?: 'view' | 'draw_mask';
    ratio?: number;
    // AgentMessage props
    state?: 'success' | 'loading' | 'failed';
    text?: string;
    isThinking?: boolean;
    // ActionPanel props
    actions?: Array<{
      id: string;
      label: string;
      type: 'button' | 'slider' | 'select';
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  updateMode?: 'append' | 'replace' | 'update';
  targetId?: string;
  timestamp?: number;
}

