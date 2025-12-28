# 状态管理设计文档 (State Management Design)

## 1. 目标

本文档详细定义 AiVista 前端的状态管理架构，使用 Provider 模式管理应用状态，确保画布状态、聊天状态和 Agent 状态的正确同步。

**核心目标：**
- 实现清晰的状态分离（ChatState、CanvasState、AgentState）
- 确保状态同步机制
- 支持操作历史管理（撤销/重做）
- 提供状态持久化能力

## 2. 状态架构概览

### 2.1 状态层次结构

```
AppState (根状态)
├── ChatState (聊天状态)
│   ├── messages: List<Message>
│   ├── components: List<GenUIComponent>
│   └── isLoading: bool
├── CanvasState (画布状态)
│   ├── currentImageUrl: String?
│   ├── maskPaths: List<MaskPath>
│   └── history: List<CanvasState>
└── AgentState (Agent 状态)
    ├── sessionId: String
    ├── currentTask: String?
    └── connectionStatus: ConnectionStatus
```

### 2.2 Provider 架构

```dart
MultiProvider(
  providers: [
    ChangeNotifierProvider(create: (_) => ChatStateProvider()),
    ChangeNotifierProvider(create: (_) => CanvasStateProvider()),
    ChangeNotifierProvider(create: (_) => AgentStateProvider()),
  ],
  child: MyApp(),
)
```

## 3. ChatState 设计

### 3.1 ChatState 数据模型

```dart
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

class Message {
  final String id;
  final String role; // 'user' | 'assistant'
  final String content;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  Message({
    required this.id,
    required this.role,
    required this.content,
    DateTime? timestamp,
    this.metadata,
  }) : timestamp = timestamp ?? DateTime.now();
}
```

### 3.2 ChatStateProvider

```dart
class ChatStateProvider extends ChangeNotifier {
  ChatState _state = ChatState();

  ChatState get state => _state;

  // 添加用户消息
  void addUserMessage(String content) {
    final message = Message(
      id: _generateId(),
      role: 'user',
      content: content,
    );

    _state = _state.copyWith(
      messages: [..._state.messages, message],
    );
    notifyListeners();
  }

  // 添加 GenUI 组件
  void addComponent(GenUIComponent component) {
    final updateMode = component.updateMode ?? 'append';

    switch (updateMode) {
      case 'append':
        _state = _state.copyWith(
          components: [..._state.components, component],
        );
        break;
      case 'update':
        _updateComponent(component);
        break;
      case 'replace':
        _replaceComponent(component);
        break;
    }
    notifyListeners();
  }

  // 更新组件
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

  // 替换组件
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

  // 设置加载状态
  void setLoading(bool isLoading) {
    _state = _state.copyWith(isLoading: isLoading);
    notifyListeners();
  }

  // 设置错误
  void setError(String error) {
    _state = _state.copyWith(error: error);
    notifyListeners();
  }

  // 清除错误
  void clearError() {
    _state = _state.copyWith(error: null);
    notifyListeners();
  }

  // 清除所有状态
  void clear() {
    _state = ChatState();
    notifyListeners();
  }

  String _generateId() {
    return 'msg_${DateTime.now().millisecondsSinceEpoch}';
  }
}
```

## 4. CanvasState 设计

### 4.1 CanvasState 数据模型

```dart
class CanvasState {
  final String? currentImageUrl;
  final ui.Image? currentImage;
  final Size imageSize;
  final Size displaySize;
  final Matrix4 transform;
  final double scale;
  final Offset panOffset;
  final List<MaskPath> maskPaths;
  final CanvasMode mode;
  final List<CanvasState> history;
  final int historyIndex;

  CanvasState({
    this.currentImageUrl,
    this.currentImage,
    required this.imageSize,
    required this.displaySize,
    Matrix4? transform,
    this.scale = 1.0,
    this.panOffset = Offset.zero,
    List<MaskPath>? maskPaths,
    required this.mode,
    List<CanvasState>? history,
    this.historyIndex = -1,
  }) : transform = transform ?? Matrix4.identity(),
       maskPaths = maskPaths ?? [],
       history = history ?? [];

  CanvasState copyWith({
    String? currentImageUrl,
    ui.Image? currentImage,
    Size? imageSize,
    Size? displaySize,
    Matrix4? transform,
    double? scale,
    Offset? panOffset,
    List<MaskPath>? maskPaths,
    CanvasMode? mode,
    List<CanvasState>? history,
    int? historyIndex,
  }) {
    return CanvasState(
      currentImageUrl: currentImageUrl ?? this.currentImageUrl,
      currentImage: currentImage ?? this.currentImage,
      imageSize: imageSize ?? this.imageSize,
      displaySize: displaySize ?? this.displaySize,
      transform: transform ?? this.transform,
      scale: scale ?? this.scale,
      panOffset: panOffset ?? this.panOffset,
      maskPaths: maskPaths ?? this.maskPaths,
      mode: mode ?? this.mode,
      history: history ?? this.history,
      historyIndex: historyIndex ?? this.historyIndex,
    );
  }
}
```

