import 'package:json_annotation/json_annotation.dart';

part 'genui_component.g.dart';

/// GenUI 组件类型枚举
enum WidgetType {
  @JsonValue('SmartCanvas')
  smartCanvas,
  @JsonValue('AgentMessage')
  agentMessage,
  @JsonValue('ActionPanel')
  actionPanel,
}

/// 组件更新模式
enum UpdateMode {
  @JsonValue('append')
  append,
  @JsonValue('update')
  update,
  @JsonValue('replace')
  replace,
}

/// GenUI 组件数据模型
@JsonSerializable()
class GenUIComponent {
  final String? id;
  final WidgetType widgetType;
  final Map<String, dynamic> props;
  final UpdateMode? updateMode;
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

  factory GenUIComponent.fromJson(Map<String, dynamic> json) => _$GenUIComponentFromJson(json);
  Map<String, dynamic> toJson() => _$GenUIComponentToJson(this);
}

/// 操作项模型
@JsonSerializable()
class ActionItem {
  final String id;
  final String label;
  final String type; // 'button' | 'slider' | 'select' | 'input'
  final String? buttonType; // 'primary' | 'danger' | 'default'
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

  factory ActionItem.fromJson(Map<String, dynamic> json) => _$ActionItemFromJson(json);
  Map<String, dynamic> toJson() => _$ActionItemToJson(this);
}

/// 选择项模型
@JsonSerializable()
class SelectOption {
  final String label;
  final dynamic value;
  final bool? disabled;

  SelectOption({
    required this.label,
    required this.value,
    this.disabled,
  });

  factory SelectOption.fromJson(Map<String, dynamic> json) => _$SelectOptionFromJson(json);
  Map<String, dynamic> toJson() => _$SelectOptionToJson(this);
}

