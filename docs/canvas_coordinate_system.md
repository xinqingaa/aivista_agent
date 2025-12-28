# 画布坐标系统技术文档 (Canvas Coordinate System)

## 1. 目标

本文档详细说明智能画布中屏幕坐标与图片逻辑坐标之间的转换算法，这是实现精确蒙版绘制的核心技术基础。

**核心目标：**
- 理解坐标系统的数学原理
- 实现精确的坐标转换算法
- 处理不同缩放比例下的坐标映射
- 支持蒙版路径的序列化和反序列化

## 2. 坐标系统概述

### 2.1 三种坐标系统

智能画布涉及三种不同的坐标系统：

1. **屏幕坐标 (Screen Coordinates)**
   - 以画布 Widget 的左上角为原点 (0, 0)
   - 单位：像素 (pixels)
   - 范围：`[0, displayWidth] × [0, displayHeight]`

2. **画布坐标 (Canvas Coordinates)**
   - 应用变换矩阵后的坐标
   - 考虑缩放和平移后的坐标
   - 用于绘制操作

3. **图片坐标 (Image Coordinates)**
   - 以图片左上角为原点 (0, 0)
   - 单位：像素 (pixels)
   - 范围：`[0, imageWidth] × [0, imageHeight]`

### 2.2 坐标转换关系

```
屏幕坐标 → [应用变换矩阵] → 画布坐标 → [去除变换] → 图片坐标
```

## 3. 变换矩阵

### 3.1 矩阵组成

画布的变换矩阵由以下操作组成（按顺序）：

1. **平移 (Translation)**: 将图片中心移动到画布中心
2. **缩放 (Scale)**: 根据缩放比例缩放图片
3. **平移 (Translation)**: 根据用户手势平移图片

### 3.2 矩阵构建

```dart
Matrix4 buildTransform({
  required Size imageSize,
  required Size displaySize,
  required double scale,
  required Offset panOffset,
}) {
  // 1. 计算图片在画布中的显示尺寸
  final imageDisplaySize = Size(
    imageSize.width * scale,
    imageSize.height * scale,
  );
  
  // 2. 计算图片中心在画布中的位置（初始居中）
  final centerX = displaySize.width / 2;
  final centerY = displaySize.height / 2;
  
  // 3. 构建变换矩阵
  return Matrix4.identity()
    // 先平移到画布中心
    ..translate(centerX, centerY)
    // 应用用户平移
    ..translate(panOffset.dx, panOffset.dy)
    // 应用缩放（以原点为中心）
    ..scale(scale);
}
```

### 3.3 矩阵分解

```dart
class TransformComponents {
  final Offset translation;
  final double scale;
  
  TransformComponents(this.translation, this.scale);
  
  static TransformComponents fromMatrix(Matrix4 matrix) {
    // 提取缩放（矩阵对角线元素）
    final scaleX = matrix.getRow(0).storage[0];
    final scaleY = matrix.getRow(1).storage[1];
    final scale = (scaleX + scaleY) / 2; // 平均缩放（假设均匀缩放）
    
    // 提取平移（矩阵最后一列的前两个元素）
    final translationX = matrix.getRow(0).storage[3];
    final translationY = matrix.getRow(1).storage[3];
    final translation = Offset(translationX, translationY);
    
    return TransformComponents(translation, scale);
  }
}
```

## 4. 坐标转换算法

### 4.1 屏幕坐标 → 图片坐标

```dart
Point screenToImage(
  Offset screenPoint,
  Matrix4 transform,
  Size imageSize,
) {
  // 1. 构建逆变换矩阵
  final inverseTransform = Matrix4.inverted(transform);
  
  // 2. 应用逆变换
  final transformedPoint = inverseTransform.transform3(Vector3(
    screenPoint.dx,
    screenPoint.dy,
    0,
  ));
  
  // 3. 转换为图片坐标
  // 注意：变换后的坐标是相对于图片中心的
  final imageX = transformedPoint.x + imageSize.width / 2;
  final imageY = transformedPoint.y + imageSize.height / 2;
  
  // 4. 限制在图片范围内
  return Point(
    imageX.clamp(0.0, imageSize.width),
    imageY.clamp(0.0, imageSize.height),
  );
}
```

