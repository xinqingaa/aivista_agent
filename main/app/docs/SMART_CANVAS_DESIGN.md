# 智能画布详细设计文档 (Smart Canvas Design)

## 1. 目标

本文档详细定义 AiVista 前端智能画布组件的完整设计，确保能够复刻即梦 AI 的核心交互逻辑，支持缩放、平移、蒙版绘制、撤销/重做等完整功能。

**核心目标：**
- 实现流畅的交互手势（缩放、平移、绘制）
- 支持完整的蒙版绘制功能（路径绘制、撤销、清除）
- 精确的坐标系统转换
- 高性能的渲染优化
- 状态持久化支持

## 2. 组件架构

### 2.1 组件层次结构

```
SmartCanvas (StatefulWidget)
├── GestureDetector (手势检测)
│   ├── ScaleGesture (缩放)
│   ├── PanGesture (平移)
│   └── DrawGesture (绘制)
├── CustomPaint (自定义绘制)
│   ├── ImagePainter (图片绘制)
│   └── MaskPainter (蒙版绘制)
└── RepaintBoundary (性能优化)
```

### 2.2 核心类定义

```dart
class SmartCanvas extends StatefulWidget {
  final String imageUrl;
  final CanvasMode mode; // 'view' | 'draw_mask'
  final double? ratio;
  final Function(MaskData)? onMaskChanged;
  final Function(String)? onImageTapped;

  const SmartCanvas({
    Key? key,
    required this.imageUrl,
    required this.mode,
    this.ratio,
    this.onMaskChanged,
    this.onImageTapped,
  }) : super(key: key);

  @override
  State<SmartCanvas> createState() => _SmartCanvasState();
}
```

## 3. 状态管理

### 3.1 CanvasState 数据结构

```dart
class CanvasState {
  // 图片相关
  final String imageUrl;
  final ui.Image? image; // 加载后的图片对象
  final Size imageSize; // 图片原始尺寸
  final Size displaySize; // 画布显示尺寸
  
  // 变换矩阵（用于缩放和平移）
  final Matrix4 transform;
  final double scale;
  final Offset panOffset;
  
  // 蒙版路径
  final List<MaskPath> maskPaths; // 所有绘制的路径
  final MaskPath? currentPath; // 当前正在绘制的路径
  
  // 历史记录（支持撤销/重做）
  final List<CanvasState> history;
  final int historyIndex; // 当前历史位置
  
  // 模式
  final CanvasMode mode;
  
  // 绘制参数
  final double strokeWidth;
  final Color strokeColor;
  
  CanvasState({
    required this.imageUrl,
    this.image,
    required this.imageSize,
    required this.displaySize,
    Matrix4? transform,
    this.scale = 1.0,
    this.panOffset = Offset.zero,
    List<MaskPath>? maskPaths,
    this.currentPath,
    List<CanvasState>? history,
    this.historyIndex = -1,
    required this.mode,
    this.strokeWidth = 3.0,
    this.strokeColor = Colors.red,
  }) : transform = transform ?? Matrix4.identity(),
       maskPaths = maskPaths ?? [],
       history = history ?? [];
  
  // 复制并创建新状态（用于不可变更新）
  CanvasState copyWith({
    String? imageUrl,
    ui.Image? image,
    Size? imageSize,
    Size? displaySize,
    Matrix4? transform,
    double? scale,
    Offset? panOffset,
    List<MaskPath>? maskPaths,
    MaskPath? currentPath,
    List<CanvasState>? history,
    int? historyIndex,
    CanvasMode? mode,
    double? strokeWidth,
    Color? strokeColor,
  }) {
    return CanvasState(
      imageUrl: imageUrl ?? this.imageUrl,
      image: image ?? this.image,
      imageSize: imageSize ?? this.imageSize,
      displaySize: displaySize ?? this.displaySize,
      transform: transform ?? this.transform,
      scale: scale ?? this.scale,
      panOffset: panOffset ?? this.panOffset,
      maskPaths: maskPaths ?? this.maskPaths,
      currentPath: currentPath ?? this.currentPath,
      history: history ?? this.history,
      historyIndex: historyIndex ?? this.historyIndex,
      mode: mode ?? this.mode,
      strokeWidth: strokeWidth ?? this.strokeWidth,
      strokeColor: strokeColor ?? this.strokeColor,
    );
  }
}

enum CanvasMode {
  view,      // 查看模式
  drawMask,  // 绘制蒙版模式
}
```

### 3.2 MaskPath 数据结构

