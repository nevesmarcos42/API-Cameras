const Joi = require('joi');

/**
 * Validações para os endpoints da API usando Joi
 */

// Schema para validação de câmera
const cameraSchema = Joi.object({
  nome: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Nome é obrigatório',
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome não pode exceder 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
  
  cameraID: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .max(50)
    .required()
    .messages({
      'string.empty': 'ID da câmera é obrigatório',
      'string.pattern.base': 'ID da câmera deve conter apenas letras, números, hífens e underscores',
      'string.max': 'ID da câmera não pode exceder 50 caracteres',
      'any.required': 'ID da câmera é obrigatório'
    }),
  
  zona: Joi.string()
    .trim()
    .max(50)
    .required()
    .messages({
      'string.empty': 'Zona é obrigatória',
      'string.max': 'Zona não pode exceder 50 caracteres',
      'any.required': 'Zona é obrigatória'
    }),
  
  enderecoRTSP: Joi.string()
    .pattern(/^rtsp:\/\/.+/)
    .required()
    .messages({
      'string.empty': 'Endereço RTSP é obrigatório',
      'string.pattern.base': 'Endereço RTSP deve começar com rtsp://',
      'any.required': 'Endereço RTSP é obrigatório'
    }),
  
  ativo: Joi.boolean()
    .default(true),
  
  configuracoes: Joi.object({
    qualidade: Joi.string()
      .valid('baixa', 'media', 'alta', 'ultra')
      .default('media'),
    
    fps: Joi.number()
      .integer()
      .min(1)
      .max(60)
      .default(30)
      .messages({
        'number.min': 'FPS deve ser pelo menos 1',
        'number.max': 'FPS não pode exceder 60'
      }),
    
    detectarMovimento: Joi.boolean()
      .default(true),
    
    sensibilidade: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .default(5)
      .messages({
        'number.min': 'Sensibilidade deve ser entre 1 e 10',
        'number.max': 'Sensibilidade deve ser entre 1 e 10'
      })
  }).optional()
});

// Schema para atualização de câmera (todos os campos opcionais)
const cameraUpdateSchema = Joi.object({
  nome: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome não pode exceder 100 caracteres'
    }),
  
  cameraID: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .max(50)
    .messages({
      'string.pattern.base': 'ID da câmera deve conter apenas letras, números, hífens e underscores',
      'string.max': 'ID da câmera não pode exceder 50 caracteres'
    }),
  
  zona: Joi.string()
    .trim()
    .max(50)
    .messages({
      'string.max': 'Zona não pode exceder 50 caracteres'
    }),
  
  enderecoRTSP: Joi.string()
    .pattern(/^rtsp:\/\/.+/)
    .messages({
      'string.pattern.base': 'Endereço RTSP deve começar com rtsp://'
    }),
  
  ativo: Joi.boolean(),
  
  configuracoes: Joi.object({
    qualidade: Joi.string()
      .valid('baixa', 'media', 'alta', 'ultra'),
    
    fps: Joi.number()
      .integer()
      .min(1)
      .max(60)
      .messages({
        'number.min': 'FPS deve ser pelo menos 1',
        'number.max': 'FPS não pode exceder 60'
      }),
    
    detectarMovimento: Joi.boolean(),
    
    sensibilidade: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .messages({
        'number.min': 'Sensibilidade deve ser entre 1 e 10',
        'number.max': 'Sensibilidade deve ser entre 1 e 10'
      })
  }).optional()
}).min(1); // Pelo menos um campo deve ser fornecido

// Schema para parâmetros de consulta de eventos
const eventQuerySchema = Joi.object({
  cameraId: Joi.string()
    .trim()
    .optional(),
  
  dataInicio: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Data de início deve estar no formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)'
    }),
  
  dataFim: Joi.date()
    .iso()
    .min(Joi.ref('dataInicio'))
    .optional()
    .messages({
      'date.format': 'Data de fim deve estar no formato ISO (YYYY-MM-DDTHH:mm:ss.sssZ)',
      'date.min': 'Data de fim deve ser posterior à data de início'
    }),
  
  tipoEvento: Joi.string()
    .valid('movimento', 'objeto_detectado', 'pessoa_detectada', 'veiculo_detectado', 'alarme')
    .optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .optional()
    .messages({
      'number.max': 'Limite máximo é 100 itens por página'
    }),
  
  orderBy: Joi.string()
    .valid('timestamp', 'confianca', 'tipoEvento')
    .default('timestamp')
    .optional(),
  
  order: Joi.string()
    .valid('ASC', 'DESC', 'asc', 'desc')
    .default('DESC')
    .optional(),
  
  source: Joi.string()
    .valid('mongodb', 'clickhouse')
    .default('clickhouse')
    .optional()
});

// Schema para consulta de timeline
const timelineQuerySchema = Joi.object({
  cameraId: Joi.string()
    .trim()
    .optional(),
  
  dataInicio: Joi.date()
    .iso()
    .optional(),
  
  dataFim: Joi.date()
    .iso()
    .min(Joi.ref('dataInicio'))
    .optional(),
  
  intervalo: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('hour')
    .optional(),
  
  tipoEvento: Joi.string()
    .valid('movimento', 'objeto_detectado', 'pessoa_detectada', 'veiculo_detectado', 'alarme')
    .optional()
});

// Schema para parâmetros de limpeza de eventos
const cleanupQuerySchema = Joi.object({
  diasAntigos: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30)
    .optional()
    .messages({
      'number.min': 'Dias antigos deve ser pelo menos 1',
      'number.max': 'Dias antigos não pode exceder 365'
    }),
  
  dryRun: Joi.boolean()
    .default(false)
    .optional()
});

// Schema para URL assinada de imagem
const imageUrlQuerySchema = Joi.object({
  expiry: Joi.number()
    .integer()
    .min(60)
    .max(86400) // 24 horas
    .default(3600)
    .optional()
    .messages({
      'number.min': 'Expiração deve ser pelo menos 60 segundos',
      'number.max': 'Expiração não pode exceder 24 horas (86400 segundos)'
    })
});

// Schema para parâmetros de paginação geral
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional(),
  
  sort: Joi.string()
    .default('nome')
    .optional()
});

// Middleware de validação
function validateSchema(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Mostra todos os erros
      stripUnknown: true, // Remove campos não definidos no schema
      convert: true // Converte tipos automaticamente
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors
      });
    }

    // Substitui os dados originais pelos dados validados e sanitizados
    req[property] = value;
    next();
  };
}

module.exports = {
  // Schemas
  cameraSchema,
  cameraUpdateSchema,
  eventQuerySchema,
  timelineQuerySchema,
  cleanupQuerySchema,
  imageUrlQuerySchema,
  paginationSchema,
  
  // Middleware
  validateSchema,
  
  // Middlewares específicos prontos para uso
  validateCamera: validateSchema(cameraSchema),
  validateCameraUpdate: validateSchema(cameraUpdateSchema),
  validateEventQuery: validateSchema(eventQuerySchema, 'query'),
  validateTimelineQuery: validateSchema(timelineQuerySchema, 'query'),
  validateCleanupQuery: validateSchema(cleanupQuerySchema, 'query'),
  validateImageUrlQuery: validateSchema(imageUrlQuerySchema, 'query'),
  validatePagination: validateSchema(paginationSchema, 'query')
};