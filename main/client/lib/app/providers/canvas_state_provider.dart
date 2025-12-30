import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import 'package:aivista_client/models/mask_data.dart';
import 'package:aivista_client/utils/constants.dart';

/// 画布状态数据模型
class CanvasState {
  final String? currentImageUrl;
  final ui.Image? currentImage;
  final Size imageSize;
  final Size displaySize;
  final Matrix4 transform;
  final double scale;
  final Offset panOffset;
  final List<MaskPath> maskPaths;
  final CanvasMode mode;
  final List<CanvasState> history;
  final int historyIndex;

  CanvasState({
    this.currentImageUrl,
    this.currentImage,
    required this.imageSize,
    required this.displaySize,
    Matrix4? transform,
    this.scale = AppConstants.defaultScale,
    this.panOffset = Offset.zero,
    List<MaskPath>? maskPaths,
    required this.mode,
    List<CanvasState>? history,
    this.historyIndex = -1,
  }) : transform = transform ?? Matrix4.identity(),
       maskPaths = maskPaths ?? [],
       history = history ?? [];

  CanvasState copyWith({
    String? currentImageUrl,
    ui.Image? currentImage,
    Size? imageSize,
    Size? displaySize,
    Matrix4? transform,
    double? scale,
    Offset? panOffset,
    List<MaskPath>? maskPaths,
    CanvasMode? mode,
    List<CanvasState>? history,
    int? historyIndex,
  }) {
    return CanvasState(
      currentImageUrl: currentImageUrl ?? this.currentImageUrl,
      currentImage: currentImage ?? this.currentImage,
      imageSize: imageSize ?? this.imageSize,
      displaySize: displaySize ?? this.displaySize,
      transform: transform ?? this.transform,
      scale: scale ?? this.scale,
      panOffset: panOffset ?? this.panOffset,
      maskPaths: maskPaths ?? this.maskPaths,
      mode: mode ?? this.mode,
      history: history ?? this.history,
      historyIndex: historyIndex ?? this.historyIndex,
    );
  }
}

/// 画布状态管理 Provider
/// 
/// 管理画布状态（图片、蒙版路径、变换）
/// 管理历史记录（撤销/重做）
class CanvasStateProvider extends ChangeNotifier {
  CanvasState _state = CanvasState(
    imageSize: Size.zero,
    displaySize: Size.zero,
    mode: CanvasMode.view,
  );

  CanvasState get state => _state;

  /// 设置当前图片
  Future<void> setImage(String imageUrl, Size displaySize) async {
    try {
      // 加载图片（这里简化，实际应该使用 http 加载）
      // 注意：实际实现中需要加载图片并获取尺寸
      
      _state = _state.copyWith(
        currentImageUrl: imageUrl,
        displaySize: displaySize,
      );
      
      // 保存到历史
      _saveToHistory();
      notifyListeners();
    } catch (e) {
      throw Exception('Failed to load image: $e');
    }
  }

  /// 添加蒙版路径
  void addMaskPath(MaskPath path) {
    final newPaths = List<MaskPath>.from(_state.maskPaths)..add(path);
    
    _state = _state.copyWith(maskPaths: newPaths);
    _saveToHistory();
    notifyListeners();
  }

  /// 清除所有蒙版
  void clearMaskPaths() {
    _state = _state.copyWith(maskPaths: []);
    _saveToHistory();
    notifyListeners();
  }

  /// 更新变换
  void updateTransform(Matrix4 transform, double scale, Offset panOffset) {
    _state = _state.copyWith(
      transform: transform,
      scale: scale,
      panOffset: panOffset,
    );
    notifyListeners();
  }

  /// 设置模式
  void setMode(CanvasMode mode) {
    _state = _state.copyWith(mode: mode);
    notifyListeners();
  }

  /// 撤销
  void undo() {
    if (_state.historyIndex > 0) {
      final previousIndex = _state.historyIndex - 1;
      final previousState = _state.history[previousIndex];
      
      _state = previousState.copyWith(
        history: _state.history,
        historyIndex: previousIndex,
      );
      notifyListeners();
    }
  }

  /// 重做
  void redo() {
    if (_state.historyIndex < _state.history.length - 1) {
      final nextIndex = _state.historyIndex + 1;
      final nextState = _state.history[nextIndex];
      
      _state = nextState.copyWith(
        history: _state.history,
        historyIndex: nextIndex,
      );
      notifyListeners();
    }
  }

  /// 保存到历史
  void _saveToHistory() {
    final newHistory = List<CanvasState>.from(_state.history);
    
    // 如果当前不在历史末尾，删除后面的记录
    if (_state.historyIndex < newHistory.length - 1) {
      newHistory.removeRange(_state.historyIndex + 1, newHistory.length);
    }
    
    // 添加新状态
    newHistory.add(_state);
    
    // 限制历史记录大小
    if (newHistory.length > AppConstants.maxHistorySize) {
      newHistory.removeAt(0);
    }
    
    _state = _state.copyWith(
      history: newHistory,
      historyIndex: newHistory.length - 1,
    );
  }

  /// 检查是否可以撤销
  bool canUndo() => _state.historyIndex > 0;

  /// 检查是否可以重做
  bool canRedo() => _state.historyIndex < _state.history.length - 1;
}

