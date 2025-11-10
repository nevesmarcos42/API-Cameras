const logger = require('../utils/logger');

/**
 * Middleware de tratamento de erros centralizado
 * Captura e formata todos os erros da aplicação
 */
function errorHandler(err, req, res, next) {
  logger.error(`Erro capturado: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      errors
    });
  }

  // Erro de cast do Mongoose (ID inválido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID inválido fornecido'
    });
  }

  // Erro de duplicação (chave única)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} já existe no sistema`
    });
  }

  // Erro de validação do Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: err.details.map(detail => detail.message)
    });
  }

  // Erro de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido na requisição'
    });
  }

  // Erro personalizado com status
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Erro interno do servidor (não revelamos detalhes em produção)
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;

  return res.status(500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;