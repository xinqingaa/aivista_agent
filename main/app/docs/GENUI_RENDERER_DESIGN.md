# GenUI 渲染器设计文档 (GenUI Renderer Design)

## 1. 目标

本文档详细定义 AiVista 前端 GenUI 渲染器的设计，实现根据后端下发的 JSON 数据动态渲染 UI 组件，支持流式更新和组件状态管理。

**核心目标：**
- 实现组件工厂模式，动态创建 Widget
- 支持三种组件类型：SmartCanvas、AgentMessage、ActionPanel
- 实现组件更新策略（追加、替换、更新）
- 支持流式渲染和实时更新

## 2. 组件架构

### 2.1 渲染器层次结构

```
GenUIRenderer (工厂类)
├── SmartCanvasWidget (智能画布)
├── AgentMessageWidget (消息气泡)
└── ActionPanelWidget (操作面板)

ChatPage (主页面)
└── GenUIList (组件列表)
    └── GenUIItem (单个组件项)
        └── GenUIRenderer.build()
```

### 2.2 核心接口定义

```dart
// GenUI 组件数据模型
class GenUIComponent {
  final String? id;
  final String widgetType;
  final Map<String, dynamic> props;
  final String? updateMode; // 'append' | 'replace' | 'update'
  final String? targetId;
  final int? timestamp;

  GenUIComponent({
    this.id,
    required this.widgetType,
    required this.props,
    this.updateMode,
    this.targetId,
    this.timestamp,
  });

  factory GenUIComponent.fromJson(Map<String, dynamic> json) {
    return GenUIComponent(
      id: json['id'] as String?,
      widgetType: json['widgetType'] as String,
      props: json['props'] as Map<String, dynamic>,
      updateMode: json['updateMode'] as String?,
      targetId: json['targetId'] as String?,
      timestamp: json['timestamp'] as int?,
    );
  }
}
```

## 3. 组件工厂实现

### 3.1 GenUIRenderer 工厂类

```dart
class GenUIRenderer {
  /// 根据组件类型创建对应的 Widget
  static Widget build(GenUIComponent component, {
    Function(String)? onImageTapped,
    Function(MaskData)? onMaskChanged,
    Function(String, dynamic)? onActionTriggered,
  }) {
    switch (component.widgetType) {
      case 'SmartCanvas':
        return _buildSmartCanvas(
          component,
          onImageTapped: onImageTapped,
          onMaskChanged: onMaskChanged,
        );
      
      case 'AgentMessage':
        return _buildAgentMessage(component);
      
      case 'ActionPanel':
        return _buildActionPanel(
          component,
          onActionTriggered: onActionTriggered,
        );
      
      default:
        return _buildUnknownComponent(component);
    }
  }

  /// 构建 SmartCanvas 组件
  static Widget _buildSmartCanvas(
    GenUIComponent component, {
    Function(String)? onImageTapped,
    Function(MaskData)? onMaskChanged,
  }) {
    final props = component.props;
    final imageUrl = props['imageUrl'] as String? ?? '';
    final modeString = props['mode'] as String? ?? 'view';
    final mode = modeString == 'draw_mask' 
        ? CanvasMode.drawMask 
        : CanvasMode.view;
    final ratio = props['ratio'] as double?;

    return SmartCanvas(
      imageUrl: imageUrl,
      mode: mode,
      ratio: ratio,
      onImageTapped: onImageTapped,
      onMaskChanged: onMaskChanged,
    );
  }

  /// 构建 AgentMessage 组件
  static Widget _buildAgentMessage(GenUIComponent component) {
    final props = component.props;
    final text = props['text'] as String? ?? '';
    final stateString = props['state'] as String? ?? 'success';
    final state = _parseMessageState(stateString);
    final isThinking = props['isThinking'] as bool? ?? false;

    return AgentMessageWidget(
      text: text,
      state: state,
      isThinking: isThinking,
    );
  }

  /// 构建 ActionPanel 组件
  static Widget _buildActionPanel(
    GenUIComponent component, {
    Function(String, dynamic)? onActionTriggered,
  }) {
    final props = component.props;
    final actionsJson = props['actions'] as List<dynamic>? ?? [];
    final actions = actionsJson
        .map((json) => ActionItem.fromJson(json as Map<String, dynamic>))
        .toList();

    return ActionPanelWidget(
      actions: actions,
      onActionTriggered: onActionTriggered,
    );
  }

  /// 解析消息状态
  static MessageState _parseMessageState(String state) {
    switch (state) {
      case 'loading':
        return MessageState.loading;
      case 'failed':
        return MessageState.failed;
      default:
        return MessageState.success;
    }
  }

  /// 构建未知组件（降级处理）
  static Widget _buildUnknownComponent(GenUIComponent component) {
    return Container(
      padding: EdgeInsets.all(16),
      child: Text(
        'Unknown component type: ${component.widgetType}',
        style: TextStyle(color: Colors.orange),
      ),
    );
  }
}
```