```dart
class MaskPath {
  final List<Offset> points; // 路径点（屏幕坐标）
  final double strokeWidth;
  final Color color;
  final DateTime createdAt;

  MaskPath({
    required this.points,
    this.strokeWidth = 3.0,
    this.color = Colors.red,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  // 转换为图片坐标
  List<Point> toImageCoordinates(CanvasTransform transform) {
    return points.map((screenPoint) {
      return transform.screenToImage(screenPoint);
    }).toList();
  }

  // 序列化为 JSON（用于传输到后端）
  Map<String, dynamic> toJson() {
    return {
      'points': points.map((p) => {'x': p.dx, 'y': p.dy}).toList(),
      'strokeWidth': strokeWidth,
      'color': color.value,
    };
  }
}
```

## 4. 交互手势处理

### 4.1 缩放手势（Pinch）

```dart
class _SmartCanvasState extends State<SmartCanvas> {
  void _handleScaleStart(ScaleStartDetails details) {
    _lastScale = _state.scale;
    _lastPanOffset = _state.panOffset;
  }

  void _handleScaleUpdate(ScaleUpdateDetails details) {
    if (details.pointerCount == 2) {
      // 双指缩放
      final newScale = _lastScale * details.scale;
      final clampedScale = newScale.clamp(0.5, 5.0); // 限制缩放范围
      
      // 计算缩放中心点
      final focalPoint = details.focalPoint;
      final focalPointDelta = details.focalPointDelta;
      
      // 调整平移偏移，使缩放中心保持不变
      final scaleDelta = clampedScale / _lastScale;
      final newPanOffset = Offset(
        _lastPanOffset.dx + (focalPoint.dx - _lastPanOffset.dx) * (1 - scaleDelta),
        _lastPanOffset.dy + (focalPoint.dy - _lastPanOffset.dy) * (1 - scaleDelta),
      );
      
      setState(() {
        _state = _state.copyWith(
          scale: clampedScale,
          panOffset: newPanOffset,
          transform: _buildTransform(clampedScale, newPanOffset),
        );
      });
    }
  }

  Matrix4 _buildTransform(double scale, Offset pan) {
    return Matrix4.identity()
      ..translate(pan.dx, pan.dy)
      ..scale(scale);
  }
}
```

### 4.2 平移手势（Pan）

```dart
void _handlePanStart(DragStartDetails details) {
  _lastPanOffset = _state.panOffset;
  _panStartPoint = details.localPosition;
}

void _handlePanUpdate(DragUpdateDetails details) {
  if (widget.mode == CanvasMode.view) {
    // 查看模式：平移图片
    final newPanOffset = Offset(
      _lastPanOffset.dx + details.delta.dx,
      _lastPanOffset.dy + details.delta.dy,
    );
    
    // 限制平移范围（防止图片移出画布）
    final clampedPan = _clampPanOffset(newPanOffset);
    
    setState(() {
      _state = _state.copyWith(
        panOffset: clampedPan,
        transform: _buildTransform(_state.scale, clampedPan),
      );
    });
  } else if (widget.mode == CanvasMode.drawMask) {
    // 绘制模式：绘制蒙版路径
    _addPointToCurrentPath(details.localPosition);
  }
}

Offset _clampPanOffset(Offset pan) {
  // 计算图片在画布上的显示区域
  final imageDisplaySize = Size(
    _state.imageSize.width * _state.scale,
    _state.imageSize.height * _state.scale,
  );
  
  final maxPanX = (imageDisplaySize.width - _state.displaySize.width) / 2;
  final maxPanY = (imageDisplaySize.height - _state.displaySize.height) / 2;
  
  return Offset(
    pan.dx.clamp(-maxPanX, maxPanX),
    pan.dy.clamp(-maxPanY, maxPanY),
  );
}
```

### 4.3 绘制手势（Draw）

