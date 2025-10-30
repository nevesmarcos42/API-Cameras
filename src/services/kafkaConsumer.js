require('dotenv').config();
const kafka = require('./kafkaClient');
const clickhouse = require('./clickhouseClient');
const { json } = require('express');

// Cria um consumidor Kafka reutilizando o cliente Kafka existente
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'camera-group' });


// Função para inserir evento no ClickHouse
async function insertEventToClickhouse(event) {

  // Formata o timestamp para o formato aceito pelo ClickHouse
  const formatTimestamp = new Date(event.timestamp)
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19); // 'YYYY-MM-DD HH:MM:SS' elimina os milissegundos
    
    const row = {
      deviceId: event.deviceId,
      eventType: event.eventType,
      timestamp: formatTimestamp,
    };

  try {
    // Serializa explicitamente para JSONEachRow string (cada linha um json e quebra de linha no final)
   // const jsonEachRowStringify = JSON.stringify(row);

    await clickhouse.insert({
      table: 'default.device_events',
      values: [row],
      format: 'JSONEachRow',
    });
    console.log('Evento inserido no ClickHouse:', row);
  } catch (error) {
    console.error('Erro ao inserir evento no ClickHouse:', error);
  }
}

// Função para conectar e iniciar o consumidor e processar mensagens recebidas
const connectConsumer = async (topic) => {
  try {
    await consumer.connect(); // Conecta o kafka
    await consumer.subscribe({ topic, fromBeginning: true }); // Inscreve no tópico desde o início

    // Executa função para cada mensagem recebida, passando o objeto com os dados desserializados 
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await insertEventToClickhouse(event); // Persiste no ClickHouse
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
