import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:aivista_client/models/sse_event.dart';
import 'package:aivista_client/models/genui_component.dart';
import 'package:aivista_client/models/mask_data.dart';
import 'package:aivista_client/utils/constants.dart';

/// SSE 连接状态
enum ConnectionState {
  disconnected,
  connecting,
  connected,
  error,
}

/// ChatService - SSE 客户端服务
/// 
/// 使用 http 包手动实现 SSE 解析，因为 Flutter 没有原生的 SSE 支持
/// 支持 POST 请求发送消息和蒙版数据
class ChatService {
  http.Client? _client;
  StreamSubscription<String>? _subscription;
  String? _sessionId;
  ConnectionState _connectionState = ConnectionState.disconnected;
  
  // 事件流控制器
  final _eventController = StreamController<SSEEvent>.broadcast();
  final _componentController = StreamController<GenUIComponent>.broadcast();
  final _errorController = StreamController<String>.broadcast();
  
  // 重连相关
  int _reconnectAttempts = 0;
  Timer? _reconnectTimer;
  
  /// 事件流
  Stream<SSEEvent> get eventStream => _eventController.stream;
  
  /// 组件流
  Stream<GenUIComponent> get componentStream => _componentController.stream;
  
  /// 错误流
  Stream<String> get errorStream => _errorController.stream;
  
  /// 连接状态
  ConnectionState get connectionState => _connectionState;
  
  /// 会话 ID
  String? get sessionId => _sessionId;
  