```dart
void _handlePanStart(DragStartDetails details) {
  if (widget.mode == CanvasMode.drawMask) {
    // 开始新的路径
    final screenPoint = details.localPosition;
    final imagePoint = _transform.screenToImage(screenPoint);
    
    setState(() {
      _state = _state.copyWith(
        currentPath: MaskPath(
          points: [screenPoint],
          strokeWidth: _state.strokeWidth,
          color: _state.strokeColor,
        ),
      );
    });
  }
}

void _handlePanUpdate(DragUpdateDetails details) {
  if (widget.mode == CanvasMode.drawMask && _state.currentPath != null) {
    // 添加点到当前路径
    final screenPoint = details.localPosition;
    final currentPoints = List<Offset>.from(_state.currentPath!.points);
    currentPoints.add(screenPoint);
    
    setState(() {
      _state = _state.copyWith(
        currentPath: MaskPath(
          points: currentPoints,
          strokeWidth: _state.currentPath!.strokeWidth,
          color: _state.currentPath!.color,
        ),
      );
    });
  }
}

void _handlePanEnd(DragEndDetails details) {
  if (widget.mode == CanvasMode.drawMask && _state.currentPath != null) {
    // 完成当前路径，添加到历史
    final completedPath = _state.currentPath!;
    final newPaths = List<MaskPath>.from(_state.maskPaths)..add(completedPath);
    
    // 保存到历史记录
    final newHistory = List<CanvasState>.from(_state.history);
    newHistory.add(_state);
    
    setState(() {
      _state = _state.copyWith(
        maskPaths: newPaths,
        currentPath: null,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      );
    });
    
    // 通知外部蒙版已更改
    _notifyMaskChanged();
  }
}

void _addPointToCurrentPath(Offset screenPoint) {
  if (_state.currentPath == null) return;
  
  final currentPoints = List<Offset>.from(_state.currentPath!.points);
  currentPoints.add(screenPoint);
  
  setState(() {
    _state = _state.copyWith(
      currentPath: MaskPath(
        points: currentPoints,
        strokeWidth: _state.currentPath!.strokeWidth,
        color: _state.currentPath!.color,
      ),
    );
  });
}
```

## 5. 坐标系统转换

### 5.1 CanvasTransform 类

```dart
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

  // 屏幕坐标 → 图片坐标
  Point screenToImage(Offset screenPoint) {
    // 1. 应用逆变换（去除缩放和平移）
    final inverseTransform = Matrix4.inverted(transform);
    final transformedPoint = inverseTransform.transform3(Vector3(
      screenPoint.dx,
      screenPoint.dy,
      0,
    ));
    
    // 2. 转换为图片坐标（考虑图片在画布中的位置）
    final imageX = transformedPoint.x;
    final imageY = transformedPoint.y;
    
    // 3. 限制在图片范围内
    return Point(
      imageX.clamp(0.0, imageSize.width),
      imageY.clamp(0.0, imageSize.height),
    );
  }

  // 图片坐标 → 屏幕坐标
  Offset imageToScreen(Point imagePoint) {
    // 1. 应用变换（缩放和平移）
    final transformedPoint = transform.transform3(Vector3(
      imagePoint.x,
      imagePoint.y,
      0,
    ));
    
    return Offset(transformedPoint.x, transformedPoint.y);
  }

  // 计算图片在画布中的显示区域
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
}

class Point {
  final double x;
  final double y;
  
  Point(this.x, this.y);
}
```

### 5.2 坐标转换使用示例

```dart
// 在绘制蒙版时，将屏幕坐标转换为图片坐标
void _notifyMaskChanged() {
  if (widget.onMaskChanged == null) return;
  
  final transform = CanvasTransform(
    imageSize: _state.imageSize,
    displaySize: _state.displaySize,
    transform: _state.transform,
    scale: _state.scale,
    panOffset: _state.panOffset,
  );
  
  // 将所有路径转换为图片坐标
  final imagePaths = _state.maskPaths.map((path) {
    return path.toImageCoordinates(transform);
  }).toList();
  
  // 生成蒙版数据（这里简化，实际需要生成 Base64 图片）
  final maskData = MaskData(
    imageUrl: widget.imageUrl,
    coordinates: imagePaths.expand((path) => path).toList(),
  );
  
  widget.onMaskChanged?.call(maskData);
}
```

## 6. 自定义绘制

### 6.1 ImagePainter

```dart
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
    final imageDisplaySize = Size(
      imageSize.width,
      imageSize.height,
    );
    
    final centerX = displaySize.width / 2;
    final centerY = displaySize.height / 2;
    
    final imageRect = Rect.fromCenter(
      center: Offset(centerX, centerY),
      width: imageDisplaySize.width,
      height: imageDisplaySize.height,
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
```

### 6.2 MaskPainter

```dart
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
      paint.color = path.color;
      paint.strokeWidth = path.strokeWidth;
      _drawPath(canvas, path.points, paint);
    }
    
    // 绘制当前正在绘制的路径
    if (currentPath != null) {
      paint.color = currentPath!.color;
      paint.strokeWidth = currentPath!.strokeWidth;
      _drawPath(canvas, currentPath!.points, paint);
    }
    
    canvas.restore();
  }

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
```

## 7. 撤销/重做机制

### 7.1 历史记录管理

