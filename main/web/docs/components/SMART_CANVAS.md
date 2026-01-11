# 智能画布组件 (Smart Canvas Component)

## 1. 概述

SmartCanvas 是 GenUI 组件系统中的核心组件，用于展示图片并支持蒙版绘制功能，实现局部重绘（Inpainting）功能。

**核心功能：**
- 图片展示
- 蒙版绘制（使用画笔工具）
- 坐标系统转换
- 蒙版数据导出（Base64）

## 2. 组件属性

```typescript
interface SmartCanvasProps {
  imageUrl: string;            // 图片 URL
  mode: 'view' | 'draw_mask'; // 显示模式
  ratio?: number;              // 图片宽高比
  width?: number;              // 画布宽度（可选）
  height?: number;             // 画布高度（可选）
  metadata?: {
    originalImageUrl?: string; // 原图 URL（编辑模式时使用）
    maskData?: MaskData;      // 当前蒙版数据（如果有）
    [key: string]: any;
  };
}
```

## 3. 组件实现

### 3.1 基础结构

```typescript
// components/genui/SmartCanvas.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { SmartCanvasProps, MaskData, Point } from '@/lib/types';

export function SmartCanvas({
  imageUrl,
  mode = 'view',
  ratio,
  width,
  height,
  metadata,
}: SmartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskPaths, setMaskPaths] = useState<Point[][]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // 加载图片并获取尺寸
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 绘制蒙版
  useEffect(() => {
    if (!canvasRef.current || mode !== 'draw_mask') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制所有路径
    [...maskPaths, currentPath].forEach((path) => {
      if (path.length < 2) return;

      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    });
  }, [maskPaths, currentPath, mode]);

  // 处理鼠标/触摸事件
  const handleStart = (clientX: number, clientY: number) => {
    if (mode !== 'draw_mask') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    setIsDrawing(true);
    setCurrentPath([point]);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDrawing || mode !== 'draw_mask') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    setCurrentPath((prev) => [...prev, point]);
  };

  const handleEnd = () => {
    if (!isDrawing) return;

    setMaskPaths((prev) => [...prev, currentPath]);
    setCurrentPath([]);
    setIsDrawing(false);
  };

  // 导出蒙版数据
  const exportMask = async (): Promise<MaskData | null> => {
    if (!canvasRef.current || maskPaths.length === 0) return null;

    const canvas = canvasRef.current;
    
    // 创建蒙版画布
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageSize.width;
    maskCanvas.height = imageSize.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return null;

    // 缩放坐标到原始图片尺寸
    const scaleX = imageSize.width / canvas.width;
    const scaleY = imageSize.height / canvas.height;

    // 绘制蒙版（填充）
    maskCtx.fillStyle = 'white';
    maskPaths.forEach((path) => {
      if (path.length < 2) return;

      maskCtx.beginPath();
      const scaledPath = path.map((p) => ({
        x: p.x * scaleX,
        y: p.y * scaleY,
      }));

      maskCtx.moveTo(scaledPath[0].x, scaledPath[0].y);
      for (let i = 1; i < scaledPath.length; i++) {
        maskCtx.lineTo(scaledPath[i].x, scaledPath[i].y);
      }
      maskCtx.closePath();
      maskCtx.fill();
    });

    // 转换为 Base64
    const base64 = maskCanvas.toDataURL('image/png').split(',')[1];

    return {
      base64,
      imageUrl,
      coordinates: maskPaths.flat(),
    };
  };

  // 计算画布尺寸
  const canvasWidth = width || containerRef.current?.clientWidth || 800;
  const canvasHeight = height || (ratio ? canvasWidth / ratio : 600);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 图片容器 */}
      <div className="relative" style={{ width: canvasWidth, height: canvasHeight }}>
        <Image
          src={imageUrl}
          alt="Canvas image"
          fill
          className="object-contain"
        />
      </div>

      {/* 蒙版画布 */}
      {mode === 'draw_mask' && (
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="absolute top-0 left-0 cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleEnd();
          }}
        />
      )}

      {/* 操作按钮 */}
      {mode === 'draw_mask' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setMaskPaths([]);
              setCurrentPath([]);
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            清除蒙版
          </button>
          <button
            onClick={async () => {
              const maskData = await exportMask();
              if (maskData) {
                // 发送蒙版数据
                window.dispatchEvent(
                  new CustomEvent('smart-canvas-mask', {
                    detail: { maskData },
                  })
                );
              }
            }}
            disabled={maskPaths.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            确认蒙版
          </button>
        </div>
      )}
    </div>
  );
}
```

## 4. 坐标系统

### 4.1 坐标转换

画布坐标需要转换为原始图片坐标：

