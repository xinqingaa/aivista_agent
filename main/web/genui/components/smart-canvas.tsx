/**
 * SmartCanvas 组件
 * 展示图片，支持 view 与 draw_mask 蒙版绘制
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { SmartCanvasProps, MaskData } from '@/lib/types/genui';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';

type Point = { x: number; y: number };

export function SmartCanvas({
  imageUrl,
  mode = 'view',
  ratio,
}: SmartCanvasProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [maskPaths, setMaskPaths] = useState<Point[][]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      setImageSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
    setIsLoading(false);
  }, []);

  // 测量容器尺寸
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      if (el) {
        setContainerSize({ width: el.clientWidth, height: el.clientHeight });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [imageSize]);

  // 绘制蒙版到 canvas
  useEffect(() => {
    if (!canvasRef.current || mode !== 'draw_mask') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    [...maskPaths, currentPath].forEach((path) => {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    });
  }, [maskPaths, currentPath, mode]);

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return null;

      const scaleX = (canvasRef.current?.width ?? 1) / rect.width;
      const scaleY = (canvasRef.current?.height ?? 1) / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== 'draw_mask') return;
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        setCurrentPath([point]);
      }
    },
    [mode, getCanvasPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || mode !== 'draw_mask') return;
      const point = getCanvasPoint(e.clientX, e.clientY);
      if (point) {
        setCurrentPath((prev) => [...prev, point]);
      }
    },
    [isDrawing, mode, getCanvasPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;
    setMaskPaths((prev) => [...prev, currentPath]);
    setCurrentPath([]);
    setIsDrawing(false);
  }, [isDrawing, currentPath]);

  const handleClear = useCallback(() => {
    setMaskPaths([]);
    setCurrentPath([]);
  }, []);

  const exportMask = useCallback((): MaskData | null => {
    if (!canvasRef.current || maskPaths.length === 0 || imageSize.width === 0)
      return null;

    const canvas = canvasRef.current;
    const nW = imageSize.width;
    const nH = imageSize.height;
    const cW = canvas.width;
    const cH = canvas.height;
    const s = Math.min(cW / nW, cH / nH);
    const dW = nW * s;
    const dH = nH * s;
    const oX = (cW - dW) / 2;
    const oY = (cH - dH) / 2;

    const toImageCoords = (x: number, y: number) => ({
      x: (x - oX) / s,
      y: (y - oY) / s,
    });

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = nW;
    maskCanvas.height = nH;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return null;

    maskCtx.fillStyle = 'white';
    maskPaths.forEach((path) => {
      if (path.length < 2) return;
      const p0 = toImageCoords(path[0].x, path[0].y);
      maskCtx.beginPath();
      maskCtx.moveTo(p0.x, p0.y);
      for (let i = 1; i < path.length; i++) {
        const p = toImageCoords(path[i].x, path[i].y);
        maskCtx.lineTo(p.x, p.y);
      }
      maskCtx.closePath();
      maskCtx.fill();
    });

    const base64 = maskCanvas.toDataURL('image/png').split(',')[1];
    return {
      base64,
      imageUrl,
      coordinates: maskPaths.flat(),
    };
  }, [maskPaths, imageUrl, imageSize]);

  const handleConfirm = useCallback(() => {
    const maskData = exportMask();
    if (maskData) {
      window.dispatchEvent(
        new CustomEvent('smart-canvas-mask', { detail: { maskData } })
      );
    }
  }, [exportMask]);

  if (mode === 'draw_mask') {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <div
          ref={containerRef}
          className="relative bg-muted max-h-[300px] flex items-center justify-center"
          style={
            imageSize.width > 0
              ? { aspectRatio: `${imageSize.width} / ${imageSize.height}` }
              : undefined
          }
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            </div>
          )}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Canvas"
            className={cn(
              'max-w-full max-h-[300px] object-contain block transition-opacity',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={handleImageLoad}
          />
          {!isLoading && (
            <canvas
              ref={canvasRef}
              width={containerSize.width}
              height={containerSize.height}
              className="absolute inset-0 cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          )}
        </div>

        <div className="flex items-center gap-2 p-3 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={maskPaths.length === 0 && currentPath.length === 0}
          >
            <Eraser className="h-4 w-4 mr-1" />
            清除蒙版
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={maskPaths.length === 0 && currentPath.length === 0}
          >
            <Check className="h-4 w-4 mr-1" />
            确认蒙版
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-muted',
        ratio && 'aspect-[1/1] max-w-md'
      )}
      style={ratio ? { aspectRatio: `1/${ratio}` } : undefined}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        </div>
      )}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Canvas"
        className={cn(
          'block max-h-[200px] max-w-full w-auto h-auto object-contain transition-opacity',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleImageLoad}
      />
    </div>
  );
}
