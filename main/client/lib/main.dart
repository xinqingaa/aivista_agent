import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:aivista_client/app/chat/chat_page.dart';
import 'package:aivista_client/app/providers/chat_state_provider.dart';
import 'package:aivista_client/app/providers/canvas_state_provider.dart';
import 'package:aivista_client/app/providers/agent_state_provider.dart';

void main() {
  runApp(const AiVistaApp());
}

/// AiVista 应用主入口
/// 
/// 配置 MultiProvider 和深色主题（赛博朋克风格）
class AiVistaApp extends StatelessWidget {
  const AiVistaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ChatStateProvider()),
        ChangeNotifierProvider(create: (_) => CanvasStateProvider()),
        ChangeNotifierProvider(create: (_) => AgentStateProvider()),
      ],
      child: MaterialApp(
        title: 'AiVista',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          // 深色主题（赛博朋克风格）
          brightness: Brightness.dark,
          colorScheme: ColorScheme.dark(
            primary: const Color(0xFF00D9FF), // 青色（赛博朋克主色）
            secondary: const Color(0xFFFF006E), // 粉红色（赛博朋克辅助色）
            surface: const Color(0xFF0A0E27), // 深蓝黑色背景
            background: const Color(0xFF050810), // 更深背景
            error: const Color(0xFFFF1744),
            onPrimary: Colors.black,
            onSecondary: Colors.white,
            onSurface: Colors.white,
            onBackground: Colors.white,
            onError: Colors.white,
          ),
          scaffoldBackgroundColor: const Color(0xFF050810),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF0A0E27),
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          cardTheme: CardThemeData(
            color: const Color(0xFF0A0E27),
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: const Color(0xFF0A0E27),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(24),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(24),
              borderSide: BorderSide(
                color: Colors.grey[800]!,
                width: 1,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(24),
              borderSide: const BorderSide(
                color: Color(0xFF00D9FF),
                width: 2,
              ),
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00D9FF),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
            ),
          ),
          textTheme: const TextTheme(
            displayLarge: TextStyle(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
            displayMedium: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
            displaySmall: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
            headlineMedium: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
            bodyLarge: TextStyle(
              color: Colors.white,
              fontSize: 16,
            ),
            bodyMedium: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
        ),
        home: const ChatPage(),
      ),
    );
  }
}
