import 'package:flutter/foundation.dart';
import 'package:aivista_client/models/message.dart';
import 'package:aivista_client/models/genui_component.dart';
import 'package:aivista_client/utils/helpers.dart';

/// 聊天状态数据模型
class ChatState {
  final List<Message> messages;
  final List<GenUIComponent> components;
  final bool isLoading;
  final String? error;

  ChatState({
    List<Message>? messages,
    List<GenUIComponent>? components,
    this.isLoading = false,
    this.error,
  }) : messages = messages ?? [],
       components = components ?? [];

  ChatState copyWith({
    List<Message>? messages,
    List<GenUIComponent>? components,
    bool? isLoading,
    String? error,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      components: components ?? this.components,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

/// 聊天状态管理 Provider
/// 
/// 管理消息列表和 GenUI 组件列表
/// 处理组件更新策略（append/update/replace）
class ChatStateProvider extends ChangeNotifier {
  ChatState _state = ChatState();

  ChatState get state => _state;

  /// 添加用户消息
  void addUserMessage(String content) {
    final message = Message(
      id: Helpers.generateId(prefix: 'msg'),
      role: MessageRole.user,
      content: content,
    );

    _state = _state.copyWith(
      messages: [..._state.messages, message],
    );
    notifyListeners();
  }

  /// 添加 GenUI 组件
  void addComponent(GenUIComponent component) {
    final updateMode = component.updateMode ?? UpdateMode.append;

    switch (updateMode) {
      case UpdateMode.append:
        _state = _state.copyWith(
          components: [..._state.components, component],
        );
        break;
      case UpdateMode.update:
        _updateComponent(component);
        break;
      case UpdateMode.replace:
        _replaceComponent(component);
        break;
    }
    notifyListeners();
  }

  /// 更新组件
  void _updateComponent(GenUIComponent component) {
    if (component.targetId == null) return;

    final index = _state.components.indexWhere(
      (c) => c.id == component.targetId,
    );

    if (index != -1) {
      final existing = _state.components[index];
      final mergedProps = Map<String, dynamic>.from(existing.props);
      mergedProps.addAll(component.props);

      final updated = GenUIComponent(
        id: existing.id,
        widgetType: existing.widgetType,
        props: mergedProps,
        updateMode: existing.updateMode,
        targetId: existing.targetId,
        timestamp: component.timestamp ?? existing.timestamp,
      );

      final newComponents = List<GenUIComponent>.from(_state.components);
      newComponents[index] = updated;
      _state = _state.copyWith(components: newComponents);
    }
  }

  /// 替换组件
  void _replaceComponent(GenUIComponent component) {
    if (component.targetId == null) return;

    final index = _state.components.indexWhere(
      (c) => c.id == component.targetId,
    );

    if (index != -1) {
      final newComponents = List<GenUIComponent>.from(_state.components);
      newComponents[index] = component;
      _state = _state.copyWith(components: newComponents);
    }
  }

  /// 设置加载状态
  void setLoading(bool isLoading) {
    _state = _state.copyWith(isLoading: isLoading);
    notifyListeners();
  }

  /// 设置错误
  void setError(String error) {
    _state = _state.copyWith(error: error);
    notifyListeners();
  }

  /// 清除错误
  void clearError() {
    _state = _state.copyWith(error: null);
    notifyListeners();
  }

  /// 清除所有状态
  void clear() {
    _state = ChatState();
    notifyListeners();
  }
}