```dart
class CanvasHistory {
  final List<CanvasState> _history = [];
  int _currentIndex = -1;
  static const int maxHistorySize = 50;

  // 添加状态到历史
  void push(CanvasState state) {
    // 如果当前不在历史末尾，删除后面的记录
    if (_currentIndex < _history.length - 1) {
      _history.removeRange(_currentIndex + 1, _history.length);
    }
    
    // 添加新状态
    _history.add(state);
    
    // 限制历史记录大小
    if (_history.length > maxHistorySize) {
      _history.removeAt(0);
    } else {
      _currentIndex++;
    }
  }

  // 撤销
  CanvasState? undo() {
    if (_currentIndex > 0) {
      _currentIndex--;
      return _history[_currentIndex];
    }
    return null;
  }

  // 重做
  CanvasState? redo() {
    if (_currentIndex < _history.length - 1) {
      _currentIndex++;
      return _history[_currentIndex];
    }
    return null;
  }

  // 检查是否可以撤销
  bool canUndo() => _currentIndex > 0;

  // 检查是否可以重做
  bool canRedo() => _currentIndex < _history.length - 1;

  // 清除历史
  void clear() {
    _history.clear();
    _currentIndex = -1;
  }
}
```

### 7.2 撤销/重做实现

```dart
void _undo() {
  final history = CanvasHistory();
  history._history.addAll(_state.history);
  history._currentIndex = _state.historyIndex;
  
  final previousState = history.undo();
  if (previousState != null) {
    setState(() {
      _state = previousState.copyWith(
        history: history._history,
        historyIndex: history._currentIndex,
      );
    });
    _notifyMaskChanged();
  }
}

void _redo() {
  final history = CanvasHistory();
  history._history.addAll(_state.history);
  history._currentIndex = _state.historyIndex;
  
  final nextState = history.redo();
  if (nextState != null) {
    setState(() {
      _state = nextState.copyWith(
        history: history._history,
        historyIndex: history._currentIndex,
      );
    });
    _notifyMaskChanged();
  }
}
```

## 8. 性能优化

### 8.1 RepaintBoundary 使用

```dart
@override
Widget build(BuildContext context) {
  return RepaintBoundary(
    child: GestureDetector(
      onScaleStart: _handleScaleStart,
      onScaleUpdate: _handleScaleUpdate,
      onScaleEnd: _handleScaleEnd,
      onPanStart: _handlePanStart,
      onPanUpdate: _handlePanUpdate,
      onPanEnd: _handlePanEnd,
      child: CustomPaint(
        painter: ImagePainter(
          image: _state.image!,
          imageSize: _state.imageSize,
          displaySize: _state.displaySize,
          transform: _state.transform,
        ),
        foregroundPainter: MaskPainter(
          maskPaths: _state.maskPaths,
          currentPath: _state.currentPath,
          transform: _state.transform,
        ),
        size: _state.displaySize,
      ),
    ),
  );
}
```

### 8.2 路径优化

```dart
// 减少路径点数量（使用 Douglas-Peucker 算法简化路径）
class PathSimplifier {
  static List<Offset> simplify(List<Offset> points, double tolerance) {
    if (points.length <= 2) return points;
    
    // 找到距离首尾连线最远的点
    double maxDistance = 0;
    int maxIndex = 0;
    
    for (int i = 1; i < points.length - 1; i++) {
      final distance = _pointToLineDistance(
        points[i],
        points.first,
        points.last,
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    // 如果最远距离大于容差，递归简化
    if (maxDistance > tolerance) {
      final left = simplify(points.sublist(0, maxIndex + 1), tolerance);
      final right = simplify(points.sublist(maxIndex), tolerance);
      return [...left.sublist(0, left.length - 1), ...right];
    } else {
      return [points.first, points.last];
    }
  }

  static double _pointToLineDistance(Offset point, Offset lineStart, Offset lineEnd) {
    final A = point.dx - lineStart.dx;
    final B = point.dy - lineStart.dy;
    final C = lineEnd.dx - lineStart.dx;
    final D = lineEnd.dy - lineStart.dy;
    
    final dot = A * C + B * D;
    final lenSq = C * C + D * D;
    final param = lenSq != 0 ? dot / lenSq : -1;
    
    double xx, yy;
    if (param < 0) {
      xx = lineStart.dx;
      yy = lineStart.dy;
    } else if (param > 1) {
      xx = lineEnd.dx;
      yy = lineEnd.dy;
    } else {
      xx = lineStart.dx + param * C;
      yy = lineStart.dy + param * D;
    }
    
    final dx = point.dx - xx;
    final dy = point.dy - yy;
    return sqrt(dx * dx + dy * dy);
  }
}
```

