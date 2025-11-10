// Script de inicialização para MongoDB
// Cria usuário e database inicial

db = db.getSiblingDB('camera_surveillance');

// Cria usuário para a aplicação
db.createUser({
  user: 'camera_app',
  pwd: 'camera_app_pass',
  roles: [
    { role: 'readWrite', db: 'camera_surveillance' }
  ]
});

// Cria índices para otimização
db.cameras.createIndex({ cameraID: 1 }, { unique: true });
db.cameras.createIndex({ zona: 1 });
db.cameras.createIndex({ ativo: 1 });

db.events.createIndex({ eventId: 1 }, { unique: true });
db.events.createIndex({ cameraId: 1, timestamp: -1 });
db.events.createIndex({ timestamp: -1 });
db.events.createIndex({ tipoEvento: 1, timestamp: -1 });

// Insere dados de exemplo
db.cameras.insertMany([
  {
    nome: 'Câmera Portão Principal',
    cameraID: 'camera-001',
    zona: 'entrada',
    enderecoRTSP: 'rtsp://192.168.1.100:554/stream1',
    ativo: true,
    configuracoes: {
      qualidade: 'alta',
      fps: 30,
      detectarMovimento: true,
      sensibilidade: 7
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    nome: 'Câmera Estacionamento',
    cameraID: 'camera-002',
    zona: 'estacionamento',
    enderecoRTSP: 'rtsp://192.168.1.101:554/stream1',
    ativo: true,
    configuracoes: {
      qualidade: 'media',
      fps: 25,
      detectarMovimento: true,
      sensibilidade: 5
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    nome: 'Câmera Recepção',
    cameraID: 'camera-003',
    zona: 'interno',
    enderecoRTSP: 'rtsp://192.168.1.102:554/stream1',
    ativo: true,
    configuracoes: {
      qualidade: 'alta',
      fps: 30,
      detectarMovimento: true,
      sensibilidade: 6
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('MongoDB inicializado com dados de exemplo');