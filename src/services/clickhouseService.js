const { createClient } = require('@clickhouse/client');
const logger = require('../utils/logger');

/**
 * Serviço para integração com ClickHouse
 * Gerencia conexão e operações com o banco OLAP
 */
class ClickHouseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Inicializa a conexão com ClickHouse
   */
  async initialize() {
    try {
      const config = {
        host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
        database: process.env.CLICKHOUSE_DATABASE || 'surveillance',
        username: process.env.CLICKHOUSE_USERNAME || 'default',
        password: process.env.CLICKHOUSE_PASSWORD || '',
        // Configurações de conexão
        request_timeout: 30000,
        max_open_connections: 10,
        compression: {
          response: true,
          request: false
        }
      };

      this.client = createClient(config);
      
      // Testa a conexão
      await this.client.ping();
      this.isConnected = true;
      
      // Cria o banco de dados se não existir
      await this.createDatabase();
      
      // Cria as tabelas necessárias
      await this.createTables();
      
      logger.info('ClickHouse inicializado com sucesso');
      
    } catch (error) {
      logger.error('Erro ao inicializar ClickHouse:', error);
      throw error;
    }
  }

  /**
   * Cria o banco de dados se não existir
   */
  async createDatabase() {
    try {
      const database = process.env.CLICKHOUSE_DATABASE || 'surveillance';
      const query = `CREATE DATABASE IF NOT EXISTS ${database}`;
      await this.client.command({ query });
      logger.info(`Database ${database} criado/verificado`);
    } catch (error) {
      logger.error('Erro ao criar database:', error);
      throw error;
    }
  }

  /**
   * Cria as tabelas necessárias
   */
  async createTables() {
    try {
      // Tabela principal de eventos
      const createEventsTable = `
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
      `;

      await this.client.command({ query: createEventsTable });
      logger.info('Tabela events criada/verificada');

      // Tabela agregada por hora para consultas rápidas
      const createHourlyStatsTable = `
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
      `;

      await this.client.command({ query: createHourlyStatsTable });
      logger.info('Tabela events_hourly_stats criada/verificada');

      // Materialized View para popular automaticamente as estatísticas
      const createMaterializedView = `
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
      `;

      await this.client.command({ query: createMaterializedView });
      logger.info('Materialized View events_hourly_stats_mv criada/verificada');

    } catch (error) {
      logger.error('Erro ao criar tabelas:', error);
      throw error;
    }
  }

  /**
   * Insere um evento no ClickHouse
   */
  async insertEvent(eventData) {
    try {
      if (!this.isConnected) {
        throw new Error('ClickHouse não está conectado');
      }

      const values = [{
        event_id: eventData.eventId,
        camera_id: eventData.cameraId,
        timestamp: eventData.timestamp,
        event_type: eventData.tipoEvento || 'movimento',
        confidence: eventData.confianca || 0.5,
        coordinates_x: eventData.coordenadas?.x || 0,
        coordinates_y: eventData.coordenadas?.y || 0,
        coordinates_width: eventData.coordenadas?.largura || 0,
        coordinates_height: eventData.coordenadas?.altura || 0,
        image_path: eventData.imagemPath || '',
        image_size: eventData.metadados?.tamanhoImagem || 0,
        image_format: eventData.metadados?.formatoImagem || '',
        resolution_width: eventData.metadados?.resolucao?.largura || 0,
        resolution_height: eventData.metadados?.resolucao?.altura || 0,
        processed_at: eventData.metadados?.processadoEm || new Date()
      }];

      await this.client.insert({
        table: 'events',
        values,
        format: 'JSONEachRow'
      });

      logger.debug(`Evento ${eventData.eventId} inserido no ClickHouse`);
      return true;

    } catch (error) {
      logger.error('Erro ao inserir evento no ClickHouse:', error);
      throw error;
    }
  }

  /**
   * Busca eventos com filtros e paginação
   */
  async queryEvents(filters = {}, pagination = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('ClickHouse não está conectado');
      }

      const { cameraId, dataInicio, dataFim, tipoEvento } = filters;
      const { page = 1, limit = 50, orderBy = 'timestamp', order = 'DESC' } = pagination;

      let whereClause = '1=1';
      const params = {};

      if (cameraId) {
        whereClause += ' AND camera_id = {cameraId:String}';
        params.cameraId = cameraId;
      }

      if (dataInicio) {
        whereClause += ' AND timestamp >= {dataInicio:DateTime64}';
        params.dataInicio = dataInicio;
      }

      if (dataFim) {
        whereClause += ' AND timestamp <= {dataFim:DateTime64}';
        params.dataFim = dataFim;
      }

      if (tipoEvento) {
        whereClause += ' AND event_type = {tipoEvento:String}';
        params.tipoEvento = tipoEvento;
      }

      const offset = (page - 1) * limit;
      
      const query = `
        SELECT 
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
          processed_at
        FROM events 
        WHERE ${whereClause}
        ORDER BY ${orderBy} ${order}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const resultSet = await this.client.query({
        query,
        query_params: params,
        format: 'JSONEachRow'
      });

      const events = await resultSet.json();

      // Consulta para contar total de registros
      const countQuery = `
        SELECT count() as total 
        FROM events 
        WHERE ${whereClause}
      `;

      const countResult = await this.client.query({
        query: countQuery,
        query_params: params,
        format: 'JSONEachRow'
      });

      const countData = await countResult.json();
      const total = countData[0]?.total || 0;

      return {
        events,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };

    } catch (error) {
      logger.error('Erro ao consultar eventos no ClickHouse:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de eventos
   */
  async getEventStatistics(cameraId = null, dataInicio = null, dataFim = null) {
    try {
      if (!this.isConnected) {
        throw new Error('ClickHouse não está conectado');
      }

      let whereClause = '1=1';
      const params = {};

      if (cameraId) {
        whereClause += ' AND camera_id = {cameraId:String}';
        params.cameraId = cameraId;
      }

      if (dataInicio) {
        whereClause += ' AND timestamp >= {dataInicio:DateTime64}';
        params.dataInicio = dataInicio;
      }

      if (dataFim) {
        whereClause += ' AND timestamp <= {dataFim:DateTime64}';
        params.dataFim = dataFim;
      }

      const query = `
        SELECT 
          event_type,
          count() as total,
          avg(confidence) as avg_confidence,
          max(confidence) as max_confidence,
          min(confidence) as min_confidence,
          max(timestamp) as last_event
        FROM events 
        WHERE ${whereClause}
        GROUP BY event_type
        ORDER BY total DESC
      `;

      const resultSet = await this.client.query({
        query,
        query_params: params,
        format: 'JSONEachRow'
      });

      return await resultSet.json();

    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Fecha a conexão com ClickHouse
   */
  async close() {
    try {
      if (this.client) {
        await this.client.close();
        this.isConnected = false;
        logger.info('Conexão ClickHouse fechada');
      }
    } catch (error) {
      logger.error('Erro ao fechar conexão ClickHouse:', error);
    }
  }

  /**
   * Verifica se está conectado
   */
  isReady() {
    return this.isConnected;
  }
}

// Exporta uma instância singleton
module.exports = new ClickHouseService();