  /// 连接 SSE 流
  /// 
  /// [text] - 用户输入的文本
  /// [maskData] - 可选的蒙版数据
  /// [sessionId] - 可选的会话 ID
  Future<void> connect({
    required String text,
    MaskData? maskData,
    String? sessionId,
  }) async {
    if (_connectionState == ConnectionState.connected) {
      await disconnect();
    }
    
    _connectionState = ConnectionState.connecting;
    _sessionId = sessionId;
    _reconnectAttempts = 0;
    
    try {
      _client = http.Client();
      
      // 构建请求体
      final requestBody = {
        'text': text,
        if (maskData != null) 'maskData': maskData.toJson(),
        if (sessionId != null) 'sessionId': sessionId,
      };
      
      // 创建 POST 请求
      final request = http.Request('POST', Uri.parse(AppConstants.apiBaseUrl));
      request.headers['Content-Type'] = 'application/json';
      request.headers['Accept'] = 'text/event-stream';
      request.headers['Cache-Control'] = 'no-cache';
      request.headers['Connection'] = 'keep-alive';
      request.body = jsonEncode(requestBody);
      
      // 发送请求并获取流式响应
      final response = await _client!.send(request);
      
      // 接受 200 OK 和 201 Created 状态码
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('SSE connection failed: ${response.statusCode}');
      }
      
      _connectionState = ConnectionState.connected;
      _reconnectAttempts = 0;
      
      // 解析 SSE 流
      _subscription = response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen(
            _handleSSELine,
            onError: _handleError,
            onDone: _handleDone,
            cancelOnError: false,
          );
      
    } catch (e) {
      _connectionState = ConnectionState.error;
      // 只有在重连次数未超限时才发送错误和安排重连
      if (_reconnectAttempts < AppConstants.maxReconnectAttempts) {
        _errorController.add(e.toString());
        _scheduleReconnect(text, maskData, sessionId);
      } else {
        // 重连次数已超限，发送最终错误
        _errorController.add('连接失败，已重试 ${AppConstants.maxReconnectAttempts} 次: $e');
      }
    }
  }
  
  /// 处理 SSE 行
  String? _currentEventType;
  final StringBuffer _currentData = StringBuffer();
  
  void _handleSSELine(String line) {
    if (line.isEmpty) {
      // 空行表示一个完整的事件结束
      _processCompleteEvent();
      return;
    }
    
    if (line.startsWith('event:')) {
      _currentEventType = line.substring(6).trim();
    } else if (line.startsWith('data:')) {
      final data = line.substring(5).trim();
      if (_currentData.isNotEmpty) {
        _currentData.write('\n');
      }
      _currentData.write(data);
    } else if (line.startsWith('id:')) {
      // 可选：处理事件 ID
    } else if (line.startsWith('retry:')) {
      // 可选：处理重试间隔
    }
  }
  
  /// 处理完整的事件
  void _processCompleteEvent() {
    if (_currentData.isEmpty) {
      _currentEventType = null;
      return;
    }
    
    try {
      final dataJson = jsonDecode(_currentData.toString()) as Map<String, dynamic>;
      
      // 确定事件类型
      final eventTypeString = _currentEventType ?? dataJson['type'] as String? ?? 'message';
      final eventType = _parseEventType(eventTypeString);
      
      final event = SSEEvent(
        type: eventType,
        timestamp: dataJson['timestamp'] as int? ?? DateTime.now().millisecondsSinceEpoch,
        data: dataJson['data'] as Map<String, dynamic>? ?? dataJson,
      );
      
      // 分发事件
      _eventController.add(event);
      _handleSSEEvent(event);
      
      // 从连接事件中提取 sessionId
      if (eventType == SSEEventType.connection) {
        final connectionEvent = ConnectionEvent.fromSSEEvent(event);
        _sessionId = connectionEvent.sessionId ?? _sessionId;
      }
      
    } catch (e) {
      // JSON 解析失败，忽略或记录错误
      print('Failed to parse SSE event: $e');
    } finally {
      _currentEventType = null;
      _currentData.clear();
    }
  }
  
  /// 解析事件类型
  SSEEventType _parseEventType(String type) {
    switch (type) {
      case 'connection':
        return SSEEventType.connection;
      case 'thought_log':
        return SSEEventType.thoughtLog;
      case 'gen_ui_component':
        return SSEEventType.genUIComponent;
      case 'error':
        return SSEEventType.error;
      case 'stream_end':
        return SSEEventType.streamEnd;
      case 'heartbeat':
        return SSEEventType.heartbeat;
      default:
        return SSEEventType.thoughtLog; // 默认为思考日志
    }
  }
  
  /// 处理 SSE 事件
  void _handleSSEEvent(SSEEvent event) {
    switch (event.type) {
      case SSEEventType.genUIComponent:
        try {
          final componentEvent = GenUIComponentEvent.fromSSEEvent(event);
          final component = GenUIComponent.fromJson(componentEvent.component);
          _componentController.add(component);
        } catch (e) {
          print('Failed to parse GenUI component: $e');
        }
        break;
        
      case SSEEventType.thoughtLog:
        // 将思考日志转换为 AgentMessage 组件
        final thoughtEvent = ThoughtLogEvent.fromSSEEvent(event);
        final component = GenUIComponent(
          widgetType: WidgetType.agentMessage,
          props: {
            'text': thoughtEvent.message,
            'state': 'loading',
            'isThinking': true,
          },
          timestamp: event.timestamp,
        );
        _componentController.add(component);
        break;
        
      case SSEEventType.error:
        // 将错误转换为 AgentMessage 组件
        final errorEvent = ErrorEvent.fromSSEEvent(event);
        final component = GenUIComponent(
          widgetType: WidgetType.agentMessage,
          props: {
            'text': errorEvent.message,
            'state': 'failed',
            'isThinking': false,
          },
          timestamp: event.timestamp,
        );
        _componentController.add(component);
        break;
        
      case SSEEventType.streamEnd:
        // 流结束，可以断开连接
        _connectionState = ConnectionState.disconnected;
        // 发送流结束事件，通知 UI 更新 loading 状态
        _eventController.add(event);
        break;
        
      default:
        // 其他事件类型
        break;
    }
  }
  
  /// 处理错误
  void _handleError(dynamic error) {
    // 避免重复触发错误（如果已经在错误状态）
    if (_connectionState == ConnectionState.error) {
      return;
    }
    
    _connectionState = ConnectionState.error;
    _errorController.add(error.toString());
    
    // 注意：流错误通常表示连接已断开，不需要在这里重连
    // 重连逻辑在 connect() 方法的 catch 块中处理
  }
  
  /// 处理连接完成
  void _handleDone() {
    _connectionState = ConnectionState.disconnected;
    _subscription?.cancel();
    _subscription = null;
  }
  
  /// 安排重连
  void _scheduleReconnect(String text, MaskData? maskData, String? sessionId) {
    if (_reconnectAttempts >= AppConstants.maxReconnectAttempts) {
      return;
    }
    
    _reconnectAttempts++;
    final delay = AppConstants.reconnectDelay * _reconnectAttempts; // 指数退避
    
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () {
      connect(text: text, maskData: maskData, sessionId: sessionId);
    });
  }
  
  /// 断开连接
  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    
    await _subscription?.cancel();
    _subscription = null;
    
    _client?.close();
    _client = null;
    
    _connectionState = ConnectionState.disconnected;
    
    await _eventController.close();
    await _componentController.close();
    await _errorController.close();
  }
  
  /// 发送蒙版数据（用于更新现有连接）
  Future<void> sendMaskData(MaskData maskData) async {
    // 注意：SSE 是单向的，如果需要发送数据，需要建立新的连接
    // 或者使用单独的 HTTP 请求
    // 这里可以根据实际需求实现
  }
}

