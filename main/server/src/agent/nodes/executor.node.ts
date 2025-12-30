import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';
import { GenUIComponent } from '../../common/types/genui-component.interface';

/**
 * Executor 节点 - 任务执行节点
 * 
 * @Injectable() - 标记为可注入的节点服务
 * 
 * 调用顺序:
 * 1. 接收意图结果（AgentState.intent）
 * 2. 根据意图执行相应任务（当前为模拟图片生成，使用 picsum.photos）
 * 3. 生成 GenUI 组件（SmartCanvas, AgentMessage, ActionPanel）
 * 4. 返回执行结果（包含生成的图片 URL 和 UI 组件）
 */
@Injectable()
export class ExecutorNode {
  private readonly logger = new Logger(ExecutorNode.name);

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log('Executor Node: Starting task execution...');

    if (!state.intent) {
      throw new Error('Intent is required for execution');
    }

    const { action, prompt } = state.intent;

    // 模拟延迟（2-3 秒）
    const delay = 2000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // 生成随机种子（基于 Prompt 的哈希值，确保相同 Prompt 返回相同图片）
    const seed = this.hashString(prompt);
    const imageUrl = `https://picsum.photos/seed/${seed}/800/600`;

    this.logger.log(`Executor Node: Generated image URL - ${imageUrl}`);

    // 生成 GenUI 组件
    const uiComponents: GenUIComponent[] = [
      {
        widgetType: 'AgentMessage',
        props: {
          state: 'success',
          text: `已为您${this.getActionLabel(action)}完成！`,
          isThinking: false,
        },
        timestamp: Date.now(),
      },
      {
        widgetType: 'SmartCanvas',
        props: {
          imageUrl,
          mode: 'view',
          ratio: 1.5,
        },
        timestamp: Date.now(),
      },
      {
        widgetType: 'ActionPanel',
        props: {
          actions: [
            {
              id: 'regenerate_btn',
              label: '重新生成',
              type: 'button',
              buttonType: 'primary',
            },
          ],
        },
        timestamp: Date.now(),
      },
    ];

    return {
      generatedImageUrl: imageUrl,
      enhancedPrompt: prompt,
      uiComponents,
      thoughtLogs: [
        {
          node: 'executor',
          message: `任务执行完成：${this.getActionLabel(action)}`,
          timestamp: Date.now(),
        },
      ],
    };
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      generate_image: '生成图片',
      inpainting: '局部重绘',
      adjust_parameters: '参数调整',
    };
    return labels[action] || '处理';
  }
}

