require('dotenv').config();
const { Partitioners } = require('kafkajs');
const kafka = require('./kafkaClient');

// Cria um produtor Kafka reutilizando o cliente Kafka existente
const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

// Função para conectar o produtor Kafka
const connectProducer = async () => {
  try {
    await producer.connect();
    console.log('Kafka Producer connectado com sucesso');
  } catch (error) {
    console.error('Erro ao conectar o Kafka Producer:', error);
    throw error;
  }
}; 

// Função para enviar mensagens para um tópico Kafka
const sendMessage = async (topic, messages) => {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(messages) }],
  });
  console.log(`Mensagem enviada para o tópico ${topic}`);
};

// Exporta funcoes para conexao e envio de mensagens
module.exports = {
  connectProducer,
  sendMessage,
};