## 4. 组件实现

### 4.1 AgentMessageWidget

```dart
enum MessageState {
  success,
  loading,
  failed,
}

class AgentMessageWidget extends StatelessWidget {
  final String text;
  final MessageState state;
  final bool isThinking;

  const AgentMessageWidget({
    Key? key,
    required this.text,
    required this.state,
    this.isThinking = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // AI 头像
          CircleAvatar(
            backgroundColor: Colors.blue,
            child: Icon(Icons.smart_toy, color: Colors.white),
          ),
          SizedBox(width: 12),
          // 消息气泡
          Expanded(
            child: Container(
              padding: EdgeInsets.all(12),
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
                      padding: EdgeInsets.only(top: 8),
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
        SizedBox(width: 8),
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
```

### 4.2 ActionPanelWidget

```dart
class ActionItem {
  final String id;
  final String label;
  final String type; // 'button' | 'slider' | 'select' | 'input'
  final String? buttonType;
  final double? min;
  final double? max;
  final double? step;
  final dynamic value;
  final String? unit;
  final List<SelectOption>? options;
  final String? placeholder;
  final String? inputType;
  final bool? disabled;
  final String? tooltip;

  ActionItem({
    required this.id,
    required this.label,
    required this.type,
    this.buttonType,
    this.min,
    this.max,
    this.step,
    this.value,
    this.unit,
    this.options,
    this.placeholder,
    this.inputType,
    this.disabled,
    this.tooltip,
  });

  factory ActionItem.fromJson(Map<String, dynamic> json) {
    return ActionItem(
      id: json['id'] as String,
      label: json['label'] as String,
      type: json['type'] as String,
      buttonType: json['buttonType'] as String?,
      min: json['min']?.toDouble(),
      max: json['max']?.toDouble(),
      step: json['step']?.toDouble(),
      value: json['value'],
      unit: json['unit'] as String?,
      options: (json['options'] as List<dynamic>?)
          ?.map((opt) => SelectOption.fromJson(opt as Map<String, dynamic>))
          .toList(),
      placeholder: json['placeholder'] as String?,
      inputType: json['inputType'] as String?,
      disabled: json['disabled'] as bool?,
      tooltip: json['tooltip'] as String?,
    );
  }
}

class SelectOption {
  final String label;
  final dynamic value;
  final bool? disabled;

  SelectOption({
    required this.label,
    required this.value,
    this.disabled,
  });

  factory SelectOption.fromJson(Map<String, dynamic> json) {
    return SelectOption(
      label: json['label'] as String,
      value: json['value'],
      disabled: json['disabled'] as bool?,
    );
  }
}

class ActionPanelWidget extends StatelessWidget {
  final List<ActionItem> actions;
  final Function(String, dynamic)? onActionTriggered;

  const ActionPanelWidget({
    Key? key,
    required this.actions,
    this.onActionTriggered,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: actions.map((action) {
          return Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: _buildActionWidget(action),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildActionWidget(ActionItem action) {
    switch (action.type) {
      case 'button':
        return _buildButton(action);
      case 'slider':
        return _buildSlider(action);
      case 'select':
        return _buildSelect(action);
      case 'input':
        return _buildInput(action);
      default:
        return SizedBox.shrink();
    }
  }

  Widget _buildButton(ActionItem action) {
    final buttonStyle = action.buttonType == 'primary'
        ? ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          )
        : action.buttonType == 'danger'
            ? ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              )
            : OutlinedButton.styleFrom();

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: action.disabled == true
            ? null
            : () => onActionTriggered?.call(action.id, null),
        style: buttonStyle,
        child: Text(action.label),
      ),
    );
  }

  Widget _buildSlider(ActionItem action) {
    double currentValue = (action.value as num?)?.toDouble() ?? 
                         (action.min ?? 0.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              action.label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              '${currentValue.toInt()}${action.unit ?? ''}',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        Slider(
          value: currentValue,
          min: action.min ?? 0.0,
          max: action.max ?? 100.0,
          divisions: action.step != null
              ? ((action.max! - action.min!) / action.step!).round()
              : null,
          onChanged: action.disabled == true
              ? null
              : (value) {
                  onActionTriggered?.call(action.id, value);
                },
        ),
      ],
    );
  }

  Widget _buildSelect(ActionItem action) {
    if (action.options == null || action.options!.isEmpty) {
      return SizedBox.shrink();
    }

    String? selectedValue = action.value?.toString();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          action.label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: selectedValue,
          items: action.options!.map((option) {
            return DropdownMenuItem<String>(
              value: option.value.toString(),
              child: Text(option.label),
            );
          }).toList(),
          onChanged: action.disabled == true
              ? null
              : (value) {
                  onActionTriggered?.call(action.id, value);
                },
          decoration: InputDecoration(
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
        ),
      ],
    );
  }

  Widget _buildInput(ActionItem action) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          action.label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        SizedBox(height: 8),
        TextField(
          enabled: action.disabled != true,
          decoration: InputDecoration(
            hintText: action.placeholder,
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
          keyboardType: action.inputType == 'number'
              ? TextInputType.number
              : TextInputType.text,
          onChanged: (value) {
            onActionTriggered?.call(action.id, value);
          },
        ),
      ],
    );
  }
}
```