## 9. 状态持久化

### 9.1 使用 SharedPreferences

```dart
class CanvasPersistence {
  static const String _keyPrefix = 'canvas_state_';
  
  // 保存画布状态
  static Future<void> saveState(String imageUrl, CanvasState state) async {
    final prefs = await SharedPreferences.getInstance();
    final key = '$_keyPrefix$imageUrl';
    
    final json = {
      'imageUrl': state.imageUrl,
      'scale': state.scale,
      'panOffset': {'dx': state.panOffset.dx, 'dy': state.panOffset.dy},
      'maskPaths': state.maskPaths.map((p) => p.toJson()).toList(),
      'mode': state.mode.toString(),
    };
    
    await prefs.setString(key, jsonEncode(json));
  }
  
  // 加载画布状态
  static Future<CanvasState?> loadState(String imageUrl, Size displaySize) async {
    final prefs = await SharedPreferences.getInstance();
    final key = '$_keyPrefix$imageUrl';
    
    final jsonString = prefs.getString(key);
    if (jsonString == null) return null;
    
    final json = jsonDecode(jsonString);
    
    // 重建状态（需要重新加载图片）
    return CanvasState(
      imageUrl: json['imageUrl'],
      displaySize: displaySize,
      scale: json['scale']?.toDouble() ?? 1.0,
      panOffset: Offset(
        json['panOffset']['dx']?.toDouble() ?? 0.0,
        json['panOffset']['dy']?.toDouble() ?? 0.0,
      ),
      maskPaths: (json['maskPaths'] as List?)
          ?.map((p) => MaskPath.fromJson(p))
          .toList() ?? [],
      mode: _parseMode(json['mode']),
    );
  }
  
  static CanvasMode _parseMode(String? modeString) {
    if (modeString?.contains('drawMask') ?? false) {
      return CanvasMode.drawMask;
    }
    return CanvasMode.view;
  }
}
```

## 10. 蒙版数据生成

### 10.1 生成 Base64 蒙版图片

```dart
Future<String> generateMaskBase64(
  ui.Image image,
  List<MaskPath> maskPaths,
  CanvasTransform transform,
) async {
  // 创建与图片相同尺寸的画布
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  
  // 绘制蒙版（白色填充，黑色背景）
  canvas.drawRect(
    Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble()),
    Paint()..color = Colors.black,
  );
  
  final maskPaint = Paint()
    ..color = Colors.white
    ..style = PaintingStyle.fill;
  
  // 将屏幕坐标转换为图片坐标并绘制
  for (final path in maskPaths) {
    final imagePoints = path.toImageCoordinates(transform);
    if (imagePoints.isEmpty) continue;
    
    final maskPath = Path();
    maskPath.moveTo(imagePoints.first.x, imagePoints.first.y);
    for (int i = 1; i < imagePoints.length; i++) {
      maskPath.lineTo(imagePoints[i].x, imagePoints[i].y);
    }
    maskPath.close();
    
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

## 11. 边界情况处理

### 11.1 图片加载失败

```dart
Future<void> _loadImage() async {
  try {
    final response = await http.get(Uri.parse(widget.imageUrl));
    if (response.statusCode == 200) {
      final codec = await ui.instantiateImageCodec(response.bodyBytes);
      final frame = await codec.getNextFrame();
      
      setState(() {
        _state = _state.copyWith(
          image: frame.image,
          imageSize: Size(
            frame.image.width.toDouble(),
            frame.image.height.toDouble(),
          ),
        );
      });
    } else {
      _handleImageLoadError('Failed to load image: ${response.statusCode}');
    }
  } catch (e) {
    _handleImageLoadError('Error loading image: $e');
  }
}

void _handleImageLoadError(String message) {
  // 显示错误提示
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message)),
  );
}
```

### 11.2 内存管理

```dart
@override
void dispose() {
  // 释放图片资源
  _state.image?.dispose();
  super.dispose();
}
```

## 12. 测试策略

### 12.1 单元测试

```dart
void main() {
  test('CanvasTransform screenToImage conversion', () {
    final transform = CanvasTransform(
      imageSize: Size(800, 600),
      displaySize: Size(400, 300),
      transform: Matrix4.identity()..scale(0.5),
      scale: 0.5,
      panOffset: Offset.zero,
    );
    
    final imagePoint = transform.screenToImage(Offset(200, 150));
    expect(imagePoint.x, closeTo(400, 1));
    expect(imagePoint.y, closeTo(300, 1));
  });
}
```

