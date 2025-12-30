import 'package:flutter/material.dart';

/// 消息状态枚举
enum MessageState {
  success,
  loading,
  failed,
}

/// Agent 消息组件
/// 
/// 显示 AI 的消息气泡，支持不同状态和思考动画
class AgentMessageWidget extends StatelessWidget {
  final String text;
  final MessageState state;
  final bool isThinking;

  const AgentMessageWidget({
    super.key,
    required this.text,
    required this.state,
    this.isThinking = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // AI 头像
          CircleAvatar(
            backgroundColor: Colors.blue,
            child: const Icon(Icons.smart_toy, color: Colors.white),
          ),
          const SizedBox(width: 12),
          // 消息气泡
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _getBackgroundColor(),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isThinking)
                    _buildThinkingIndicator()
                  else
                    Text(
                      text,
                      style: TextStyle(
                        color: _getTextColor(),
                        fontSize: 14,
                      ),
                    ),
                  if (state == MessageState.loading)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getTextColor(),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getBackgroundColor() {
    switch (state) {
      case MessageState.success:
        return Colors.grey[200]!;
      case MessageState.loading:
        return Colors.blue[50]!;
      case MessageState.failed:
        return Colors.red[50]!;
    }
  }

  Color _getTextColor() {
    switch (state) {
      case MessageState.success:
        return Colors.black87;
      case MessageState.loading:
        return Colors.blue[700]!;
      case MessageState.failed:
        return Colors.red[700]!;
    }
  }

  Widget _buildThinkingIndicator() {
    return Row(
      children: [
        Text(
          text,
          style: TextStyle(
            color: _getTextColor(),
            fontSize: 14,
          ),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 12,
          height: 12,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(_getTextColor()),
          ),
        ),
      ],
    );
  }
}

