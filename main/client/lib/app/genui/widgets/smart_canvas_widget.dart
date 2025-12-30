import 'package:flutter/material.dart';
import 'package:aivista_client/app/canvas/smart_canvas.dart';
import 'package:aivista_client/models/mask_data.dart';
import 'package:aivista_client/models/genui_component.dart';

/// SmartCanvas GenUI 组件包装器
/// 
/// 将 GenUI 协议中的 SmartCanvas 组件转换为实际的 SmartCanvas Widget
class SmartCanvasWidget extends StatelessWidget {
  final GenUIComponent component;
  final Function(String)? onImageTapped;
  final Function(MaskData)? onMaskChanged;

  const SmartCanvasWidget({
    super.key,
    required this.component,
    this.onImageTapped,
    this.onMaskChanged,
  });

  @override
  Widget build(BuildContext context) {
    final props = component.props;
    final imageUrl = props['imageUrl'] as String? ?? '';
    final modeString = props['mode'] as String? ?? 'view';
    final mode = modeString == 'draw_mask' 
        ? CanvasMode.drawMask 
        : CanvasMode.view;
    final ratio = props['ratio']?.toDouble();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SmartCanvas(
        imageUrl: imageUrl,
        mode: mode,
        ratio: ratio,
        onImageTapped: onImageTapped,
        onMaskChanged: onMaskChanged,
      ),
    );
  }
}

