const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Conecta ao banco de dados MongoDB
 * Utiliza as configurações de ambiente para estabelecer a conexão
 */
async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/camera_surveillance';
    
    // Configurações de conexão do MongoDB
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Máximo de 10 conexões no pool
      serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos para seleção do servidor
      socketTimeoutMS: 45000 // Timeout de 45 segundos para operações
    };

    await mongoose.connect(mongoUri, options);

    // Event listeners para monitoramento da conexão
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB conectado com sucesso');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('Erro na conexão MongoDB:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB desconectado');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Conexão MongoDB fechada devido ao encerramento da aplicação');
    });

  } catch (error) {
    logger.error('Erro ao conectar no MongoDB:', error);
    throw error;
  }
}

module.exports = connectDatabase;