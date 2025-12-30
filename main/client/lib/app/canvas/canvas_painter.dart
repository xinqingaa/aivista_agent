import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import 'package:aivista_client/models/mask_data.dart';

/// 图片绘制器
/// 
/// 使用 CustomPainter 绘制图片
class ImagePainter extends CustomPainter {
  final ui.Image image;
  final Size imageSize;
  final Size displaySize;
  final Matrix4 transform;

  ImagePainter({
    required this.image,
    required this.imageSize,
    required this.displaySize,
    required this.transform,
  });

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.transform(transform.storage);
    
    // 计算图片在画布中的位置（居中显示）
    final imageRect = Rect.fromCenter(
      center: Offset.zero, // 变换矩阵已经处理了居中
      width: imageSize.width,
      height: imageSize.height,
    );
    
    // 绘制图片
    canvas.drawImageRect(
      image,
      Rect.fromLTWH(0, 0, imageSize.width, imageSize.height),
      imageRect,
      Paint(),
    );
    
    canvas.restore();
  }

  @override
  bool shouldRepaint(ImagePainter oldDelegate) {
    return image != oldDelegate.image ||
           transform != oldDelegate.transform ||
           displaySize != oldDelegate.displaySize;
  }
}

/// 蒙版绘制器
/// 
/// 使用 CustomPainter 绘制蒙版路径
class MaskPainter extends CustomPainter {
  final List<MaskPath> maskPaths;
  final MaskPath? currentPath;
  final Matrix4 transform;

  MaskPainter({
    required this.maskPaths,
    this.currentPath,
    required this.transform,
  });

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.transform(transform.storage);
    
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    
    // 绘制已完成的路径
    for (final path in maskPaths) {
      paint.color = Color(path.color);
      paint.strokeWidth = path.strokeWidth;
      _drawPath(canvas, path.points, paint);
    }
    
    // 绘制当前正在绘制的路径
    if (currentPath != null) {
      paint.color = Color(currentPath!.color);
      paint.strokeWidth = currentPath!.strokeWidth;
      _drawPath(canvas, currentPath!.points, paint);
    }
    
    canvas.restore();
  }

  /// 绘制路径
  void _drawPath(Canvas canvas, List<Offset> points, Paint paint) {
    if (points.isEmpty) return;
    
    final path = Path();
    path.moveTo(points.first.dx, points.first.dy);
    
    for (int i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }
    
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(MaskPainter oldDelegate) {
    return maskPaths != oldDelegate.maskPaths ||
           currentPath != oldDelegate.currentPath ||
           transform != oldDelegate.transform;
  }
}

