import 'package:flutter/material.dart';
import 'package:aivista_client/models/genui_component.dart';

/// 操作面板组件
/// 
/// 支持按钮、滑块、选择器、输入框等动态操作控件
class ActionPanelWidget extends StatelessWidget {
  final List<ActionItem> actions;
  final Function(String, dynamic)? onActionTriggered;

  const ActionPanelWidget({
    super.key,
    required this.actions,
    this.onActionTriggered,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: actions.map((action) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
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
        return const SizedBox.shrink();
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
              style: const TextStyle(
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
      return const SizedBox.shrink();
    }

    String? selectedValue = action.value?.toString();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          action.label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
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
          decoration: const InputDecoration(
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
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          enabled: action.disabled != true,
          decoration: InputDecoration(
            hintText: action.placeholder,
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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