### 4.2 图片坐标 → 屏幕坐标

```dart
Offset imageToScreen(
  Point imagePoint,
  Matrix4 transform,
  Size imageSize,
) {
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
```

### 4.3 简化版本（无矩阵）

如果不想使用矩阵，可以直接计算：

```dart
Point screenToImageSimple({
  required Offset screenPoint,
  required Size imageSize,
  required Size displaySize,
  required double scale,
  required Offset panOffset,
}) {
  // 1. 计算图片在画布中的显示尺寸
  final imageDisplaySize = Size(
    imageSize.width * scale,
    imageSize.height * scale,
  );
  
  // 2. 计算图片在画布中的位置（左上角）
  final imageLeft = (displaySize.width - imageDisplaySize.width) / 2 + panOffset.dx;
  final imageTop = (displaySize.height - imageDisplaySize.height) / 2 + panOffset.dy;
  
  // 3. 计算屏幕点相对于图片左上角的位置
  final relativeX = screenPoint.dx - imageLeft;
  final relativeY = screenPoint.dy - imageTop;
  
  // 4. 转换为图片坐标（考虑缩放）
  final imageX = relativeX / scale;
  final imageY = relativeY / scale;
  
  // 5. 限制在图片范围内
  return Point(
    imageX.clamp(0.0, imageSize.width),
    imageY.clamp(0.0, imageSize.height),
  );
}
```

## 5. 不同缩放比例下的处理

### 5.1 缩放中心保持不变

当用户进行缩放操作时，需要保持缩放中心点不变：

```dart
Offset adjustPanForScale({
  required Offset oldPan,
  required Offset focalPoint, // 缩放中心点（屏幕坐标）
  required double oldScale,
  required double newScale,
  required Size imageSize,
  required Size displaySize,
}) {
  // 计算缩放中心在图片坐标系中的位置
  final focalImagePoint = screenToImage(
    focalPoint,
    buildTransform(
      imageSize: imageSize,
      displaySize: displaySize,
      scale: oldScale,
      panOffset: oldPan,
    ),
    imageSize,
  );
  
  // 计算新缩放下，该点在屏幕上的位置
  final newFocalScreenPoint = imageToScreen(
    focalImagePoint,
    buildTransform(
      imageSize: imageSize,
      displaySize: displaySize,
      scale: newScale,
      panOffset: oldPan, // 临时使用旧平移
    ),
    imageSize,
  );
  
  // 计算需要调整的平移量
  final delta = focalPoint - newFocalScreenPoint;
  
  return oldPan + delta;
}
```

### 5.2 边界限制

确保图片不会移出画布边界：

```dart
Offset clampPanOffset({
  required Offset pan,
  required double scale,
  required Size imageSize,
  required Size displaySize,
}) {
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
```

## 6. 蒙版路径序列化

### 6.1 路径数据结构

```dart
class MaskPath {
  final List<Offset> screenPoints; // 屏幕坐标点
  final double strokeWidth;
  final Color color;
  
  // 转换为图片坐标
  List<Point> toImageCoordinates(CanvasTransform transform) {
    return screenPoints.map((screenPoint) {
      return transform.screenToImage(screenPoint);
    }).toList();
  }
  
  // 序列化为 JSON
  Map<String, dynamic> toJson(CanvasTransform transform) {
    final imagePoints = toImageCoordinates(transform);
    return {
      'points': imagePoints.map((p) => {
        'x': p.x,
        'y': p.y,
      }).toList(),
      'strokeWidth': strokeWidth,
      'color': color.value,
    };
  }
  
  // 从 JSON 反序列化
  factory MaskPath.fromJson(Map<String, dynamic> json, CanvasTransform transform) {
    final imagePoints = (json['points'] as List)
        .map((p) => Point(p['x'] as double, p['y'] as double))
        .toList();
    
    final screenPoints = imagePoints.map((imagePoint) {
      return transform.imageToScreen(imagePoint);
    }).toList();
    
    return MaskPath(
      screenPoints: screenPoints,
      strokeWidth: json['strokeWidth'] as double? ?? 3.0,
      color: Color(json['color'] as int? ?? Colors.red.value),
    );
  }
}
```

