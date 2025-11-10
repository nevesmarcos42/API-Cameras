const mongoose = require('mongoose');

/**
 * Schema do modelo Camera
 * Define a estrutura dos dados das câmeras no MongoDB
 */
const cameraSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Nome da câmera é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode exceder 100 caracteres'],
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres']
  },
  cameraID: {
    type: String,
    required: [true, 'ID da câmera é obrigatório'],
    unique: true,
    trim: true,
    maxlength: [50, 'ID da câmera não pode exceder 50 caracteres'],
    match: [/^[a-zA-Z0-9_-]+$/, 'ID da câmera deve conter apenas letras, números, hífens e underscores']
  },
  zona: {
    type: String,
    required: [true, 'Zona é obrigatória'],
    trim: true,
    maxlength: [50, 'Zona não pode exceder 50 caracteres']
  },
  enderecoRTSP: {
    type: String,
    required: [true, 'Endereço RTSP é obrigatório'],
    validate: {
      validator: function(v) {
        // Validação básica de URL RTSP
        return /^rtsp:\/\/.+/.test(v);
      },
      message: 'Endereço RTSP deve começar com rtsp://'
    }
  },
  ativo: {
    type: Boolean,
    default: true
  },
  ultimaConexao: {
    type: Date,
    default: null
  },
  configuracoes: {
    qualidade: {
      type: String,
      enum: ['baixa', 'media', 'alta', 'ultra'],
      default: 'media'
    },
    fps: {
      type: Number,
      min: [1, 'FPS deve ser pelo menos 1'],
      max: [60, 'FPS não pode exceder 60'],
      default: 30
    },
    detectarMovimento: {
      type: Boolean,
      default: true
    },
    sensibilidade: {
      type: Number,
      min: [1, 'Sensibilidade deve ser entre 1 e 10'],
      max: [10, 'Sensibilidade deve ser entre 1 e 10'],
      default: 5
    }
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para melhorar performance das consultas
cameraSchema.index({ zona: 1 });
cameraSchema.index({ ativo: 1 });
cameraSchema.index({ createdAt: -1 });

/**
 * Virtual para status da câmera baseado na última conexão
 */
cameraSchema.virtual('status').get(function() {
  if (!this.ultimaConexao) return 'nunca_conectada';
  
  const agora = new Date();
  const diferencaMinutos = (agora - this.ultimaConexao) / (1000 * 60);
  
  if (diferencaMinutos <= 5) return 'online';
  if (diferencaMinutos <= 30) return 'instavel';
  return 'offline';
});

/**
 * Middleware pre-save para validações adicionais
 */
cameraSchema.pre('save', function(next) {
  // Converte cameraID para lowercase para evitar duplicatas por case
  if (this.cameraID) {
    this.cameraID = this.cameraID.toLowerCase();
  }
  next();
});

/**
 * Método para atualizar última conexão
 */
cameraSchema.methods.atualizarConexao = function() {
  this.ultimaConexao = new Date();
  return this.save();
};

/**
 * Método estático para buscar câmeras por zona
 */
cameraSchema.statics.buscarPorZona = function(zona, ativo = true) {
  return this.find({ zona, ativo }).sort({ nome: 1 });
};

/**
 * Método estático para buscar câmeras ativas
 */
cameraSchema.statics.buscarAtivas = function() {
  return this.find({ ativo: true }).sort({ nome: 1 });
};

const Camera = mongoose.model('Camera', cameraSchema);

module.exports = Camera;