/**
 * 知识库初始化数据
 * 
 * 定义 15 条默认风格数据，用于 RAG 检索功能
 * 统一中文描述，覆盖常见图片生成场景
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
    chineseName?: string;
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
    prompt: 'neon lights, high tech, low life, dark city background, futuristic, cyberpunk aesthetic, vibrant colors, urban decay, sci-fi atmosphere',
    description: '赛博朋克风格：霓虹灯光、高科技设备、低端生活、未来主义城市、科幻氛围',
    tags: ['cyberpunk', 'futuristic', 'neon', 'urban', 'sci-fi'],
    metadata: {
      category: 'digital',
      popularity: 85,
      chineseName: '赛博朋克',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_002',
    style: 'Watercolor',
    prompt: 'soft pastel colors, artistic fluidity, paper texture, watercolor painting, gentle brushstrokes, translucent layers, artistic expression, flowing colors',
    description: '水彩画风格：柔和色彩、艺术流动感、纸张纹理、温柔笔触、半透明层次',
    tags: ['watercolor', 'artistic', 'pastel', 'painting', 'traditional'],
    metadata: {
      category: 'traditional',
      popularity: 75,
      chineseName: '水彩画',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_003',
    style: 'Minimalist',
    prompt: 'minimalist design, clean lines, simple composition, negative space, monochromatic, geometric shapes, modern aesthetic, elegant simplicity',
    description: '极简主义风格：简洁线条、简单构图、大量留白、单色调、几何图形、现代美学',
    tags: ['minimalist', 'clean', 'simple', 'modern', 'geometric'],
    metadata: {
      category: 'digital',
      popularity: 70,
      chineseName: '极简主义',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_004',
    style: 'Oil Painting',
    prompt: 'oil painting, rich textures, bold brushstrokes, classical art, vibrant colors, canvas texture, artistic masterpiece, impasto technique',
    description: '油画风格：丰富纹理、大胆笔触、古典艺术、鲜艳色彩、画布质感、厚涂技法',
    tags: ['oil', 'painting', 'classical', 'texture', 'traditional'],
    metadata: {
      category: 'traditional',
      popularity: 80,
      chineseName: '油画',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_005',
    style: 'Anime',
    prompt: 'anime style, manga art, vibrant colors, expressive characters, detailed backgrounds, Japanese animation, cel-shading, kawaii aesthetic',
    description: '动漫风格：日式动画、鲜艳色彩、表情丰富的角色、精细背景、赛璐璐渲染',
    tags: ['anime', 'manga', 'japanese', 'cartoon', 'colorful'],
    metadata: {
      category: 'digital',
      popularity: 90,
      chineseName: '动漫',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_006',
    style: 'Pixel Art',
    prompt: '8-bit pixel art, retro gaming style, pixelated characters, limited color palette, nostalgic, vintage game aesthetic, pixel perfect, dot matrix',
    description: '像素艺术风格：8位像素、复古游戏、像素化角色、有限色板、怀旧感、点阵图',
    tags: ['pixel', 'retro', '8bit', 'gaming', 'vintage'],
    metadata: {
      category: 'digital',
      popularity: 75,
      chineseName: '像素艺术',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_007',
    style: 'Ink Painting',
    prompt: 'chinese ink painting, traditional brush art, monochrome, flowing ink, calligraphic strokes, zen aesthetic, misty landscape, poetic atmosphere, minimalist composition',
    description: '水墨画风格：中国传统笔墨、单色调、流动墨迹、书法笔触、禅意美学、写意山水',
    tags: ['ink', 'chinese', 'traditional', 'calligraphy', 'zen'],
    metadata: {
      category: 'traditional',
      popularity: 70,
      chineseName: '水墨画',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_008',
    style: 'Vaporwave',
    prompt: 'vaporwave aesthetic, retro 90s, pink and cyan colors, glitch art, nostalgic, surreal, geometric patterns, neon grids, digital nostalgia, Memphis design',
    description: '蒸汽波风格：复古 90 年代、粉蓝色调、故障艺术、怀旧感、超现实、几何图案、霓虹网格',
    tags: ['vaporwave', 'retro', '90s', 'glitch', 'neon'],
    metadata: {
      category: 'digital',
      popularity: 72,
      chineseName: '蒸汽波',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_009',
    style: '3D Rendering',
    prompt: '3D rendering, photorealistic CGI, modern modeling, smooth surfaces, detailed lighting, ray tracing, polished finish, high-quality render, studio lighting',
    description: '3D 渲染风格：照片级 CGI、现代建模、光滑表面、精细光照、光线追踪、抛光质感',
    tags: ['3d', 'cgi', 'rendering', 'modern', 'photorealistic'],
    metadata: {
      category: 'digital',
      popularity: 82,
      chineseName: '3D 渲染',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_010',
    style: 'Sketch',
    prompt: 'pencil sketch, hand-drawn lines, shading, graphite texture, artistic draft, monochrome drawing, traditional sketching, cross-hatching, rough outline',
    description: '素描风格：铅笔线条、手绘感、明暗阴影、石墨质感、草稿艺术、交叉排线',
    tags: ['sketch', 'pencil', 'drawing', 'hand-drawn', 'traditional'],
    metadata: {
      category: 'traditional',
      popularity: 68,
      chineseName: '素描',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_011',
    style: 'Photorealistic',
    prompt: 'photorealistic, high resolution, DSLR camera, natural lighting, sharp focus, professional photography, realistic details, 8K quality, lifelike',
    description: '摄影写实风格：照片级逼真、高分辨率、自然光照、锐利对焦、真实细节、专业摄影',
    tags: ['photorealistic', 'photography', 'realistic', 'high-res', 'dslr'],
    metadata: {
      category: 'photography',
      popularity: 88,
      chineseName: '摄影写实',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_012',
    style: 'Cinematic',
    prompt: 'cinematic quality, film grain, dramatic lighting, wide angle lens, color grading, Hollywood style, epic composition, depth of field, anamorphic lens',
    description: '电影质感风格：影视级构图、胶片颗粒、戏剧光影、广角镜头、调色分级、史诗感',
    tags: ['cinematic', 'film', 'dramatic', 'hollywood', 'epic'],
    metadata: {
      category: 'photography',
      popularity: 86,
      chineseName: '电影质感',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_013',
    style: 'Fantasy Wonderland',
    prompt: 'fantasy wonderland, magical atmosphere, ethereal lighting, fairy tale scenery, dreamy colors, enchanted forest, mystical elements, glowing particles, whimsical',
    description: '梦幻仙境风格：奇幻氛围、空灵光线、童话场景、梦幻色彩、魔法森林、神秘元素',
    tags: ['fantasy', 'magical', 'dreamy', 'fairy-tale', 'mystical'],
    metadata: {
      category: 'fantasy',
      popularity: 78,
      chineseName: '梦幻仙境',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_014',
    style: 'Dark Gothic',
    prompt: 'dark gothic, moody atmosphere, dramatic shadows, medieval architecture, mysterious, dark fantasy, ominous ambiance, stone textures, candlelight',
    description: '黑暗哥特风格：阴郁氛围、戏剧阴影、中世纪建筑、神秘感、暗黑幻想、石材质感',
    tags: ['gothic', 'dark', 'medieval', 'mysterious', 'fantasy'],
    metadata: {
      category: 'dark',
      popularity: 74,
      chineseName: '黑暗哥特',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'style_015',
    style: 'Macro Photography',
    prompt: 'macro photography, extreme close-up, shallow depth of field, detailed textures, bokeh background, intricate details, professional macro lens, vivid clarity',
    description: '微距摄影风格：超近特写、浅景深、细腻纹理、虚化背景、精细细节、微观世界',
    tags: ['macro', 'closeup', 'photography', 'details', 'bokeh'],
    metadata: {
      category: 'photography',
      popularity: 71,
      chineseName: '微距摄影',
    },
    isSystem: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];
