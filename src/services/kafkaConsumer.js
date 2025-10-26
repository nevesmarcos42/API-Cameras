require('dotenv').config();
const kafka = require('./kafkaClient');

// Cria um consumidor Kafka reutilizando o cliente Kafka existente
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'camera-group' });

// Função para conectar e iniciar o consumidor ecutando um topico e tratando mensagens recebidas
const connectConsumer = async (topic, messageHanlder) => {
  try {
    await consumer.connect(); // Conecta o kafka
    await consumer.subscribe({ topic, fromBeginning: true }); // Inscreve no tópico desde o início

    // Executra função para cada mensagem recebida, passando o objeto com os dados deserializados 
    await consumer.run({
        eachMessage: async ({ message }) => {
          try {
          const event = JSON.parse(message.value.toString());
          await messageHanlder(event); // Chama callback para tratar o evento
          } catch (error) {
            console.error('Erro ao processar mensagem do consumidor:', error);
          }
        },
    });
    console.log(`Consumidor conectado e escutando tópico ${topic}`);
  } catch (error) {
    console.error('Erro ao conectar o Kafka Consumer:', error);
    throw error;
  }
};

// Exporta função para conectar o consumidor
module.exports = {
  connectConsumer,
};