### 6.2 Base64 蒙版图片生成

```dart
Future<String> generateMaskBase64({
  required ui.Image image,
  required List<MaskPath> maskPaths,
  required CanvasTransform transform,
}) async {
  // 创建与图片相同尺寸的画布
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  
  // 绘制黑色背景
  canvas.drawRect(
    Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble()),
    Paint()..color = Colors.black,
  );
  
  // 绘制白色蒙版区域
  final maskPaint = Paint()
    ..color = Colors.white
    ..style = PaintingStyle.fill;
  
  for (final path in maskPaths) {
    final imagePoints = path.toImageCoordinates(transform);
    if (imagePoints.isEmpty) continue;
    
    // 构建路径
    final maskPath = Path();
    maskPath.moveTo(imagePoints.first.x, imagePoints.first.y);
    for (int i = 1; i < imagePoints.length; i++) {
      maskPath.lineTo(imagePoints[i].x, imagePoints[i].y);
    }
    maskPath.close();
    
    // 绘制路径
    canvas.drawPath(maskPath, maskPaint);
  }
  
  // 转换为图片
  final picture = recorder.endRecording();
  final maskImage = await picture.toImage(image.width, image.height);
  final byteData = await maskImage.toByteData(format: ui.ImageByteFormat.png);
  final bytes = byteData!.buffer.asUint8List();
  
  // 转换为 Base64
  return base64Encode(bytes);
}
```

## 7. 坐标转换测试

### 7.1 单元测试

```dart
void main() {
  test('screenToImage conversion', () {
    final imageSize = Size(800, 600);
    final displaySize = Size(400, 300);
    final scale = 0.5;
    final panOffset = Offset(0, 0);
    
    final transform = buildTransform(
      imageSize: imageSize,
      displaySize: displaySize,
      scale: scale,
      panOffset: panOffset,
    );
    
    // 测试画布中心点（应该对应图片中心）
    final screenCenter = Offset(displaySize.width / 2, displaySize.height / 2);
    final imagePoint = screenToImage(screenCenter, transform, imageSize);
    
    expect(imagePoint.x, closeTo(imageSize.width / 2, 1));
    expect(imagePoint.y, closeTo(imageSize.height / 2, 1));
  });
  
  test('imageToScreen conversion', () {
    final imageSize = Size(800, 600);
    final displaySize = Size(400, 300);
    final scale = 0.5;
    final panOffset = Offset(0, 0);
    
    final transform = buildTransform(
      imageSize: imageSize,
      displaySize: displaySize,
      scale: scale,
      panOffset: panOffset,
    );
    
    // 测试图片中心点（应该对应画布中心）
    final imageCenter = Point(imageSize.width / 2, imageSize.height / 2);
    final screenPoint = imageToScreen(imageCenter, transform, imageSize);
    
    expect(screenPoint.dx, closeTo(displaySize.width / 2, 1));
    expect(screenPoint.dy, closeTo(displaySize.height / 2, 1));
  });
  
  test('round-trip conversion', () {
    final imageSize = Size(800, 600);
    final displaySize = Size(400, 300);
    final scale = 0.75;
    final panOffset = Offset(10, 20);
    
    final transform = buildTransform(
      imageSize: imageSize,
      displaySize: displaySize,
      scale: scale,
      panOffset: panOffset,
    );
    
    // 测试往返转换
    final originalImagePoint = Point(100, 200);
    final screenPoint = imageToScreen(originalImagePoint, transform, imageSize);
    final convertedImagePoint = screenToImage(screenPoint, transform, imageSize);
    
    expect(convertedImagePoint.x, closeTo(originalImagePoint.x, 0.1));
    expect(convertedImagePoint.y, closeTo(originalImagePoint.y, 0.1));
  });
}
```

