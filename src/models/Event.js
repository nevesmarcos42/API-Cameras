const mongoose = require('mongoose');

/**
 * Schema do modelo Event
 * Define a estrutura dos eventos de movimento no MongoDB (para referências e cache)
 */
const eventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: [true, 'ID do evento é obrigatório'],
    unique: true,
    trim: true
  },
  cameraId: {
    type: String,
    required: [true, 'ID da câmera é obrigatório'],
    trim: true,
    ref: 'Camera'
  },
  timestamp: {
    type: Date,
    required: [true, 'Timestamp é obrigatório'],
    index: true
  },
  tipoEvento: {
    type: String,
    enum: ['movimento', 'objeto_detectado', 'pessoa_detectada', 'veiculo_detectado', 'alarme'],
    default: 'movimento',
    required: true
  },
  confianca: {
    type: Number,
    min: [0, 'Confiança deve ser entre 0 e 1'],
    max: [1, 'Confiança deve ser entre 0 e 1'],
    default: 0.5
  },
  coordenadas: {
    x: {
      type: Number,
      min: 0,
      default: 0
    },
    y: {
      type: Number,
      min: 0,
      default: 0
    },
    largura: {
      type: Number,
      min: 0,
      default: 0
    },
    altura: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  imagemPath: {
    type: String,
    required: false // Caminho da imagem no object storage
  },
  imagemUrl: {
    type: String,
    required: false // URL assinada temporária (cache)
  },
  metadados: {
    tamanhoImagem: Number,
    formatoImagem: String,
    resolucao: {
      largura: Number,
      altura: Number
    },
    processadoEm: Date
  },
  processado: {
    type: Boolean,
    default: false
  },
  armazenadoClickHouse: {
    type: Boolean,
    default: false
  },
  armazenadoObjectStorage: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compostos para melhorar performance das consultas
eventSchema.index({ cameraId: 1, timestamp: -1 });
eventSchema.index({ tipoEvento: 1, timestamp: -1 });
eventSchema.index({ timestamp: -1 });
eventSchema.index({ processado: 1 });
eventSchema.index({ armazenadoClickHouse: 1 });
eventSchema.index({ armazenadoObjectStorage: 1 });

// Índice TTL para limpeza automática de eventos antigos (opcional)
// Remove eventos após 90 dias (pode ser configurado conforme necessidade)
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 dias

/**
 * Virtual para status de processamento completo
 */
eventSchema.virtual('statusProcessamento').get(function() {
  if (!this.processado) return 'pendente';
  if (!this.armazenadoClickHouse || !this.armazenadoObjectStorage) return 'parcial';
  return 'completo';
});

/**
 * Middleware pre-save para validações
 */
eventSchema.pre('save', function(next) {
  // Se o evento foi processado, marca a data de processamento
  if (this.processado && !this.metadados.processadoEm) {
    if (!this.metadados) this.metadados = {};
    this.metadados.processadoEm = new Date();
  }
  next();
});

/**
 * Método para marcar como processado
 */
eventSchema.methods.marcarProcessado = function(clickhouse = false, objectStorage = false) {
  this.processado = true;
  this.armazenadoClickHouse = clickhouse;
  this.armazenadoObjectStorage = objectStorage;
  if (!this.metadados) this.metadados = {};
  this.metadados.processadoEm = new Date();
  return this.save();
};

/**
 * Método estático para buscar eventos por câmera em período
 */
eventSchema.statics.buscarPorCameraEPeriodo = function(cameraId, dataInicio, dataFim) {
  const filtro = { cameraId };
  
  if (dataInicio || dataFim) {
    filtro.timestamp = {};
    if (dataInicio) filtro.timestamp.$gte = new Date(dataInicio);
    if (dataFim) filtro.timestamp.$lte = new Date(dataFim);
  }
  
  return this.find(filtro).sort({ timestamp: -1 });
};

/**
 * Método estático para buscar eventos não processados
 */
eventSchema.statics.buscarNaoProcessados = function(limite = 100) {
  return this.find({ processado: false })
    .sort({ timestamp: 1 })
    .limit(limite);
};

/**
 * Método estático para estatísticas de eventos
 */
eventSchema.statics.obterEstatisticas = function(cameraId, dataInicio, dataFim) {
  const match = {};
  
  if (cameraId) match.cameraId = cameraId;
  
  if (dataInicio || dataFim) {
    match.timestamp = {};
    if (dataInicio) match.timestamp.$gte = new Date(dataInicio);
    if (dataFim) match.timestamp.$lte = new Date(dataFim);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$tipoEvento',
        total: { $sum: 1 },
        confiancaMedia: { $avg: '$confianca' },
        ultimoEvento: { $max: '$timestamp' }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;