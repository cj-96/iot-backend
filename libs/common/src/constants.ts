export const KAFKA_TOPICS = {
  RAW: 'telemetry.raw',
  DLQ: 'telemetry.dlq',
} as const;

export const MQTT_TOPICS = {
  TELEMETRY: 'devices/+/telemetry',
} as const;
