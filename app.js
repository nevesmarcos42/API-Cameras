require('dotenv').config;
const express = require('express');
const connectDB = require('./config/db');
const cameraRoutes = require('./src/routes/cameraRoutes');

const app = express();
const port = 3000;

// Middleware para JSON
app.use(express.json());

// Rota de saude do serviço
app.get('/api/helath', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Conexão com o MongoDB
connectDB();

// Rotas da câmera
app.use('/api', cameraRoutes);

//Inicia o do servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});