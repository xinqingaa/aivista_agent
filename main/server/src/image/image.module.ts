import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AliyunImageService } from './services/aliyun-image.service';
import { MockImageService } from './services/mock-image.service';
import { IImageService } from './interfaces/image-service.interface';

/**
 * 图片生成服务模块
 * 
 * 提供图片生成服务（文生图和局部重绘）
 * 支持 Mock 和真实服务切换
 * 
 * 使用方式：
 * - 通过配置 USE_REAL_IMAGE_SERVICE 控制使用 Mock 或真实服务
 * - 默认使用 Mock 服务（避免测试时产生费用）
 */
@Module({
  imports: [ConfigModule],
  providers: [
    AliyunImageService,
    MockImageService,
    {
      provide: 'IMAGE_SERVICE',
      useFactory: (
        configService: ConfigService,
        aliyunImageService: AliyunImageService,
        mockImageService: MockImageService,
      ): IImageService => {
        const useRealServiceStr = configService.get<string>('USE_REAL_IMAGE_SERVICE') ?? 'false';
        if (useRealServiceStr.toLowerCase() === 'true') {
          return aliyunImageService;
        } else {
          return mockImageService;
        }
      },
      inject: [ConfigService, AliyunImageService, MockImageService],
    },
  ],
  exports: ['IMAGE_SERVICE'],
})
export class ImageModule {}
