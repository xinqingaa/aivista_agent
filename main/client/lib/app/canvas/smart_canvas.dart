import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import 'package:http/http.dart' as http;
import 'package:aivista_client/models/mask_data.dart';
import 'package:aivista_client/app/canvas/canvas_painter.dart';
import 'package:aivista_client/app/canvas/canvas_transform.dart';
import 'package:aivista_client/utils/constants.dart';

/// 智能画布组件
/// 
/// 支持图片显示、缩放、平移、蒙版绘制等功能
/// 使用 CustomPainter 实现高性能绘制
class SmartCanvas extends StatefulWidget {
  final String imageUrl;
  final CanvasMode mode;
  final double? ratio;
  final Function(MaskData)? onMaskChanged;
  final Function(String)? onImageTapped;

  const SmartCanvas({
    super.key,
    required this.imageUrl,
    required this.mode,
    this.ratio,
    this.onMaskChanged,
    this.onImageTapped,
  });

  @override
  State<SmartCanvas> createState() => _SmartCanvasState();
}

class _SmartCanvasState extends State<SmartCanvas> {
  // 图片相关
  ui.Image? _image;
  Size _imageSize = Size.zero;
  Size _displaySize = Size.zero;
  
  // 变换相关
  Matrix4 _transform = Matrix4.identity();
  double _scale = AppConstants.defaultScale;
  Offset _panOffset = Offset.zero;
  
  // 缩放和平移的临时状态
  double _lastScale = AppConstants.defaultScale;
  Offset _lastPanOffset = Offset.zero;
  
  // 蒙版路径
  List<MaskPath> _maskPaths = [];
  MaskPath? _currentPath;
  
  // 历史记录（撤销/重做）
  List<_CanvasSnapshot> _history = [];
  int _historyIndex = -1;
  
  // 绘制参数
  final double _strokeWidth = AppConstants.defaultStrokeWidth;
  final Color _strokeColor = Colors.red;
  