### 4.2 CanvasStateProvider

```dart
class CanvasStateProvider extends ChangeNotifier {
  CanvasState _state = CanvasState(
    imageSize: Size.zero,
    displaySize: Size.zero,
    mode: CanvasMode.view,
  );

  CanvasState get state => _state;

  // 设置当前图片
  Future<void> setImage(String imageUrl, Size displaySize) async {
    try {
      // 加载图片
      final image = await _loadImage(imageUrl);
      
      _state = _state.copyWith(
        currentImageUrl: imageUrl,
        currentImage: image,
        imageSize: Size(image.width.toDouble(), image.height.toDouble()),
        displaySize: displaySize,
      );
      
      // 保存到历史
      _saveToHistory();
      notifyListeners();
    } catch (e) {
      throw Exception('Failed to load image: $e');
    }
  }

  // 添加蒙版路径
  void addMaskPath(MaskPath path) {
    final newPaths = List<MaskPath>.from(_state.maskPaths)..add(path);
    
    _state = _state.copyWith(maskPaths: newPaths);
    _saveToHistory();
    notifyListeners();
  }

  // 清除所有蒙版
  void clearMaskPaths() {
    _state = _state.copyWith(maskPaths: []);
    _saveToHistory();
    notifyListeners();
  }

  // 更新变换
  void updateTransform(Matrix4 transform, double scale, Offset panOffset) {
    _state = _state.copyWith(
      transform: transform,
      scale: scale,
      panOffset: panOffset,
    );
    notifyListeners();
  }

  // 设置模式
  void setMode(CanvasMode mode) {
    _state = _state.copyWith(mode: mode);
    notifyListeners();
  }

  // 撤销
  void undo() {
    if (_state.historyIndex > 0) {
      final previousIndex = _state.historyIndex - 1;
      final previousState = _state.history[previousIndex];
      
      _state = previousState.copyWith(
        history: _state.history,
        historyIndex: previousIndex,
      );
      notifyListeners();
    }
  }

  // 重做
  void redo() {
    if (_state.historyIndex < _state.history.length - 1) {
      final nextIndex = _state.historyIndex + 1;
      final nextState = _state.history[nextIndex];
      
      _state = nextState.copyWith(
        history: _state.history,
        historyIndex: nextIndex,
      );
      notifyListeners();
    }
  }

  // 保存到历史
  void _saveToHistory() {
    final newHistory = List<CanvasState>.from(_state.history);
    
    // 如果当前不在历史末尾，删除后面的记录
    if (_state.historyIndex < newHistory.length - 1) {
      newHistory.removeRange(_state.historyIndex + 1, newHistory.length);
    }
    
    // 添加新状态
    newHistory.add(_state);
    
    // 限制历史记录大小
    if (newHistory.length > 50) {
      newHistory.removeAt(0);
    }
    
    _state = _state.copyWith(
      history: newHistory,
      historyIndex: newHistory.length - 1,
    );
  }

  // 检查是否可以撤销
  bool canUndo() => _state.historyIndex > 0;

  // 检查是否可以重做
  bool canRedo() => _state.historyIndex < _state.history.length - 1;

  Future<ui.Image> _loadImage(String url) async {
    final response = await http.get(Uri.parse(url));
    final codec = await ui.instantiateImageCodec(response.bodyBytes);
    final frame = await codec.getNextFrame();
    return frame.image;
  }
}
```

## 5. AgentState 设计

### 5.1 AgentState 数据模型

```dart
enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  error,
}

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
```

### 5.2 AgentStateProvider