```typescript
// 画布坐标 → 图片坐标
function canvasToImage(
  canvasPoint: Point,
  canvasSize: { width: number; height: number },
  imageSize: { width: number; height: number }
): Point {
  const scaleX = imageSize.width / canvasSize.width;
  const scaleY = imageSize.height / canvasSize.height;
  
  return {
    x: canvasPoint.x * scaleX,
    y: canvasPoint.y * scaleY,
  };
}
```

### 4.2 图片适应方式

根据图片和容器的尺寸计算适应后的尺寸：

```typescript
function calculateFitSize(
  imageSize: { width: number; height: number },
  containerSize: { width: number; height: number },
  fit: 'contain' | 'cover' = 'contain'
): { width: number; height: number } {
  const imageRatio = imageSize.width / imageSize.height;
  const containerRatio = containerSize.width / containerSize.height;

  if (fit === 'contain') {
    if (imageRatio > containerRatio) {
      return {
        width: containerSize.width,
        height: containerSize.width / imageRatio,
      };
    } else {
      return {
        width: containerSize.height * imageRatio,
        height: containerSize.height,
      };
    }
  } else {
    // cover
    if (imageRatio > containerRatio) {
      return {
        width: containerSize.height * imageRatio,
        height: containerSize.height,
      };
    } else {
      return {
        width: containerSize.width,
        height: containerSize.width / imageRatio,
      };
    }
  }
}
```

## 5. 蒙版绘制

### 5.1 绘制工具

支持以下绘制工具：

- **画笔**: 自由绘制（当前实现）
- **橡皮擦**: 擦除蒙版（可选）
- **矩形选择**: 矩形区域选择（可选）
- **圆形选择**: 圆形区域选择（可选）

### 5.2 绘制优化

```typescript
// 使用 requestAnimationFrame 优化绘制
const drawFrame = useRef<number>();

const draw = () => {
  if (!canvasRef.current) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 绘制逻辑
  // ...

  drawFrame.current = requestAnimationFrame(draw);
};

// 开始绘制
useEffect(() => {
  if (mode === 'draw_mask') {
    drawFrame.current = requestAnimationFrame(draw);
  }

  return () => {
    if (drawFrame.current) {
      cancelAnimationFrame(drawFrame.current);
    }
  };
}, [mode]);
```

## 6. 蒙版数据导出

### 6.1 Base64 编码

```typescript
async function exportMaskToBase64(
  maskCanvas: HTMLCanvasElement
): Promise<string> {
  return new Promise((resolve, reject) => {
    maskCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      'image/png'
    );
  });
}
```

### 6.2 蒙版数据格式

```typescript
interface MaskData {
  base64: string;              // Base64 编码的蒙版图片
  imageUrl: string;             // 原图 URL
  coordinates?: Point[];        // 蒙版路径点（可选）
  bounds?: {                    // 蒙版边界框（可选）
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

## 7. 事件处理

### 7.1 蒙版确认事件

```typescript
// 监听蒙版确认事件
useEffect(() => {
  const handleMaskConfirm = (event: CustomEvent) => {
    const { maskData } = event.detail;
    
    // 发送到后端
    sendMessage({
      text: '修改这里',
      maskData,
    });
  };

  window.addEventListener('smart-canvas-mask', handleMaskConfirm as EventListener);
  
  return () => {
    window.removeEventListener('smart-canvas-mask', handleMaskConfirm as EventListener);
  };
}, []);
```

## 8. 响应式设计

### 8.1 移动端适配

```typescript
// 移动端触摸支持
const handleTouch = (e: React.TouchEvent) => {
  e.preventDefault();
  const touch = e.touches[0];
  // 处理触摸事件
};
```

### 8.2 画布尺寸自适应

```typescript
// 根据容器尺寸自适应
const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

useEffect(() => {
  const updateSize = () => {
    if (containerRef.current) {
      setCanvasSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  };

  updateSize();
  window.addEventListener('resize', updateSize);
  
  return () => {
    window.removeEventListener('resize', updateSize);
  };
}, []);
```

## 9. 性能优化

### 9.1 路径简化

对于大量路径点，可以使用 Douglas-Peucker 算法简化：

```typescript
// 简化路径（减少点数）
function simplifyPath(points: Point[], tolerance: number): Point[] {
  // Douglas-Peucker 算法实现
  // ...
}
```

### 9.2 防抖绘制

```typescript
// 使用防抖减少绘制频率
const debouncedDraw = useMemo(
  () => debounce(() => {
    // 绘制逻辑
  }, 16), // 约 60fps
  []
);
```

## 10. 相关文档

- [GenUI 组件系统](./GENUI_COMPONENTS.md)
- [坐标系统说明](../../../docs/canvas_coordinate_system.md)
- [类型定义](../api/TYPES.md)
