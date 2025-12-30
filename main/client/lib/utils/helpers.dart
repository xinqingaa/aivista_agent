import 'dart:convert';

/// 辅助函数工具类
class Helpers {
  /// 生成唯一 ID
  static String generateId({String? prefix}) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp % 10000).toString().padLeft(4, '0');
    return prefix != null ? '${prefix}_$timestamp$random' : 'id_$timestamp$random';
  }
  
  /// 安全解析 JSON
  static Map<String, dynamic>? safeJsonDecode(String jsonString) {
    try {
      return jsonDecode(jsonString) as Map<String, dynamic>?;
    } catch (e) {
      return null;
    }
  }
  
  /// 格式化时间戳
  static String formatTimestamp(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