```dart
class AgentStateProvider extends ChangeNotifier {
  AgentState _state = AgentState();
  final ChatService _chatService = ChatService();

  AgentState get state => _state;

  // 连接 SSE
  Future<void> connect() async {
    _state = _state.copyWith(
      connectionStatus: ConnectionStatus.connecting,
    );
    notifyListeners();

    try {
      await _chatService.connect(
        onConnected: () {
          _state = _state.copyWith(
            connectionStatus: ConnectionStatus.connected,
            sessionId: _chatService.sessionId,
          );
          notifyListeners();
        },
        onError: (error) {
          _state = _state.copyWith(
            connectionStatus: ConnectionStatus.error,
            error: error.toString(),
          );
          notifyListeners();
        },
      );
    } catch (e) {
      _state = _state.copyWith(
        connectionStatus: ConnectionStatus.error,
        error: e.toString(),
      );
      notifyListeners();
    }
  }

  // 断开连接
  void disconnect() {
    _chatService.disconnect();
    _state = _state.copyWith(
      connectionStatus: ConnectionStatus.disconnected,
    );
    notifyListeners();
  }

  // 设置当前任务
  void setCurrentTask(String task, {Map<String, dynamic>? metadata}) {
    _state = _state.copyWith(
      currentTask: task,
      taskMetadata: metadata ?? {},
    );
    notifyListeners();
  }

  // 清除任务
  void clearTask() {
    _state = _state.copyWith(
      currentTask: null,
      taskMetadata: {},
    );
    notifyListeners();
  }
}
```

## 6. 状态同步机制

### 6.1 画布状态与 Agent 响应同步

```dart
class StateSyncService {
  final ChatStateProvider _chatState;
  final CanvasStateProvider _canvasState;
  final AgentStateProvider _agentState;

  StateSyncService(
    this._chatState,
    this._canvasState,
    this._agentState,
  ) {
    _setupSync();
  }

  void _setupSync() {
    // 监听 GenUI 组件中的 SmartCanvas
    _chatState.addListener(() {
      final components = _chatState.state.components;
      
      for (final component in components) {
        if (component.widgetType == 'SmartCanvas') {
          final imageUrl = component.props['imageUrl'] as String?;
          final mode = component.props['mode'] as String?;
          
          if (imageUrl != null) {
            // 同步到 CanvasState
            _canvasState.setImage(imageUrl, _canvasState.state.displaySize);
            
            if (mode == 'draw_mask') {
              _canvasState.setMode(CanvasMode.drawMask);
            } else {
              _canvasState.setMode(CanvasMode.view);
            }
          }
        }
      }
    });
  }
}
```

### 6.2 蒙版数据同步到 Agent

```dart
class MaskSyncService {
  final CanvasStateProvider _canvasState;
  final ChatService _chatService;

  MaskSyncService(
    this._canvasState,
    this._chatService,
  ) {
    _setupSync();
  }

  void _setupSync() {
    // 监听画布蒙版变化
    _canvasState.addListener(() {
      final maskPaths = _canvasState.state.maskPaths;
      
      if (maskPaths.isNotEmpty) {
        // 生成蒙版数据并发送到后端
        final maskData = _generateMaskData(maskPaths);
        _chatService.sendMaskData(maskData);
      }
    });
  }

  MaskData _generateMaskData(List<MaskPath> paths) {
    // 实现蒙版数据生成逻辑
    // 参考 SMART_CANVAS_DESIGN.md
    return MaskData(
      imageUrl: _canvasState.state.currentImageUrl ?? '',
      coordinates: paths.expand((p) => p.points).toList(),
    );
  }
}
```

## 7. 状态持久化

### 7.1 使用 SharedPreferences

