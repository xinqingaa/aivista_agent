import 'package:flutter/material.dart';
import 'package:aivista_client/models/genui_component.dart';
import 'package:aivista_client/models/mask_data.dart';
import 'package:aivista_client/app/genui/widgets/agent_message_widget.dart';
import 'package:aivista_client/app/genui/widgets/action_panel_widget.dart';
// import 'package:aivista_client/app/genui/widgets/smart_canvas_widget.dart'; // 暂时注释，使用 NetworkImage 代替

/// GenUI 渲染器
/// 
/// 工厂类，根据组件类型动态创建对应的 Widget
/// 支持三种组件类型：SmartCanvas、AgentMessage、ActionPanel
class GenUIRenderer {
  /// 根据组件类型创建对应的 Widget
  /// 
  /// [component] - GenUI 组件数据
  /// [onImageTapped] - 图片点击回调
  /// [onMaskChanged] - 蒙版变化回调
  /// [onActionTriggered] - 操作触发回调
  static Widget build(
    GenUIComponent component, {
    Function(String)? onImageTapped,
    Function(MaskData)? onMaskChanged,
    Function(String, dynamic)? onActionTriggered,
  }) {
    switch (component.widgetType) {
      case WidgetType.smartCanvas:
        // 暂时用 NetworkImage 代替 SmartCanvas
        return _buildNetworkImage(component, onImageTapped);
        // return SmartCanvasWidget(
        //   component: component,
        //   onImageTapped: onImageTapped,
        //   onMaskChanged: onMaskChanged,
        // );
      
      case WidgetType.agentMessage:
        return _buildAgentMessage(component);
      
      case WidgetType.actionPanel:
        return ActionPanelWidget(
          actions: _parseActions(component.props),
          onActionTriggered: onActionTriggered,
        );
    }
  }

  /// 构建 AgentMessage 组件
  static Widget _buildAgentMessage(GenUIComponent component) {
    final props = component.props;
    final text = props['text'] as String? ?? '';
    final stateString = props['state'] as String? ?? 'success';
    final state = _parseMessageState(stateString);
    final isThinking = props['isThinking'] as bool? ?? false;

    return AgentMessageWidget(
      text: text,
      state: state,
      isThinking: isThinking,
    );
  }

  /// 解析消息状态
  static MessageState _parseMessageState(String state) {
    switch (state) {
      case 'loading':
        return MessageState.loading;
      case 'failed':
        return MessageState.failed;
      default:
        return MessageState.success;
    }
  }

  /// 解析操作列表
  static List<ActionItem> _parseActions(Map<String, dynamic> props) {
    final actionsJson = props['actions'] as List<dynamic>? ?? [];
    return actionsJson
        .map((json) => ActionItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// 构建网络图片（临时替代 SmartCanvas）
  static Widget _buildNetworkImage(
    GenUIComponent component,
    Function(String)? onImageTapped,
  ) {
    final props = component.props;
    final imageUrl = props['imageUrl'] as String? ?? '';
    
    if (imageUrl.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: const Text('图片 URL 为空'),
      );
    }
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: GestureDetector(
          onTap: () => onImageTapped?.call(imageUrl),
          child: Image.network(
            imageUrl,
            fit: BoxFit.contain,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Container(
                height: 200,
                alignment: Alignment.center,
                child: CircularProgressIndicator(
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                          loadingProgress.expectedTotalBytes!
                      : null,
                ),
              );
            },
            errorBuilder: (context, error, stackTrace) {
              return Container(
                height: 200,
                alignment: Alignment.center,
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red),
                    const SizedBox(height: 8),
                    Text(
                      '图片加载失败',
                      style: TextStyle(color: Colors.red[300]),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

