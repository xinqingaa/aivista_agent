/// 应用常量定义
class AppConstants {
  // API 配置
  static const String baseUrl = 'http://localhost:3000';
  static const String sseEndpoint = '/api/agent/chat';
  static const String apiBaseUrl = '$baseUrl$sseEndpoint';
  
  // 超时配置
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(minutes: 5);
  
  // 重连配置
  static const int maxReconnectAttempts = 5;
  static const Duration reconnectDelay = Duration(seconds: 2);
  
  // 画布配置
  static const double minScale = 0.5;
  static const double maxScale = 5.0;
  static const double defaultScale = 1.0;
  static const int maxHistorySize = 50;
  
  // 蒙版配置
  static const double defaultStrokeWidth = 3.0;
  static const int maxPathPoints = 10000;
  static const int maxPaths = 100;
}

