const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const Event = require('../models/Event');
const clickhouseService = require('./clickhouseService');
const minioService = require('./minioService');

/**
 * Serviço para integração com Apache Kafka
 * Consome eventos de movimento e processa as mensagens
 */
class KafkaService {
  constructor() {
    this.kafka = null;
    this.consumer = null;
    this.producer = null;
    this.isRunning = false;
  }

  /**
   * Inicializa o cliente Kafka
   */
  async initialize() {
    try {
      const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
      const clientId = process.env.KAFKA_CLIENT_ID || 'camera-api';

      this.kafka = new Kafka({
        clientId,
        brokers,
        // Configurações de retry e timeout
        retry: {
          initialRetryTime: 300,
          retries: 8
        },
        connectionTimeout: 3000,
        requestTimeout: 30000
      });

      // Inicializa consumer
      this.consumer = this.kafka.consumer({
        groupId: process.env.KAFKA_GROUP_ID || 'camera-events-consumer',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        // Configurações para melhor performance
        maxBytesPerPartition: 1048576, // 1MB
        minBytes: 1,
        maxBytes: 10485760, // 10MB
        maxWaitTimeInMs: 5000
      });

      // Inicializa producer (para possíveis retries ou dead letter queue)
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000
      });

      logger.info('Kafka inicializado com sucesso');

    } catch (error) {
      logger.error('Erro ao inicializar Kafka:', error);
      throw error;
    }
  }

  /**
   * Inicia o consumidor Kafka
   */
  async startConsumer() {
    try {
      if (!this.kafka) {
        await this.initialize();
      }

      const topic = process.env.KAFKA_TOPIC || 'device-events';

      // Conecta o consumer
      await this.consumer.connect();
      
      // Subscreve no tópico
      await this.consumer.subscribe({
        topic,
        fromBeginning: false // Consome apenas mensagens novas
      });

      // Inicia o processamento das mensagens
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.processMessage(topic, partition, message);
        },
        // Configurações de paralelismo
        partitionsConsumedConcurrently: 1,
        eachBatchAutoResolve: true
      });

      this.isRunning = true;
      logger.info(`Consumidor Kafka iniciado para o tópico: ${topic}`);

    } catch (error) {
      logger.error('Erro ao iniciar consumidor Kafka:', error);
      throw error;
    }
  }

  /**
   * Processa uma mensagem individual do Kafka
   */
  async processMessage(topic, partition, message) {
    const startTime = Date.now();
    let eventData = null;

    try {
      // Parse da mensagem JSON
      const messageValue = message.value.toString();
      eventData = JSON.parse(messageValue);

      logger.debug(`Processando mensagem: ${messageValue}`);

      // Validação básica da estrutura da mensagem
      if (!eventData.cameraId || !eventData.timestamp) {
        throw new Error('Mensagem inválida: cameraId e timestamp são obrigatórios');
      }

      // Gera ID único para o evento se não fornecido
      if (!eventData.eventId) {
        eventData.eventId = uuidv4();
      }

      // Normaliza timestamp
      eventData.timestamp = new Date(eventData.timestamp);

      // Processa a imagem se fornecida
      await this.processEventImage(eventData);

      // Salva no MongoDB para referência rápida
      await this.saveEventToMongoDB(eventData);

      // Salva no ClickHouse para análise OLAP
      await this.saveEventToClickHouse(eventData);

      const processingTime = Date.now() - startTime;
      logger.info(`Evento ${eventData.eventId} processado em ${processingTime}ms`);

    } catch (error) {
      logger.error('Erro ao processar mensagem Kafka:', {
        error: error.message,
        topic,
        partition,
        offset: message.offset,
        eventId: eventData?.eventId
      });

      // Aqui poderia enviar para dead letter queue
      await this.handleProcessingError(message, error);
    }
  }

  /**
   * Processa imagem do evento (se fornecida)
   */
  async processEventImage(eventData) {
    try {
      // Se a mensagem contém dados da imagem em base64
      if (eventData.imageData) {
        const imageBuffer = Buffer.from(eventData.imageData, 'base64');
        const mimeType = eventData.imageMimeType || 'image/jpeg';

        // Upload para MinIO
        const uploadResult = await minioService.uploadImage(
          imageBuffer,
          eventData.eventId,
          eventData.cameraId,
          mimeType
        );

        // Atualiza dados do evento com informações da imagem
        eventData.imagemPath = uploadResult.fileName;
        eventData.metadados = {
          ...eventData.metadados,
          tamanhoImagem: uploadResult.size,
          formatoImagem: mimeType,
          processadoEm: new Date()
        };

        // Remove dados da imagem da memória
        delete eventData.imageData;
        delete eventData.imageMimeType;

        logger.debug(`Imagem do evento ${eventData.eventId} salva em: ${uploadResult.fileName}`);
      }

      // Se a mensagem contém URL da imagem
      if (eventData.imageUrl && !eventData.imageData) {
        // Aqui poderia fazer download da imagem da URL e processar
        eventData.imagemPath = eventData.imageUrl;
        delete eventData.imageUrl;
      }

    } catch (error) {
      logger.error(`Erro ao processar imagem do evento ${eventData.eventId}:`, error);
      // Continua o processamento mesmo se a imagem falhar
    }
  }

  /**
   * Salva evento no MongoDB
   */
  async saveEventToMongoDB(eventData) {
    try {
      const event = new Event({
        eventId: eventData.eventId,
        cameraId: eventData.cameraId,
        timestamp: eventData.timestamp,
        tipoEvento: eventData.tipoEvento || eventData.eventType || 'movimento',
        confianca: eventData.confianca || eventData.confidence || 0.5,
        coordenadas: eventData.coordenadas || eventData.coordinates || {},
        imagemPath: eventData.imagemPath,
        metadados: eventData.metadados || {},
        processado: true,
        armazenadoObjectStorage: !!eventData.imagemPath
      });

      await event.save();
      logger.debug(`Evento ${eventData.eventId} salvo no MongoDB`);

    } catch (error) {
      logger.error(`Erro ao salvar evento ${eventData.eventId} no MongoDB:`, error);
      throw error;
    }
  }

  /**
   * Salva evento no ClickHouse
   */
  async saveEventToClickHouse(eventData) {
    try {
      await clickhouseService.insertEvent(eventData);
      
      // Atualiza status no MongoDB
      await Event.updateOne(
        { eventId: eventData.eventId },
        { armazenadoClickHouse: true }
      );

      logger.debug(`Evento ${eventData.eventId} salvo no ClickHouse`);

    } catch (error) {
      logger.error(`Erro ao salvar evento ${eventData.eventId} no ClickHouse:`, error);
      throw error;
    }
  }

  /**
   * Trata erros de processamento
   */
  async handleProcessingError(message, error) {
    try {
      // Log detalhado do erro
      logger.error('Detalhes do erro de processamento:', {
        error: error.message,
        stack: error.stack,
        messageKey: message.key?.toString(),
        messageValue: message.value?.toString(),
        offset: message.offset,
        timestamp: message.timestamp
      });

      // Aqui poderia implementar:
      // 1. Dead Letter Queue
      // 2. Retry com backoff
      // 3. Alertas
      // 4. Métricas de erro

    } catch (logError) {
      logger.error('Erro ao tratar erro de processamento:', logError);
    }
  }

  /**
   * Para o consumidor Kafka
   */
  async stopConsumer() {
    try {
      if (this.consumer && this.isRunning) {
        await this.consumer.stop();
        await this.consumer.disconnect();
        this.isRunning = false;
        logger.info('Consumidor Kafka parado');
      }

      if (this.producer) {
        await this.producer.disconnect();
        logger.info('Producer Kafka desconectado');
      }

    } catch (error) {
      logger.error('Erro ao parar consumidor Kafka:', error);
    }
  }

  /**
   * Verifica se o serviço está rodando
   */
  isServiceRunning() {
    return this.isRunning;
  }

  /**
   * Envia mensagem para um tópico (para possíveis retries ou notificações)
   */
  async sendMessage(topic, message, key = null) {
    try {
      if (!this.producer) {
        await this.initialize();
        await this.producer.connect();
      }

      const result = await this.producer.send({
        topic,
        messages: [
          {
            key: key ? Buffer.from(key) : null,
            value: Buffer.from(JSON.stringify(message)),
            timestamp: Date.now().toString()
          }
        ]
      });

      logger.debug(`Mensagem enviada para ${topic}:`, result);
      return result;

    } catch (error) {
      logger.error(`Erro ao enviar mensagem para ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Obtém métricas do consumidor
   */
  async getConsumerMetrics() {
    try {
      if (!this.consumer) {
        return null;
      }

      // Aqui poderia implementar coleta de métricas mais detalhadas
      return {
        isRunning: this.isRunning,
        groupId: process.env.KAFKA_GROUP_ID || 'camera-events-consumer',
        topic: process.env.KAFKA_TOPIC || 'device-events'
      };

    } catch (error) {
      logger.error('Erro ao obter métricas do consumidor:', error);
      return null;
    }
  }
}

// Exporta uma instância singleton
module.exports = new KafkaService();