```dart
class StatePersistence {
  static const String _chatStateKey = 'chat_state';
  static const String _canvasStateKey = 'canvas_state';
  static const String _agentStateKey = 'agent_state';

  // 保存聊天状态
  static Future<void> saveChatState(ChatState state) async {
    final prefs = await SharedPreferences.getInstance();
    final json = {
      'messages': state.messages.map((m) => m.toJson()).toList(),
      'components': state.components.map((c) => c.toJson()).toList(),
    };
    await prefs.setString(_chatStateKey, jsonEncode(json));
  }

  // 加载聊天状态
  static Future<ChatState?> loadChatState() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_chatStateKey);
    if (jsonString == null) return null;

    final json = jsonDecode(jsonString);
    return ChatState(
      messages: (json['messages'] as List?)
          ?.map((m) => Message.fromJson(m))
          .toList() ?? [],
      components: (json['components'] as List?)
          ?.map((c) => GenUIComponent.fromJson(c))
          .toList() ?? [],
    );
  }

  // 保存画布状态
  static Future<void> saveCanvasState(CanvasState state) async {
    final prefs = await SharedPreferences.getInstance();
    final json = {
      'currentImageUrl': state.currentImageUrl,
      'scale': state.scale,
      'panOffset': {'dx': state.panOffset.dx, 'dy': state.panOffset.dy},
      'maskPaths': state.maskPaths.map((p) => p.toJson()).toList(),
      'mode': state.mode.toString(),
    };
    await prefs.setString(_canvasStateKey, jsonEncode(json));
  }

  // 加载画布状态
  static Future<CanvasState?> loadCanvasState(Size displaySize) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_canvasStateKey);
    if (jsonString == null) return null;

    final json = jsonDecode(jsonString);
    return CanvasState(
      currentImageUrl: json['currentImageUrl'],
      imageSize: Size.zero, // 需要重新加载图片获取尺寸
      displaySize: displaySize,
      scale: json['scale']?.toDouble() ?? 1.0,
      panOffset: Offset(
        json['panOffset']['dx']?.toDouble() ?? 0.0,
        json['panOffset']['dy']?.toDouble() ?? 0.0,
      ),
      maskPaths: (json['maskPaths'] as List?)
          ?.map((p) => MaskPath.fromJson(p))
          .toList() ?? [],
      mode: _parseMode(json['mode']),
    );
  }

  static CanvasMode _parseMode(String? modeString) {
    if (modeString?.contains('drawMask') ?? false) {
      return CanvasMode.drawMask;
    }
    return CanvasMode.view;
  }
}
```

### 7.2 自动保存

```dart
class AutoSaveService {
  final ChatStateProvider _chatState;
  final CanvasStateProvider _canvasState;
  Timer? _saveTimer;

  AutoSaveService(
    this._chatState,
    this._canvasState,
  ) {
    _startAutoSave();
  }

  void _startAutoSave() {
    // 每 30 秒自动保存一次
    _saveTimer = Timer.periodic(Duration(seconds: 30), (_) {
      _save();
    });
  }

  Future<void> _save() async {
    await Future.wait([
      StatePersistence.saveChatState(_chatState.state),
      StatePersistence.saveCanvasState(_canvasState.state),
    ]);
  }

  void dispose() {
    _saveTimer?.cancel();
  }
}
```

## 8. 状态恢复

### 8.1 应用启动时恢复状态

```dart
class AppStateRestorer {
  final ChatStateProvider _chatState;
  final CanvasStateProvider _canvasState;
  final AgentStateProvider _agentState;

  AppStateRestorer(
    this._chatState,
    this._canvasState,
    this._agentState,
  );

  Future<void> restore() async {
    // 恢复聊天状态
    final chatState = await StatePersistence.loadChatState();
    if (chatState != null) {
      _chatState.restore(chatState);
    }

    // 恢复画布状态
    final canvasState = await StatePersistence.loadCanvasState(
      _canvasState.state.displaySize,
    );
    if (canvasState != null) {
      _canvasState.restore(canvasState);
    }
  }
}
```

## 9. 性能优化

### 9.1 选择性通知

```dart
class OptimizedChatStateProvider extends ChangeNotifier {
  ChatState _state = ChatState();
  bool _notifyScheduled = false;

  void addComponent(GenUIComponent component) {
    // 批量更新，延迟通知
    _state = _state.copyWith(
      components: [..._state.components, component],
    );
    _scheduleNotify();
  }

  void _scheduleNotify() {
    if (!_notifyScheduled) {
      _notifyScheduled = true;
      Future.microtask(() {
        notifyListeners();
        _notifyScheduled = false;
      });
    }
  }
}
```

### 9.2 状态分片

```dart
// 将大状态拆分为多个小的 Provider
class MaskPathsProvider extends ChangeNotifier {
  List<MaskPath> _paths = [];
  List<MaskPath> get paths => _paths;
  
  void addPath(MaskPath path) {
    _paths = [..._paths, path];
    notifyListeners();
  }
}
```

## 10. 测试策略

### 10.1 Provider 测试

```dart
void main() {
  test('ChatStateProvider adds message', () {
    final provider = ChatStateProvider();
    provider.addUserMessage('Hello');
    
    expect(provider.state.messages.length, 1);
    expect(provider.state.messages.first.content, 'Hello');
  });

  test('CanvasStateProvider undo/redo', () {
    final provider = CanvasStateProvider();
    provider.addMaskPath(MaskPath(points: [Offset(0, 0)]));
    
    expect(provider.canUndo(), true);
    
    provider.undo();
    expect(provider.state.maskPaths.length, 0);
    
    provider.redo();
    expect(provider.state.maskPaths.length, 1);
  });
}
```