## 5. 组件列表管理

### 5.1 GenUIList 状态管理

```dart
class GenUIListState extends State<GenUIList> {
  final List<GenUIComponent> _components = [];
  final Map<String, int> _componentIndexMap = {}; // id -> index

  /// 添加组件
  void addComponent(GenUIComponent component) {
    setState(() {
      _components.add(component);
      if (component.id != null) {
        _componentIndexMap[component.id!] = _components.length - 1;
      }
    });
  }

  /// 更新组件
  void updateComponent(GenUIComponent component) {
    if (component.id == null || component.targetId == null) {
      return;
    }

    final targetIndex = _componentIndexMap[component.targetId];
    if (targetIndex == null) {
      return;
    }

    setState(() {
      // 合并 props
      final existingComponent = _components[targetIndex];
      final mergedProps = Map<String, dynamic>.from(existingComponent.props);
      mergedProps.addAll(component.props);

      _components[targetIndex] = GenUIComponent(
        id: existingComponent.id,
        widgetType: existingComponent.widgetType,
        props: mergedProps,
        updateMode: existingComponent.updateMode,
        targetId: existingComponent.targetId,
        timestamp: component.timestamp ?? existingComponent.timestamp,
      );
    });
  }

  /// 替换组件
  void replaceComponent(GenUIComponent component) {
    if (component.id == null || component.targetId == null) {
      return;
    }

    final targetIndex = _componentIndexMap[component.targetId];
    if (targetIndex == null) {
      return;
    }

    setState(() {
      _components[targetIndex] = component;
    });
  }

  /// 处理组件更新
  void handleComponent(GenUIComponent component) {
    final updateMode = component.updateMode ?? 'append';

    switch (updateMode) {
      case 'append':
        addComponent(component);
        break;
      case 'update':
        updateComponent(component);
        break;
      case 'replace':
        replaceComponent(component);
        break;
      default:
        addComponent(component);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: _components.length,
      itemBuilder: (context, index) {
        final component = _components[index];
        return GenUIItem(
          component: component,
          onImageTapped: widget.onImageTapped,
          onMaskChanged: widget.onMaskChanged,
          onActionTriggered: widget.onActionTriggered,
        );
      },
    );
  }
}
```

### 5.2 GenUIItem 组件项

```dart
class GenUIItem extends StatelessWidget {
  final GenUIComponent component;
  final Function(String)? onImageTapped;
  final Function(MaskData)? onMaskChanged;
  final Function(String, dynamic)? onActionTriggered;

  const GenUIItem({
    Key? key,
    required this.component,
    this.onImageTapped,
    this.onMaskChanged,
    this.onActionTriggered,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: GenUIRenderer.build(
        component,
        onImageTapped: onImageTapped,
        onMaskChanged: onMaskChanged,
        onActionTriggered: onActionTriggered,
      ),
    );
  }
}
```

## 6. 流式渲染处理

### 6.1 SSE 事件处理

