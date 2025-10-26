require('dotenv').config();
const { Kafka, Partitioners } = require('kafkajs');

// Instancia o cliente Kafka com o clientId e lista de brokers configurados
const kafkaClient = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'camera-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') // Suporta múltiplos brokers separados por vírgula,
});

// Exporta o cliente Kafka para ser reutilizado em produtor e consumidor
module.exports = kafkaClient;