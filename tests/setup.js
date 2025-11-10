// Configuração inicial para testes
const mongoose = require('mongoose');

// Configuração global para testes
beforeAll(async () => {
  // Configuração do banco de dados de teste
  const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/camera_surveillance_test';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }
});

// Limpeza após todos os testes
afterAll(async () => {
  // Fecha conexão com banco de teste
  await mongoose.connection.close();
});

// Configuração de timeout padrão para testes
jest.setTimeout(30000);