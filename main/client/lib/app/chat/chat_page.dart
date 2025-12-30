import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:aivista_client/app/chat/chat_service.dart';
import 'package:aivista_client/app/genui/genui_list.dart';
import 'package:aivista_client/app/providers/chat_state_provider.dart';
import 'package:aivista_client/app/providers/agent_state_provider.dart';
import 'package:aivista_client/models/genui_component.dart';
import 'package:aivista_client/models/mask_data.dart';
import 'package:aivista_client/models/sse_event.dart';

/// 聊天主页面
/// 
/// 集成 GenUIList 显示组件
/// 集成输入框发送消息
/// 连接 ChatService 接收 SSE 事件
class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _textController = TextEditingController();
  final _genUIListKey = GlobalKey<GenUIListState>();
  final _chatService = ChatService();
  StreamSubscription<GenUIComponent>? _componentSubscription;
  StreamSubscription<String>? _errorSubscription;
  StreamSubscription<SSEEvent>? _eventSubscription;
  
  // 错误提示防抖
  DateTime? _lastErrorTime;
  static const _errorDebounceDuration = Duration(seconds: 2);

  @override
  void initState() {
    super.initState();
    _setupSSEListeners();
  }

  /// 设置 SSE 监听器
  void _setupSSEListeners() {
    // 监听组件流
    _componentSubscription = _chatService.componentStream.listen((component) {
      _genUIListKey.currentState?.handleComponent(component);
      
      // 同步到 ChatStateProvider
      final chatProvider = Provider.of<ChatStateProvider>(context, listen: false);
      chatProvider.addComponent(component);
    });

    // 监听事件流（用于处理流结束）
    _eventSubscription = _chatService.eventStream.listen((event) {
      if (event.type == SSEEventType.streamEnd) {
        // 流结束，停止 loading
        final chatProvider = Provider.of<ChatStateProvider>(context, listen: false);
        chatProvider.setLoading(false);
      }
    });

    // 监听错误流
    _errorSubscription = _chatService.errorStream.listen((error) {
      // 防抖：避免短时间内重复显示错误提示
      final now = DateTime.now();
      if (_lastErrorTime != null && 
          now.difference(_lastErrorTime!) < _errorDebounceDuration) {
        return;
      }
      _lastErrorTime = now;
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('连接错误: $error'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
      
      final agentProvider = Provider.of<AgentStateProvider>(context, listen: false);
      agentProvider.setError(error);
    });
  }

  /// 发送消息
  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    // 添加用户消息到状态
    final chatProvider = Provider.of<ChatStateProvider>(context, listen: false);
    chatProvider.addUserMessage(text);
    chatProvider.setLoading(true);

    // 获取会话 ID
    final agentProvider = Provider.of<AgentStateProvider>(context, listen: false);
    final sessionId = agentProvider.state.sessionId;

    // 更新连接状态
    agentProvider.setConnectionStatus(ConnectionStatus.connecting);

    // 清空输入框
    _textController.clear();

    try {
      // 连接 SSE
      await _chatService.connect(
        text: text,
        sessionId: sessionId,
      );

      // 更新连接状态
      agentProvider.setConnectionStatus(ConnectionStatus.connected);
      if (_chatService.sessionId != null) {
        agentProvider.setSessionId(_chatService.sessionId!);
      }
    } catch (e) {
      chatProvider.setLoading(false);
      agentProvider.setConnectionStatus(ConnectionStatus.error);
      agentProvider.setError(e.toString());
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('发送失败: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// 处理图片点击
  void _handleImageTapped(String imageUrl) {
    // 切换到编辑模式
    final component = GenUIComponent(
      id: 'canvas_edit',
      widgetType: WidgetType.smartCanvas,
      props: {
        'imageUrl': imageUrl,
        'mode': 'draw_mask',
      },
      updateMode: UpdateMode.replace,
      targetId: 'canvas_edit',
    );
    _genUIListKey.currentState?.handleComponent(component);
  }

  /// 处理蒙版变化
  void _handleMaskChanged(MaskData maskData) {
    // 发送蒙版数据到后端（通过新的 SSE 连接）
    // 注意：SSE 是单向的，如果需要发送数据，需要建立新的连接
    // 这里可以根据实际需求实现
  }

  /// 处理操作触发
  void _handleActionTriggered(String actionId, dynamic value) {
    // 处理操作触发（如滑块变化、按钮点击）
    // 可以根据 actionId 执行不同的操作
    print('Action triggered: $actionId, value: $value');
  }

  @override
  void dispose() {
    _componentSubscription?.cancel();
    _errorSubscription?.cancel();
    _eventSubscription?.cancel();
    _chatService.disconnect();
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AiVista'),
        backgroundColor: Colors.grey[900],
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // GenUI 组件列表（可滚动）
          Expanded(
            child: SingleChildScrollView(
              child: GenUIList(
                key: _genUIListKey,
                onImageTapped: _handleImageTapped,
                onMaskChanged: _handleMaskChanged,
                onActionTriggered: _handleActionTriggered,
              ),
            ),
          ),
          // 输入框
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[900],
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: InputDecoration(
                      hintText: '输入你的想法...',
                      filled: true,
                      fillColor: Colors.grey[800],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                    ),
                    style: const TextStyle(color: Colors.white),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 12),
                Consumer<ChatStateProvider>(
                  builder: (context, chatProvider, _) {
                    return IconButton(
                      onPressed: chatProvider.state.isLoading ? null : _sendMessage,
                      icon: chatProvider.state.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Icon(Icons.send, color: Colors.white),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.blue,
                        padding: const EdgeInsets.all(12),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

