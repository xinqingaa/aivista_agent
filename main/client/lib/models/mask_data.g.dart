// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mask_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MaskPath _$MaskPathFromJson(Map<String, dynamic> json) => MaskPath(
  points: MaskPath._pointsFromJson(json['points'] as List),
  strokeWidth: (json['strokeWidth'] as num?)?.toDouble() ?? 3.0,
  color: MaskPath._colorFromJson(json['color']),
  createdAt: MaskPath._dateTimeFromJson(json['createdAt'] as String),
);

Map<String, dynamic> _$MaskPathToJson(MaskPath instance) => <String, dynamic>{
  'points': MaskPath._pointsToJson(instance.points),
  'strokeWidth': instance.strokeWidth,
  'color': MaskPath._colorToJson(instance.color),
  'createdAt': MaskPath._dateTimeToJson(instance.createdAt),
};

MaskData _$MaskDataFromJson(Map<String, dynamic> json) => MaskData(
  base64: json['base64'] as String,
  imageUrl: json['imageUrl'] as String,
  coordinates: (json['coordinates'] as List<dynamic>?)
      ?.map(
        (e) => (e as Map<String, dynamic>).map(
          (k, e) => MapEntry(k, (e as num).toDouble()),
        ),
      )
      .toList(),
);

Map<String, dynamic> _$MaskDataToJson(MaskData instance) => <String, dynamic>{
  'base64': instance.base64,
  'imageUrl': instance.imageUrl,
  'coordinates': instance.coordinates,
};
