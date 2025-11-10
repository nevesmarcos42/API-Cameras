-- Script de inicialização para ClickHouse
-- Cria database e tabelas necessárias

CREATE DATABASE IF NOT EXISTS surveillance;

USE surveillance;

-- Tabela principal de eventos
CREATE TABLE IF NOT EXISTS events (
  event_id String,
  camera_id String,
  timestamp DateTime64(3),
  event_type Enum8('movimento'=1, 'objeto_detectado'=2, 'pessoa_detectada'=3, 'veiculo_detectado'=4, 'alarme'=5),
  confidence Float32,
  coordinates_x UInt32,
  coordinates_y UInt32,
  coordinates_width UInt32,
  coordinates_height UInt32,
  image_path String,
  image_size UInt64,
  image_format String,
  resolution_width UInt32,
  resolution_height UInt32,
  processed_at DateTime64(3),
  created_at DateTime64(3) DEFAULT now64()
) ENGINE = MergeTree()
ORDER BY (camera_id, timestamp)
PARTITION BY toYYYYMM(timestamp)
TTL timestamp + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- Tabela agregada por hora para consultas rápidas
CREATE TABLE IF NOT EXISTS events_hourly_stats (
  camera_id String,
  hour DateTime,
  event_type Enum8('movimento'=1, 'objeto_detectado'=2, 'pessoa_detectada'=3, 'veiculo_detectado'=4, 'alarme'=5),
  total_events UInt64,
  avg_confidence Float32,
  max_confidence Float32,
  min_confidence Float32
) ENGINE = SummingMergeTree()
ORDER BY (camera_id, hour, event_type)
PARTITION BY toYYYYMM(hour)
TTL hour + INTERVAL 2 YEAR;

-- Materialized View para popular automaticamente as estatísticas
CREATE MATERIALIZED VIEW IF NOT EXISTS events_hourly_stats_mv TO events_hourly_stats AS
SELECT 
  camera_id,
  toStartOfHour(timestamp) as hour,
  event_type,
  count() as total_events,
  avg(confidence) as avg_confidence,
  max(confidence) as max_confidence,
  min(confidence) as min_confidence
FROM events
GROUP BY camera_id, hour, event_type;

-- Insere dados de exemplo
INSERT INTO events (
  event_id,
  camera_id,
  timestamp,
  event_type,
  confidence,
  coordinates_x,
  coordinates_y,
  coordinates_width,
  coordinates_height,
  image_path,
  image_size,
  image_format,
  resolution_width,
  resolution_height,
  processed_at
) VALUES 
(
  'event-001',
  'camera-001',
  now() - INTERVAL 1 HOUR,
  'movimento',
  0.85,
  100,
  150,
  200,
  180,
  'camera-001/2023/10/01/event-001.jpg',
  256000,
  'image/jpeg',
  1920,
  1080,
  now() - INTERVAL 1 HOUR
),
(
  'event-002',
  'camera-002',
  now() - INTERVAL 2 HOUR,
  'pessoa_detectada',
  0.92,
  300,
  200,
  150,
  400,
  'camera-002/2023/10/01/event-002.jpg',
  312000,
  'image/jpeg',
  1920,
  1080,
  now() - INTERVAL 2 HOUR
),
(
  'event-003',
  'camera-001',
  now() - INTERVAL 30 MINUTE,
  'veiculo_detectado',
  0.78,
  50,
  300,
  600,
  300,
  'camera-001/2023/10/01/event-003.jpg',
  445000,
  'image/jpeg',
  1920,
  1080,
  now() - INTERVAL 30 MINUTE
);