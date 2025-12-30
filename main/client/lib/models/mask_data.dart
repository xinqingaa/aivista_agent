import 'package:json_annotation/json_annotation.dart';
import 'package:flutter/material.dart';

part 'mask_data.g.dart';

/// 画布模式枚举
enum CanvasMode {
  @JsonValue('view')
  view,
  @JsonValue('draw_mask')
  drawMask,
}

/// 蒙版路径数据模型
@JsonSerializable(explicitToJson: true)
class MaskPath {
  @JsonKey(
    fromJson: _pointsFromJson,
    toJson: _pointsToJson,
  )
  final List<Offset> points;
  final double strokeWidth;
  @JsonKey(
    fromJson: _colorFromJson,
    toJson: _colorToJson,
  )
  final int color;
  @JsonKey(
    fromJson: _dateTimeFromJson,
    toJson: _dateTimeToJson,
  )
  final DateTime createdAt;

  MaskPath({
    required this.points,
    this.strokeWidth = 3.0,
    int? color,
    DateTime? createdAt,
  }) : color = color ?? Colors.red.value,
       createdAt = createdAt ?? DateTime.now();

  /// 从 Color 创建 MaskPath（便捷构造函数）
  factory MaskPath.withColor({
    required List<Offset> points,
    double strokeWidth = 3.0,
    Color? color,
    DateTime? createdAt,
  }) {
    return MaskPath(
      points: points,
      strokeWidth: strokeWidth,
      color: color?.value,
      createdAt: createdAt,
    );
  }

  /// 转换为图片坐标（需要 CanvasTransform）
  List<Point> toImageCoordinates(dynamic transform) {
    // 此方法需要在 CanvasTransform 实现后完善
    return points.map((screenPoint) {
      return Point(screenPoint.dx, screenPoint.dy);
    }).toList();
  }

  // JSON 转换辅助函数
  static List<Offset> _pointsFromJson(List<dynamic> json) {
    return json.map((item) {
      if (item is Map) {
        return Offset(
          (item['dx'] as num).toDouble(),
          (item['dy'] as num).toDouble(),
        );
      }
      return Offset.zero;
    }).toList();
  }

  static List<Map<String, double>> _pointsToJson(List<Offset> points) {
    return points.map((offset) => {
      'dx': offset.dx,
      'dy': offset.dy,
    }).toList();
  }

  static int _colorFromJson(dynamic json) {
    if (json is int) {
      return json;
    }
    if (json is String) {
      // 支持十六进制字符串格式，如 "#FF0000"
      return int.parse(json.replaceFirst('#', ''), radix: 16);
    }
    // 默认返回红色
    return Colors.red.value;
  }

  static int _colorToJson(int color) {
    return color;
  }

  static DateTime _dateTimeFromJson(String json) {
    return DateTime.parse(json);
  }

  static String _dateTimeToJson(DateTime dateTime) {
    return dateTime.toIso8601String();
  }

  factory MaskPath.fromJson(Map<String, dynamic> json) => _$MaskPathFromJson(json);
  Map<String, dynamic> toJson() => _$MaskPathToJson(this);
}

/// 坐标点
class Point {
  final double x;
  final double y;

  Point(this.x, this.y);
}

/// 蒙版数据模型（用于传输到后端）
@JsonSerializable()
class MaskData {
  final String base64;
  final String imageUrl;
  final List<Map<String, double>>? coordinates;

  MaskData({
    required this.base64,
    required this.imageUrl,
    this.coordinates,
  });

  factory MaskData.fromJson(Map<String, dynamic> json) => _$MaskDataFromJson(json);
  Map<String, dynamic> toJson() => _$MaskDataToJson(this);
}

