import 'package:flutter/material.dart';
import 'package:aivista_client/models/genui_component.dart';
import 'package:aivista_client/models/mask_data.dart';
import 'package:aivista_client/app/genui/genui_renderer.dart';

/// GenUI 组件列表
/// 
/// 管理 GenUI 组件列表，支持追加、更新、替换操作
class GenUIList extends StatefulWidget {
  final Function(String)? onImageTapped;
  final Function(MaskData)? onMaskChanged;
  final Function(String, dynamic)? onActionTriggered;

  const GenUIList({
    super.key,
    this.onImageTapped,
    this.onMaskChanged,
    this.onActionTriggered,
  });

  @override
  State<GenUIList> createState() => GenUIListState();
}

class GenUIListState extends State<GenUIList> {
  final List<GenUIComponent> _components = [];
  final Map<String, int> _componentIndexMap = {}; // id -> index

  /// 添加组件
  void addComponent(GenUIComponent component) {
    setState(() {
      _components.add(component);
      if (component.id != null) {
        _componentIndexMap[component.id!] = _components.length - 1;
      }
    });
  }

  /// 更新组件
  void updateComponent(GenUIComponent component) {
    if (component.targetId == null) return;

    final targetIndex = _componentIndexMap[component.targetId];
    if (targetIndex == null) return;

    setState(() {
      // 合并 props
      final existingComponent = _components[targetIndex];
      final mergedProps = Map<String, dynamic>.from(existingComponent.props);
      mergedProps.addAll(component.props);

      _components[targetIndex] = GenUIComponent(
        id: existingComponent.id,
        widgetType: existingComponent.widgetType,
        props: mergedProps,
        updateMode: existingComponent.updateMode,
        targetId: existingComponent.targetId,
        timestamp: component.timestamp ?? existingComponent.timestamp,
      );
    });
  }

  /// 替换组件
  void replaceComponent(GenUIComponent component) {
    if (component.targetId == null) return;

    final targetIndex = _componentIndexMap[component.targetId];
    if (targetIndex == null) return;

    setState(() {
      _components[targetIndex] = component;
    });
  }

  /// 处理组件更新
  void handleComponent(GenUIComponent component) {
    final updateMode = component.updateMode ?? UpdateMode.append;

    switch (updateMode) {
      case UpdateMode.append:
        addComponent(component);
        break;
      case UpdateMode.update:
        updateComponent(component);
        break;
      case UpdateMode.replace:
        replaceComponent(component);
        break;
    }
  }

  /// 清除所有组件
  void clear() {
    setState(() {
      _components.clear();
      _componentIndexMap.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_components.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Text(
            '暂无内容',
            style: TextStyle(color: Colors.grey),
          ),
        ),
      );
    }
    
    // 使用 Column 而不是 ListView，因为外层已经有 SingleChildScrollView
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: _components.map((component) {
        return GenUIItem(
          component: component,
          onImageTapped: widget.onImageTapped,
          onMaskChanged: widget.onMaskChanged,
          onActionTriggered: widget.onActionTriggered,
        );
      }).toList(),
    );
  }
}

/// GenUI 组件项
/// 
/// 单个组件项的包装器，使用 RepaintBoundary 优化性能
class GenUIItem extends StatelessWidget {
  final GenUIComponent component;
  final Function(String)? onImageTapped;
  final Function(MaskData)? onMaskChanged;
  final Function(String, dynamic)? onActionTriggered;

  const GenUIItem({
    super.key,
    required this.component,
    this.onImageTapped,
    this.onMaskChanged,
    this.onActionTriggered,
  });

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: GenUIRenderer.build(
        component,
        onImageTapped: onImageTapped,
        onMaskChanged: onMaskChanged,
        onActionTriggered: onActionTriggered,
      ),
    );
  }
}