```dart
class ChatService {
  StreamSubscription<SSEEvent>? _eventSubscription;

  Stream<GenUIComponent> get componentStream => _componentController.stream;
  final _componentController = StreamController<GenUIComponent>();

  void handleSSEEvent(SSEEvent event) {
    switch (event.type) {
      case 'gen_ui_component':
        final component = GenUIComponent.fromJson(event.data);
        _componentController.add(component);
        break;
      
      case 'thought_log':
        // 可以转换为 AgentMessage 组件显示
        final thoughtComponent = GenUIComponent(
          widgetType: 'AgentMessage',
          props: {
            'text': event.data['message'] ?? '',
            'state': 'loading',
            'isThinking': true,
          },
        );
        _componentController.add(thoughtComponent);
        break;
      
      case 'error':
        final errorComponent = GenUIComponent(
          widgetType: 'AgentMessage',
          props: {
            'text': event.data['message'] ?? '发生错误',
            'state': 'failed',
            'isThinking': false,
          },
        );
        _componentController.add(errorComponent);
        break;
    }
  }
}
```

### 6.2 实时更新

```dart
class ChatPage extends StatefulWidget {
  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final _chatService = ChatService();
  final _genUIListKey = GlobalKey<GenUIListState>();

  @override
  void initState() {
    super.initState();
    _chatService.componentStream.listen((component) {
      _genUIListKey.currentState?.handleComponent(component);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GenUIList(
        key: _genUIListKey,
        onImageTapped: _handleImageTapped,
        onMaskChanged: _handleMaskChanged,
        onActionTriggered: _handleActionTriggered,
      ),
    );
  }

  void _handleImageTapped(String imageUrl) {
    // 切换到编辑模式
    final editComponent = GenUIComponent(
      id: 'canvas_edit',
      widgetType: 'SmartCanvas',
      props: {
        'imageUrl': imageUrl,
        'mode': 'draw_mask',
      },
      updateMode: 'replace',
      targetId: 'canvas_edit',
    );
    _genUIListKey.currentState?.handleComponent(editComponent);
  }

  void _handleMaskChanged(MaskData maskData) {
    // 发送蒙版数据到后端
    _chatService.sendMaskData(maskData);
  }

  void _handleActionTriggered(String actionId, dynamic value) {
    // 处理操作触发（如滑块变化、按钮点击）
    _chatService.sendAction(actionId, value);
  }
}
```

## 7. 性能优化

### 7.1 组件缓存

```dart
class ComponentCache {
  final Map<String, Widget> _cache = {};
  static const int maxCacheSize = 50;

  Widget? get(String key) {
    return _cache[key];
  }

  void put(String key, Widget widget) {
    if (_cache.length >= maxCacheSize) {
      // 移除最旧的缓存项
      final firstKey = _cache.keys.first;
      _cache.remove(firstKey);
    }
    _cache[key] = widget;
  }

  void clear() {
    _cache.clear();
  }
}
```

### 7.2 懒加载

```dart
class LazyGenUIItem extends StatelessWidget {
  final GenUIComponent component;
  final bool isVisible;

  const LazyGenUIItem({
    Key? key,
    required this.component,
    this.isVisible = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (!isVisible) {
      return SizedBox.shrink();
    }

    return GenUIItem(component: component);
  }
}
```

## 8. 错误处理

### 8.1 组件解析错误

```dart
class GenUIRenderer {
  static Widget build(GenUIComponent component, {...}) {
    try {
      switch (component.widgetType) {
        // ... 组件构建逻辑
      }
    } catch (e) {
      return _buildErrorWidget(component, e);
    }
  }

  static Widget _buildErrorWidget(GenUIComponent component, dynamic error) {
    return Container(
      padding: EdgeInsets.all(16),
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '组件渲染错误',
            style: TextStyle(
              color: Colors.red[700],
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 4),
          Text(
            '类型: ${component.widgetType}',
            style: TextStyle(fontSize: 12, color: Colors.red[600]),
          ),
          Text(
            '错误: $error',
            style: TextStyle(fontSize: 12, color: Colors.red[600]),
          ),
        ],
      ),
    );
  }
}
```

## 9. 测试策略

### 9.1 组件渲染测试

```dart
void main() {
  testWidgets('GenUIRenderer builds SmartCanvas', (tester) async {
    final component = GenUIComponent(
      widgetType: 'SmartCanvas',
      props: {
        'imageUrl': 'https://example.com/image.jpg',
        'mode': 'view',
      },
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GenUIRenderer.build(component),
        ),
      ),
    );

    expect(find.byType(SmartCanvas), findsOneWidget);
  });
}
```