## 8. 性能优化

### 8.1 坐标转换缓存

对于频繁转换的坐标点，可以缓存结果：

```dart
class CoordinateCache {
  final Map<String, Point> _cache = {};
  static const int maxCacheSize = 100;
  
  Point? get(Offset screenPoint, Matrix4 transform) {
    final key = '${screenPoint.dx}_${screenPoint.dy}_${transform.toString()}';
    return _cache[key];
  }
  
  void put(Offset screenPoint, Matrix4 transform, Point imagePoint) {
    if (_cache.length >= maxCacheSize) {
      _cache.remove(_cache.keys.first);
    }
    final key = '${screenPoint.dx}_${screenPoint.dy}_${transform.toString()}';
    _cache[key] = imagePoint;
  }
  
  void clear() {
    _cache.clear();
  }
}
```

### 8.2 批量转换

对于大量点的转换，可以使用批量处理：

```dart
List<Point> batchScreenToImage(
  List<Offset> screenPoints,
  Matrix4 transform,
  Size imageSize,
) {
  final inverseTransform = Matrix4.inverted(transform);
  return screenPoints.map((screenPoint) {
    final transformed = inverseTransform.transform3(Vector3(
      screenPoint.dx,
      screenPoint.dy,
      0,
    ));
    return Point(
      (transformed.x + imageSize.width / 2).clamp(0.0, imageSize.width),
      (transformed.y + imageSize.height / 2).clamp(0.0, imageSize.height),
    );
  }).toList();
}
```

## 9. 边界情况处理

### 9.1 图片超出画布

当图片尺寸大于画布时，需要正确处理边界：

```dart
bool isPointInImageBounds(Point imagePoint, Size imageSize) {
  return imagePoint.x >= 0 &&
         imagePoint.x <= imageSize.width &&
         imagePoint.y >= 0 &&
         imagePoint.y <= imageSize.height;
}
```

### 9.2 缩放为 0 或负数

防止除零错误和无效缩放：

```dart
double clampScale(double scale) {
  return scale.clamp(0.1, 5.0); // 限制在 0.1x 到 5x 之间
}
```

### 9.3 坐标精度问题

使用浮点数时注意精度：

```dart
Point roundImagePoint(Point point, {int decimals = 2}) {
  final factor = pow(10, decimals);
  return Point(
    (point.x * factor).round() / factor,
    (point.y * factor).round() / factor,
  );
}
```

## 10. 实际应用示例

### 10.1 绘制蒙版时的坐标转换

```dart
void onPanUpdate(DragUpdateDetails details) {
  if (widget.mode == CanvasMode.drawMask) {
    final screenPoint = details.localPosition;
    
    // 转换为图片坐标
    final imagePoint = screenToImage(
      screenPoint,
      _state.transform,
      _state.imageSize,
    );
    
    // 添加到当前路径
    _addPointToCurrentPath(screenPoint);
    
    // 可选：同时保存图片坐标用于后端传输
    _currentImagePoints.add(imagePoint);
  }
}
```

### 10.2 发送蒙版数据到后端

```dart
MaskData prepareMaskDataForBackend() {
  // 将所有路径转换为图片坐标
  final allImagePoints = _state.maskPaths
      .expand((path) => path.toImageCoordinates(_transform))
      .toList();
  
  return MaskData(
    imageUrl: _state.currentImageUrl!,
    coordinates: allImagePoints.map((p) => {
      'x': p.x,
      'y': p.y,
    }).toList(),
  );
}
```

