import 'package:flutter/material.dart';
import 'package:vector_math/vector_math_64.dart';

/// 坐标点
class Point {
  final double x;
  final double y;

  Point(this.x, this.y);
}

/// 画布坐标转换工具类
/// 
/// 负责屏幕坐标和图片坐标之间的转换
/// 处理缩放、平移等变换
class CanvasTransform {
  final Size imageSize;      // 图片原始尺寸
  final Size displaySize;     // 画布显示尺寸
  final Matrix4 transform;   // 当前变换矩阵
  final double scale;
  final Offset panOffset;

  CanvasTransform({
    required this.imageSize,
    required this.displaySize,
    required this.transform,
    required this.scale,
    required this.panOffset,
  });

  /// 屏幕坐标 → 图片坐标
  /// 
  /// [screenPoint] - 屏幕坐标点
  /// 返回图片坐标系中的点
  Point screenToImage(Offset screenPoint) {
    // 1. 应用逆变换（去除缩放和平移）
    final inverseTransform = Matrix4.inverted(transform);
    final transformedPoint = inverseTransform.transform3(Vector3(
      screenPoint.dx,
      screenPoint.dy,
      0,
    ));
    
    // 2. 转换为图片坐标
    // 注意：变换后的坐标是相对于图片中心的
    final imageX = transformedPoint.x + imageSize.width / 2;
    final imageY = transformedPoint.y + imageSize.height / 2;
    
    // 3. 限制在图片范围内
    return Point(
      imageX.clamp(0.0, imageSize.width),
      imageY.clamp(0.0, imageSize.height),
    );
  }

  /// 图片坐标 → 屏幕坐标
  /// 
  /// [imagePoint] - 图片坐标点
  /// 返回屏幕坐标系中的点
  Offset imageToScreen(Point imagePoint) {
    // 1. 转换为相对于图片中心的坐标
    final relativeX = imagePoint.x - imageSize.width / 2;
    final relativeY = imagePoint.y - imageSize.height / 2;
    
    // 2. 应用变换矩阵
    final transformedPoint = transform.transform3(Vector3(
      relativeX,
      relativeY,
      0,
    ));
    
    return Offset(transformedPoint.x, transformedPoint.y);
  }

  /// 计算图片在画布中的显示区域
  Rect getImageDisplayRect() {
    final imageDisplaySize = Size(
      imageSize.width * scale,
      imageSize.height * scale,
    );
    
    final centerX = displaySize.width / 2;
    final centerY = displaySize.height / 2;
    
    return Rect.fromCenter(
      center: Offset(centerX + panOffset.dx, centerY + panOffset.dy),
      width: imageDisplaySize.width,
      height: imageDisplaySize.height,
    );
  }

  /// 构建变换矩阵
  /// 
  /// 根据图片尺寸、显示尺寸、缩放比例和平移偏移构建变换矩阵
  static Matrix4 buildTransform({
    required Size imageSize,
    required Size displaySize,
    required double scale,
    required Offset panOffset,
  }) {
    // 1. 计算图片中心在画布中的位置（初始居中）
    final centerX = displaySize.width / 2;
    final centerY = displaySize.height / 2;
    
    // 2. 构建变换矩阵
    return Matrix4.identity()
      // 先平移到画布中心
      ..translate(centerX, centerY)
      // 应用用户平移
      ..translate(panOffset.dx, panOffset.dy)
      // 应用缩放（以原点为中心）
      ..scale(scale);
  }

  /// 限制平移偏移（防止图片移出画布）
  static Offset clampPanOffset({
    required Offset pan,
    required Size imageSize,
    required Size displaySize,
    required double scale,
  }) {
    // 计算图片在画布上的显示区域
    final imageDisplaySize = Size(
      imageSize.width * scale,
      imageSize.height * scale,
    );
    
    // 计算最大平移范围
    final maxPanX = (imageDisplaySize.width - displaySize.width) / 2;
    final maxPanY = (imageDisplaySize.height - displaySize.height) / 2;
    
    // 如果图片小于画布，不允许平移
    if (imageDisplaySize.width <= displaySize.width) {
      return Offset(0, pan.dy.clamp(-maxPanY, maxPanY));
    }
    if (imageDisplaySize.height <= displaySize.height) {
      return Offset(pan.dx.clamp(-maxPanX, maxPanX), 0);
    }
    
    return Offset(
      pan.dx.clamp(-maxPanX, maxPanX),
      pan.dy.clamp(-maxPanY, maxPanY),
    );
  }
}

