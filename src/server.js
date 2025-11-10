const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const connectDatabase = require('./config/database');
const kafkaService = require('./services/kafkaService');
const clickhouseService = require('./services/clickhouseService');

// Importação das rotas
const cameraRoutes = require('./routes/cameraRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de rate limiting para proteger a API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP a cada 15 minutos
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos'
});

// Middlewares de segurança e configuração
app.use(helmet()); // Adiciona headers de segurança
app.use(cors()); // Habilita CORS
app.use(compression()); // Compressão gzip
app.use(limiter); // Rate limiting
app.use(express.json({ limit: '10mb' })); // Parser JSON com limite
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de log para requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Rotas da API
app.use('/api/cameras', cameraRoutes);
app.use('/api/events', eventRoutes);

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Middleware de tratamento de erros
app.use(errorHandler);

/**
 * Função para inicializar todos os serviços necessários
 */
async function initializeServices() {
  try {
    // Apenas inicializa o MongoDB para teste
    logger.info('Inicializando serviços...');
    
    // Comentado temporariamente para rodar sem serviços externos
    // await connectDatabase();
    // logger.info('Conexão com MongoDB estabelecida');

    // await clickhouseService.initialize();
    // logger.info('Conexão com ClickHouse estabelecida');

    // await kafkaService.startConsumer();
    // logger.info('Consumidor Kafka iniciado');

    logger.info('API iniciada em modo básico (sem serviços externos)');

  } catch (error) {
    logger.error('Erro ao inicializar serviços:', error);
    // Não sai da aplicação para permitir teste da API
    logger.warn('Continuando sem alguns serviços...');
  }
}

/**
 * Função para graceful shutdown
 */
async function gracefulShutdown() {
  logger.info('Iniciando graceful shutdown...');
  
  try {
    // Para o consumidor Kafka
    await kafkaService.stopConsumer();
    logger.info('Consumidor Kafka parado');

    // Fecha conexões do ClickHouse
    await clickhouseService.close();
    logger.info('Conexão ClickHouse fechada');

    process.exit(0);
  } catch (error) {
    logger.error('Erro durante graceful shutdown:', error);
    process.exit(1);
  }
}

// Tratamento de sinais para graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

/**
 * Inicia o servidor
 */
async function startServer() {
  try {
    // Inicializa todos os serviços
    await initializeServices();

    // Inicia o servidor HTTP
    app.listen(PORT, () => {
      logger.info(`Servidor rodando na porta ${PORT}`);
      logger.info(`Ambiente: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Inicia a aplicação
startServer();

module.exports = app;