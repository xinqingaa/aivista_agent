/**
 * 知识库初始化数据
 * 
 * 定义 5 条默认风格数据，用于 RAG 检索功能
 */

export interface StyleData {
  id: string;
  style: string;
  prompt: string;
  description?: string;
  tags?: string[];
  metadata?: {
    category?: string;
    popularity?: number;
    [key: string]: any;
  };
  // 新增字段
  isSystem?: boolean;  // 标记是否为系统内置
  createdAt?: Date;
  updatedAt?: Date;
  vector?: number[];   // 向量数据（内部使用）
}

export const INITIAL_STYLES: StyleData[] = [
  {
    id: 'style_001',
    style: 'Cyberpunk',
    prompt: 'neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic, vibrant colors, urban decay',
    description: '赛博朋克风格：霓虹灯、高科技、低生活、未来主义城市背景',
    tags: ['cyberpunk', 'futuristic', 'neon', 'urban', 'sci-fi'],
    metadata: {
      category: 'digital',
      popularity: 85,
    },
    isSystem: true,  // 系统内置标记
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_002',
    style: 'Watercolor',
    prompt: 'soft pastel colors, artistic fluidity, paper texture, watercolor painting, gentle brushstrokes, translucent layers, artistic expression',
    description: '水彩画风格：柔和的 pastel 色彩、艺术流动性、纸张纹理',
    tags: ['watercolor', 'artistic', 'pastel', 'painting', 'traditional'],
    metadata: {
      category: 'traditional',
      popularity: 75,
    },
    isSystem: true,  // 系统内置标记
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_003',
    style: 'Minimalist',
    prompt: 'minimalist design, clean lines, simple composition, negative space, monochromatic, geometric shapes, modern aesthetic',
    description: '极简主义风格：简洁线条、简单构图、留白、单色调',
    tags: ['minimalist', 'clean', 'simple', 'modern', 'geometric'],
    metadata: {
      category: 'digital',
      popularity: 70,
    },
    isSystem: true,  // 系统内置标记
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_004',
    style: 'Oil Painting',
    prompt: 'oil painting, rich textures, bold brushstrokes, classical art, vibrant colors, canvas texture, artistic masterpiece',
    description: '油画风格：丰富纹理、大胆笔触、古典艺术、鲜艳色彩',
    tags: ['oil', 'painting', 'classical', 'texture', 'traditional'],
    metadata: {
      category: 'traditional',
      popularity: 80,
    },
    isSystem: true,  // 系统内置标记
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_005',
    style: 'Anime',
    prompt: 'anime style, manga art, vibrant colors, expressive characters, detailed backgrounds, Japanese animation, cel-shading',
    description: '动漫风格：日式动画、鲜艳色彩、表情丰富的人物、详细背景',
    tags: ['anime', 'manga', 'japanese', 'cartoon', 'colorful'],
    metadata: {
      category: 'digital',
      popularity: 90,
    },
    isSystem: true,  // 系统内置标记
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];
