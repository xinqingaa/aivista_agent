// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sse_event.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SSEEvent _$SSEEventFromJson(Map<String, dynamic> json) => SSEEvent(
  type: $enumDecode(_$SSEEventTypeEnumMap, json['type']),
  timestamp: (json['timestamp'] as num).toInt(),
  data: json['data'] as Map<String, dynamic>,
);

Map<String, dynamic> _$SSEEventToJson(SSEEvent instance) => <String, dynamic>{
  'type': _$SSEEventTypeEnumMap[instance.type]!,
  'timestamp': instance.timestamp,
  'data': instance.data,
};

const _$SSEEventTypeEnumMap = {
  SSEEventType.connection: 'connection',
  SSEEventType.thoughtLog: 'thought_log',
  SSEEventType.genUIComponent: 'gen_ui_component',
  SSEEventType.error: 'error',
  SSEEventType.streamEnd: 'stream_end',
  SSEEventType.heartbeat: 'heartbeat',
};