  // 坐标转换工具
  CanvasTransform? _canvasTransform;

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  @override
  void didUpdateWidget(SmartCanvas oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _loadImage();
    }
    if (oldWidget.mode != widget.mode) {
      // 模式切换时，清除当前路径
      setState(() {
        _currentPath = null;
      });
    }
  }

  /// 加载图片
  Future<void> _loadImage() async {
    if (widget.imageUrl.isEmpty) {
      _showError('图片 URL 为空');
      return;
    }
    
    try {
      print('Loading image from: ${widget.imageUrl}');
      final response = await http.get(Uri.parse(widget.imageUrl));
      print('Image response status: ${response.statusCode}');
      
      // 接受 200 和 201 状态码
      if (response.statusCode == 200 || response.statusCode == 201) {
        final codec = await ui.instantiateImageCodec(response.bodyBytes);
        final frame = await codec.getNextFrame();
        
        if (mounted) {
          setState(() {
            _image = frame.image;
            _imageSize = Size(
              frame.image.width.toDouble(),
              frame.image.height.toDouble(),
            );
            _updateTransform();
          });
          print('Image loaded successfully: ${_imageSize.width}x${_imageSize.height}');
        }
      } else {
        _showError('Failed to load image: ${response.statusCode}');
      }
    } catch (e) {
      print('Error loading image: $e');
      _showError('Error loading image: $e');
    }
  }

  /// 更新变换矩阵
  void _updateTransform() {
    if (_displaySize == Size.zero || _imageSize == Size.zero) return;
    
    _transform = CanvasTransform.buildTransform(
      imageSize: _imageSize,
      displaySize: _displaySize,
      scale: _scale,
      panOffset: _panOffset,
    );
    
    _canvasTransform = CanvasTransform(
      imageSize: _imageSize,
      displaySize: _displaySize,
      transform: _transform,
      scale: _scale,
      panOffset: _panOffset,
    );
  }

  /// 处理缩放手势开始
  void _handleScaleStart(ScaleStartDetails details) {
    _lastScale = _scale;
    _lastPanOffset = _panOffset;
    
    if (widget.mode == CanvasMode.drawMask && details.pointerCount == 1) {
      // 绘制模式：单指开始新的路径
      final screenPoint = details.localFocalPoint;
      
      setState(() {
        _currentPath = MaskPath.withColor(
          points: [screenPoint],
          strokeWidth: _strokeWidth,
          color: _strokeColor,
        );
      });
    }
  }

  /// 处理缩放更新（统一处理缩放和平移）
  void _handleScaleUpdate(ScaleUpdateDetails details) {
    if (details.pointerCount == 2 && widget.mode == CanvasMode.view) {
      // 双指缩放
      final newScale = _lastScale * details.scale;
      final clampedScale = newScale.clamp(AppConstants.minScale, AppConstants.maxScale);
      
      // 计算缩放中心点
      final focalPoint = details.focalPoint;
      
      // 调整平移偏移，使缩放中心保持不变
      final scaleDelta = clampedScale / _lastScale;
      final newPanOffset = Offset(
        _lastPanOffset.dx + (focalPoint.dx - _displaySize.width / 2) * (1 - scaleDelta),
        _lastPanOffset.dy + (focalPoint.dy - _displaySize.height / 2) * (1 - scaleDelta),
      );
      
      // 限制平移范围
      final clampedPan = CanvasTransform.clampPanOffset(
        pan: newPanOffset,
        imageSize: _imageSize,
        displaySize: _displaySize,
        scale: clampedScale,
      );
      
      setState(() {
        _scale = clampedScale;
        _panOffset = clampedPan;
        _updateTransform();
      });
    } else if (details.pointerCount == 1) {
      // 单指操作
      if (widget.mode == CanvasMode.view) {
        // 查看模式：单指平移图片
        final delta = details.focalPointDelta;
        final newPanOffset = Offset(
          _lastPanOffset.dx + delta.dx,
          _lastPanOffset.dy + delta.dy,
        );
        
        // 限制平移范围
        final clampedPan = CanvasTransform.clampPanOffset(
          pan: newPanOffset,
          imageSize: _imageSize,
          displaySize: _displaySize,
          scale: _scale,
        );
        
        setState(() {
          _panOffset = clampedPan;
          _updateTransform();
        });
      } else if (widget.mode == CanvasMode.drawMask && _currentPath != null) {
        // 绘制模式：添加点到当前路径
        final screenPoint = details.focalPoint;
        final currentPoints = List<Offset>.from(_currentPath!.points);
        
        // 检查点之间的距离，避免过于密集
        if (currentPoints.isNotEmpty) {
          final lastPoint = currentPoints.last;
          final distance = (screenPoint - lastPoint).distance;
          if (distance < 1.0) return; // 距离太近，跳过
        }
        
        currentPoints.add(screenPoint);
        
        setState(() {
          _currentPath = MaskPath(
            points: currentPoints,
            strokeWidth: _currentPath!.strokeWidth,
            color: _currentPath!.color,
          );
        });
      }
    }
  }

  /// 处理缩放手势结束
  void _handleScaleEnd(ScaleEndDetails details) {
    if (widget.mode == CanvasMode.drawMask && _currentPath != null) {
      // 完成当前路径
      final completedPath = _currentPath!;
      final newPaths = List<MaskPath>.from(_maskPaths)..add(completedPath);
      
      // 保存到历史记录
      _saveToHistory();
      
      setState(() {
        _maskPaths = newPaths;
        _currentPath = null;
      });
      
      // 通知外部蒙版已更改
      _notifyMaskChanged();
    }
  }

  /// 保存到历史记录
  void _saveToHistory() {
    // 如果当前不在历史末尾，删除后面的记录
    if (_historyIndex < _history.length - 1) {
      _history.removeRange(_historyIndex + 1, _history.length);
    }
    
    // 添加新状态
    _history.add(_CanvasSnapshot(
      maskPaths: List.from(_maskPaths),
      scale: _scale,
      panOffset: _panOffset,
    ));
    
    // 限制历史记录大小
    if (_history.length > AppConstants.maxHistorySize) {
      _history.removeAt(0);
    } else {
      _historyIndex = _history.length - 1;
    }
  }

  /// 撤销
  void undo() {
    if (_historyIndex > 0) {
      _historyIndex--;
      final snapshot = _history[_historyIndex];
      
      setState(() {
        _maskPaths = List.from(snapshot.maskPaths);
        _scale = snapshot.scale;
        _panOffset = snapshot.panOffset;
        _updateTransform();
      });
      
      _notifyMaskChanged();
    }
  }

  /// 重做
  void redo() {
    if (_historyIndex < _history.length - 1) {
      _historyIndex++;
      final snapshot = _history[_historyIndex];
      
      setState(() {
        _maskPaths = List.from(snapshot.maskPaths);
        _scale = snapshot.scale;
        _panOffset = snapshot.panOffset;
        _updateTransform();
      });
      
      _notifyMaskChanged();
    }
  }

  /// 清除所有蒙版
  void clearMask() {
    _saveToHistory();
    setState(() {
      _maskPaths = [];
      _currentPath = null;
    });
    _notifyMaskChanged();
  }

  /// 通知蒙版已更改
  Future<void> _notifyMaskChanged() async {
    if (widget.onMaskChanged == null || _image == null || _canvasTransform == null) return;
    
    // 生成蒙版 Base64 数据
    try {
      final maskBase64 = await _generateMaskBase64();
      final maskData = MaskData(
        base64: maskBase64,
        imageUrl: widget.imageUrl,
        coordinates: _maskPaths.expand((path) {
          return path.points.map((p) => {
            'x': p.dx,
            'y': p.dy,
          });
        }).toList(),
      );
      
      widget.onMaskChanged?.call(maskData);
    } catch (e) {
      print('Failed to generate mask data: $e');
    }
  }

  /// 生成蒙版 Base64 数据
  Future<String> _generateMaskBase64() async {
    if (_image == null) return '';
    
    // 创建与图片相同尺寸的画布
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    
    // 绘制蒙版（白色填充，黑色背景）
    canvas.drawRect(
      Rect.fromLTWH(0, 0, _imageSize.width, _imageSize.height),
      Paint()..color = Colors.black,
    );
    
    final maskPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    
    // 将屏幕坐标转换为图片坐标并绘制
    for (final path in _maskPaths) {
      if (path.points.isEmpty) continue;
      
      final imagePoints = path.points.map((screenPoint) {
        return _canvasTransform!.screenToImage(screenPoint);
      }).toList();
      
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
    final maskImage = await picture.toImage(
      _imageSize.width.toInt(),
      _imageSize.height.toInt(),
    );
    final byteData = await maskImage.toByteData(format: ui.ImageByteFormat.png);
    final bytes = byteData!.buffer.asUint8List();
    
    // 转换为 Base64
    return base64Encode(bytes);
  }

  /// 显示错误
  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  void dispose() {
    _image?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // 确保有有效的约束，避免无限高度
        final maxWidth = constraints.maxWidth.isFinite ? constraints.maxWidth : 400.0;
        final maxHeight = constraints.maxHeight.isFinite 
            ? constraints.maxHeight 
            : (widget.ratio != null 
                ? maxWidth / widget.ratio! 
                : maxWidth);
        
        _displaySize = Size(maxWidth, maxHeight);
        _updateTransform();
        
        return RepaintBoundary(
          child: SizedBox(
            width: maxWidth,
            height: maxHeight,
            child: GestureDetector(
              onScaleStart: _handleScaleStart,
              onScaleUpdate: _handleScaleUpdate,
              onScaleEnd: _handleScaleEnd,
              onTap: () {
                widget.onImageTapped?.call(widget.imageUrl);
              },
              child: CustomPaint(
                size: _displaySize,
                painter: _image != null
                    ? ImagePainter(
                        image: _image!,
                        imageSize: _imageSize,
                        displaySize: _displaySize,
                        transform: _transform,
                      )
                    : null,
                foregroundPainter: (_maskPaths.isNotEmpty || _currentPath != null)
                    ? MaskPainter(
                        maskPaths: _maskPaths,
                        currentPath: _currentPath,
                        transform: _transform,
                      )
                    : null,
                child: _image == null
                    ? Center(
                        child: CircularProgressIndicator(),
                      )
                    : null,
              ),
            ),
          ),
        );
      },
    );
  }
}

/// 画布状态快照（用于撤销/重做）
class _CanvasSnapshot {
  final List<MaskPath> maskPaths;
  final double scale;
  final Offset panOffset;

  _CanvasSnapshot({
    required this.maskPaths,
    required this.scale,
    required this.panOffset,
  });
}

