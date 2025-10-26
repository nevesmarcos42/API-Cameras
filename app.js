require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cameraRoutes = require('./src/routes/cameraRoutes');
const { connectProducer, sendMessage } = require('./src/services/kafkaProducer');
const { connectConsumer } = require('./src/services/kafkaConsumer');


const app = express();
const port = process.env.PORT || 3000;
const topic = process.env.KAFKA_TOPIC || 'device-events';

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

async function start() {
  try {
    await connectDB();

    await connectProducer();

    // Enviar evento para teste
    await sendMessage(topic, {
      deviceId: 'camera-001',
      eventType: 'motion-detected',
      timestamp: new Date().toISOString(),
    });

    await connectConsumer(topic, async (event) => {
      console.log('Evento recebido pelo consumidor:', event);
      // Aqui você pode adicionar lógica para processar o evento recebido
    });

    app.use('/api', cameraRoutes);

    app.listen(port, () => {
      console.log(`Servidor rodando na porta ${port}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

start();
