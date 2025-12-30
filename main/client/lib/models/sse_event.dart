import 'package:json_annotation/json_annotation.dart';

part 'sse_event.g.dart';

/// SSE 事件类型枚举
enum SSEEventType {
  @JsonValue('connection')
  connection,
  @JsonValue('thought_log')
  thoughtLog,
  @JsonValue('gen_ui_component')
  genUIComponent,
  @JsonValue('error')
  error,
  @JsonValue('stream_end')
  streamEnd,
  @JsonValue('heartbeat')
  heartbeat,
}

/// SSE 事件基础模型
@JsonSerializable()
class SSEEvent {
  final SSEEventType type;
  final int timestamp;
  final Map<String, dynamic> data;

  SSEEvent({
    required this.type,
    required this.timestamp,
    required this.data,
  });

  factory SSEEvent.fromJson(Map<String, dynamic> json) => _$SSEEventFromJson(json);
  Map<String, dynamic> toJson() => _$SSEEventToJson(this);
}

/// 思考日志事件
class ThoughtLogEvent {
  final String node;
  final String message;
  final int? progress;
  final Map<String, dynamic>? metadata;

  ThoughtLogEvent({
    required this.node,
    required this.message,
    this.progress,
    this.metadata,
  });

  factory ThoughtLogEvent.fromSSEEvent(SSEEvent event) {
    final data = event.data;
    return ThoughtLogEvent(
      node: data['node'] as String? ?? 'unknown',
      message: data['message'] as String? ?? '',
      progress: data['progress'] as int?,
      metadata: data['metadata'] as Map<String, dynamic>?,
    );
  }
}

/// GenUI 组件事件
class GenUIComponentEvent {
  final Map<String, dynamic> component;

  GenUIComponentEvent({
    required this.component,
  });

  factory GenUIComponentEvent.fromSSEEvent(SSEEvent event) {
    return GenUIComponentEvent(
      component: event.data,
    );
  }
}

/// 错误事件
class ErrorEvent {
  final String code;
  final String message;
  final String? node;
  final bool? recoverable;
  final bool? retryable;

  ErrorEvent({
    required this.code,
    required this.message,
    this.node,
    this.recoverable,
    this.retryable,
  });

  factory ErrorEvent.fromSSEEvent(SSEEvent event) {
    final data = event.data;
    return ErrorEvent(
      code: data['code'] as String? ?? 'UNKNOWN_ERROR',
      message: data['message'] as String? ?? '发生未知错误',
      node: data['node'] as String?,
      recoverable: data['recoverable'] as bool?,
      retryable: data['retryable'] as bool?,
    );
  }
}

/// 连接事件
class ConnectionEvent {
  final String status;
  final String? sessionId;

  ConnectionEvent({
    required this.status,
    this.sessionId,
  });

  factory ConnectionEvent.fromSSEEvent(SSEEvent event) {
    final data = event.data;
    return ConnectionEvent(
      status: data['status'] as String? ?? 'unknown',
      sessionId: data['sessionId'] as String?,
    );
  }
}

/// 流结束事件
class StreamEndEvent {
  final String? sessionId;
  final String? summary;

  StreamEndEvent({
    this.sessionId,
    this.summary,
  });

  factory StreamEndEvent.fromSSEEvent(SSEEvent event) {
    final data = event.data;
    return StreamEndEvent(
      sessionId: data['sessionId'] as String?,
      summary: data['summary'] as String?,
    );
  }
}

