import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentState } from '../interfaces/agent-state.interface';
import { GenUIComponent } from '../../common/types/genui-component.interface';
import { IImageService } from '../../image/interfaces/image-service.interface';

/**
 * Executor 节点 - 任务执行节点
 * 
 * @Injectable() - 标记为可注入的节点服务
 * 
 * 调用顺序:
 * 1. 接收意图结果（AgentState.intent）
 * 2. 根据意图执行相应任务（使用图片生成服务，支持 Mock 和真实服务）
 * 3. 生成 GenUI 组件（ImageView, AgentMessage, ActionPanel）
 * 4. 返回执行结果（包含生成的图片 URL 和 UI 组件）
 */
@Injectable()
export class ExecutorNode {
  private readonly logger = new Logger(ExecutorNode.name);

  constructor(
    @Inject('IMAGE_SERVICE') private readonly imageService: IImageService,
    private readonly configService: ConfigService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log('Executor Node: Starting task execution...');

    if (!state.intent) {
      throw new Error('Intent is required for execution');
    }

    const { action } = state.intent;

    // 使用增强后的 Prompt（如果存在），否则使用原始 Prompt
    const prompt = state.enhancedPrompt?.final || state.intent.prompt || state.userInput.text;

    // 先推送"开始执行任务"的思考日志
    const startThoughtLog = {
      node: 'executor',
      message: `开始执行任务：${this.getActionLabel(action)}...`,
      timestamp: Date.now(),
    };

    // 根据 action 类型调用相应的图片服务
    let imageUrl: string;

    try {
      switch (action) {
        case 'generate_image':
          // 文生图：模型选择优先级：userInput.preferredModel > 环境变量 > 默认值
          const preferredModel = state.userInput.preferredModel || 'not specified';
          const envModel = this.configService.get<
            'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo'
          >('ALIYUN_IMAGE_MODEL') || 'not set';
          const model =
            state.userInput.preferredModel ||
            (envModel as
              | 'qwen-image'
              | 'qwen-image-max'
              | 'qwen-image-plus'
              | 'z-image-turbo') ||
            'qwen-image-plus';

          const size =
            this.configService.get<string>('ALIYUN_IMAGE_SIZE') || '1024x1024';

          this.logger.log(
            `Executor Node: Model selection - preferredModel: ${preferredModel}, env config: ${envModel}, selected: ${model}`,
          );
          this.logger.log(
            `Executor Node: Image generation params - model: ${model}, size: ${size}, prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
          );

          // 根据配置的模型选择对应的方法
          switch (model) {
            case 'qwen-image':
              imageUrl = await this.imageService.generateImageQwenImage(
                prompt,
                { size, n: 1 },
              );
              break;
            case 'qwen-image-max':
              imageUrl = await this.imageService.generateImageQwenImageMax(
                prompt,
                { size, n: 1 },
              );
              break;
            case 'qwen-image-plus':
              imageUrl = await this.imageService.generateImageQwenImagePlus(
                prompt,
                { size, n: 1 },
              );
              break;
            case 'z-image-turbo':
              imageUrl = await this.imageService.generateImageZImageTurbo(
                prompt,
                { size, n: 1 },
              );
              break;
            default:
              // 降级到统一入口方法
              imageUrl = await this.imageService.generateImage(prompt, {
                model,
                size,
                n: 1,
              });
          }
          break;

        case 'inpainting':
          // 局部重绘
          if (!state.userInput.maskData) {
            throw new Error('Inpainting requires maskData');
          }
          imageUrl = await this.imageService.editImage(prompt, {
            model: 'qwen-image-edit-plus',
            imageUrl: state.userInput.maskData.imageUrl,
            maskBase64: state.userInput.maskData.base64,
            size: this.configService.get<string>('ALIYUN_IMAGE_SIZE') || '1024x1024',
          });
          break;

        case 'adjust_parameters':
          // 参数调整（重新生成）：模型选择优先级：userInput.preferredModel > 环境变量 > 默认值
          const adjustPreferredModel = state.userInput.preferredModel || 'not specified';
          const adjustEnvModel = this.configService.get<
            'qwen-image' | 'qwen-image-max' | 'qwen-image-plus' | 'z-image-turbo'
          >('ALIYUN_IMAGE_MODEL') || 'not set';
          const adjustModel =
            state.userInput.preferredModel ||
            (adjustEnvModel as
              | 'qwen-image'
              | 'qwen-image-max'
              | 'qwen-image-plus'
              | 'z-image-turbo') ||
            'qwen-image-plus';

          const adjustSize =
            this.configService.get<string>('ALIYUN_IMAGE_SIZE') || '1024x1024';

          this.logger.log(
            `Executor Node: Model selection - preferredModel: ${adjustPreferredModel}, env config: ${adjustEnvModel}, selected: ${adjustModel}`,
          );
          this.logger.log(
            `Executor Node: Image generation params - model: ${adjustModel}, size: ${adjustSize}, prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
          );

          // 根据配置的模型选择对应的方法
          switch (adjustModel) {
            case 'qwen-image':
              imageUrl = await this.imageService.generateImageQwenImage(
                prompt,
                { size: adjustSize, n: 1 },
              );
              break;
            case 'qwen-image-max':
              imageUrl = await this.imageService.generateImageQwenImageMax(
                prompt,
                { size: adjustSize, n: 1 },
              );
              break;
            case 'qwen-image-plus':
              imageUrl = await this.imageService.generateImageQwenImagePlus(
                prompt,
                { size: adjustSize, n: 1 },
              );
              break;
            case 'z-image-turbo':
              imageUrl = await this.imageService.generateImageZImageTurbo(
                prompt,
                { size: adjustSize, n: 1 },
              );
              break;
            default:
              // 降级到统一入口方法
              imageUrl = await this.imageService.generateImage(prompt, {
                model: adjustModel,
                size: adjustSize,
                n: 1,
              });
          }
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      this.logger.log(`Executor Node: Generated image URL - ${imageUrl}`);
    } catch (error) {
      this.logger.error(
        `Executor Node: Failed to generate image - ${error.message}`,
        error.stack,
      );
      throw error;
    }

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
        widgetType: 'ImageView',
        props: {
          imageUrl,
          width: 800,
          height: 600,
          fit: 'contain',
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
      uiComponents,
      thoughtLogs: [
        startThoughtLog, // 先推送"开始执行任务"
        {
          node: 'executor',
          message: `任务执行完成：${this.getActionLabel(action)}`,
          timestamp: Date.now(),
        },
      ],
    };
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

