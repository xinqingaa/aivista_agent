import 'package:flutter/foundation.dart';

/// 连接状态枚举
enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  error,
}

/// Agent 状态数据模型
class AgentState {
  final String? sessionId;
  final ConnectionStatus connectionStatus;
  final String? currentTask;
  final Map<String, dynamic> taskMetadata;
  final String? error;

  AgentState({
    this.sessionId,
    this.connectionStatus = ConnectionStatus.disconnected,
    this.currentTask,
    Map<String, dynamic>? taskMetadata,
    this.error,
  }) : taskMetadata = taskMetadata ?? {};

  AgentState copyWith({
    String? sessionId,
    ConnectionStatus? connectionStatus,
    String? currentTask,
    Map<String, dynamic>? taskMetadata,
    String? error,
  }) {
    return AgentState(
      sessionId: sessionId ?? this.sessionId,
      connectionStatus: connectionStatus ?? this.connectionStatus,
      currentTask: currentTask ?? this.currentTask,
      taskMetadata: taskMetadata ?? this.taskMetadata,
      error: error ?? this.error,
    );
  }
}

/// Agent 状态管理 Provider
/// 
/// 管理连接状态、会话 ID、当前任务
class AgentStateProvider extends ChangeNotifier {
  AgentState _state = AgentState();

  AgentState get state => _state;

  /// 设置连接状态
  void setConnectionStatus(ConnectionStatus status) {
    _state = _state.copyWith(connectionStatus: status);
    notifyListeners();
  }

  /// 设置会话 ID
  void setSessionId(String sessionId) {
    _state = _state.copyWith(sessionId: sessionId);
    notifyListeners();
  }

  /// 设置当前任务
  void setCurrentTask(String task, {Map<String, dynamic>? metadata}) {
    _state = _state.copyWith(
      currentTask: task,
      taskMetadata: metadata ?? {},
    );
    notifyListeners();
  }

  /// 清除任务
  void clearTask() {
    _state = _state.copyWith(
      currentTask: null,
      taskMetadata: {},
    );
    notifyListeners();
  }

  /// 设置错误
  void setError(String error) {
    _state = _state.copyWith(
      error: error,
      connectionStatus: ConnectionStatus.error,
    );
    notifyListeners();
  }

  /// 清除错误
  void clearError() {
    _state = _state.copyWith(error: null);
    notifyListeners();
  }
}

