const Event = require('../models/Event');
const clickhouseService = require('../services/clickhouseService');
const minioService = require('../services/minioService');
const logger = require('../utils/logger');

/**
 * Controlador para gerenciar consultas e operações de eventos
 */
class EventController {

  /**
   * Lista eventos com filtros e paginação
   * GET /api/events
   */
  async listarEventos(req, res, next) {
    try {
      const {
        cameraId,
        dataInicio,
        dataFim,
        tipoEvento,
        page = 1,
        limit = 50,
        orderBy = 'timestamp',
        order = 'DESC',
        source = 'clickhouse' // 'clickhouse' ou 'mongodb'
      } = req.query;

      // Valida parâmetros de data
      if (dataInicio && isNaN(Date.parse(dataInicio))) {
        return res.status(400).json({
          success: false,
          message: 'Data de início inválida'
        });
      }

      if (dataFim && isNaN(Date.parse(dataFim))) {
        return res.status(400).json({
          success: false,
          message: 'Data de fim inválida'
        });
      }

      let resultado;

      // Decide qual fonte de dados usar
      if (source === 'clickhouse' && clickhouseService.isReady()) {
        resultado = await this.buscarEventosClickHouse({
          cameraId,
          dataInicio,
          dataFim,
          tipoEvento
        }, {
          page: parseInt(page),
          limit: parseInt(limit),
          orderBy,
          order
        });
      } else {
        resultado = await this.buscarEventosMongoDB({
          cameraId,
          dataInicio,
          dataFim,
          tipoEvento
        }, {
          page: parseInt(page),
          limit: parseInt(limit),
          orderBy,
          order
        });
      }

      res.status(200).json({
        success: true,
        data: resultado,
        source: source === 'clickhouse' && clickhouseService.isReady() ? 'clickhouse' : 'mongodb'
      });

    } catch (error) {
      logger.error('Erro ao listar eventos:', error);
      next(error);
    }
  }

  /**
   * Busca eventos no ClickHouse
   */
  async buscarEventosClickHouse(filtros, paginacao) {
    const resultado = await clickhouseService.queryEvents(filtros, paginacao);
    
    // Converte campos do ClickHouse para formato da API
    const eventosFormatados = resultado.events.map(event => ({
      eventId: event.event_id,
      cameraId: event.camera_id,
      timestamp: event.timestamp,
      tipoEvento: event.event_type,
      confianca: event.confidence,
      coordenadas: {
        x: event.coordinates_x,
        y: event.coordinates_y,
        largura: event.coordinates_width,
        altura: event.coordinates_height
      },
      imagemPath: event.image_path,
      tamanhoImagem: event.image_size,
      processadoEm: event.processed_at
    }));

    return {
      eventos: eventosFormatados,
      pagination: resultado.pagination
    };
  }

  /**
   * Busca eventos no MongoDB
   */
  async buscarEventosMongoDB(filtros, paginacao) {
    const { cameraId, dataInicio, dataFim, tipoEvento } = filtros;
    const { page, limit, orderBy, order } = paginacao;

    // Monta filtros do MongoDB
    const filtrosMongo = {};
    if (cameraId) filtrosMongo.cameraId = cameraId;
    if (tipoEvento) filtrosMongo.tipoEvento = tipoEvento;
    
    if (dataInicio || dataFim) {
      filtrosMongo.timestamp = {};
      if (dataInicio) filtrosMongo.timestamp.$gte = new Date(dataInicio);
      if (dataFim) filtrosMongo.timestamp.$lte = new Date(dataFim);
    }

    // Configurações de ordenação
    const sortOptions = {};
    sortOptions[orderBy] = order.toLowerCase() === 'desc' ? -1 : 1;

    // Executa consulta
    const skip = (page - 1) * limit;
    const eventos = await Event.find(filtrosMongo)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Event.countDocuments(filtrosMongo);

    return {
      eventos,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  }

  /**
   * Obtém um evento específico por ID
   * GET /api/events/:eventId
   */
  async obterEvento(req, res, next) {
    try {
      const { eventId } = req.params;
      
      // Primeiro tenta buscar no MongoDB
      let evento = await Event.findOne({ eventId }).lean();
      
      if (!evento) {
        return res.status(404).json({
          success: false,
          message: 'Evento não encontrado'
        });
      }

      // Se o evento tem imagem, gera URL assinada
      if (evento.imagemPath && minioService.isReady()) {
        try {
          evento.imagemUrl = await minioService.getSignedUrl(evento.imagemPath);
        } catch (error) {
          logger.warn(`Erro ao gerar URL assinada para evento ${eventId}:`, error);
        }
      }

      res.status(200).json({
        success: true,
        data: evento
      });

    } catch (error) {
      logger.error('Erro ao obter evento:', error);
      next(error);
    }
  }

  /**
   * Gera URL assinada para imagem de um evento
   * GET /api/events/:eventId/image-url
   */
  async obterUrlImagem(req, res, next) {
    try {
      const { eventId } = req.params;
      const { expiry = 3600 } = req.query; // Expiração em segundos, padrão 1 hora

      // Busca o evento para obter o path da imagem
      const evento = await Event.findOne({ eventId }).lean();
      
      if (!evento) {
        return res.status(404).json({
          success: false,
          message: 'Evento não encontrado'
        });
      }

      if (!evento.imagemPath) {
        return res.status(404).json({
          success: false,
          message: 'Evento não possui imagem associada'
        });
      }

      if (!minioService.isReady()) {
        return res.status(503).json({
          success: false,
          message: 'Serviço de storage não disponível'
        });
      }

      // Gera URL assinada
      const urlAssinada = await minioService.getSignedUrl(
        evento.imagemPath, 
        parseInt(expiry)
      );

      res.status(200).json({
        success: true,
        data: {
          eventId,
          imageUrl: urlAssinada,
          expiresIn: parseInt(expiry),
          expiresAt: new Date(Date.now() + parseInt(expiry) * 1000)
        }
      });

    } catch (error) {
      logger.error('Erro ao gerar URL da imagem:', error);
      next(error);
    }
  }

  /**
   * Obtém estatísticas de eventos
   * GET /api/events/estatisticas
   */
  async obterEstatisticas(req, res, next) {
    try {
      const { cameraId, dataInicio, dataFim, source = 'clickhouse' } = req.query;

      let estatisticas;

      // Usa ClickHouse se disponível e solicitado
      if (source === 'clickhouse' && clickhouseService.isReady()) {
        estatisticas = await clickhouseService.getEventStatistics(
          cameraId,
          dataInicio,
          dataFim
        );
      } else {
        estatisticas = await this.obterEstatisticasMongoDB(
          cameraId,
          dataInicio,
          dataFim
        );
      }

      res.status(200).json({
        success: true,
        data: estatisticas,
        source: source === 'clickhouse' && clickhouseService.isReady() ? 'clickhouse' : 'mongodb'
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas de eventos:', error);
      next(error);
    }
  }

  /**
   * Obtém estatísticas do MongoDB
   */
  async obterEstatisticasMongoDB(cameraId, dataInicio, dataFim) {
    const filtros = {};
    
    if (cameraId) filtros.cameraId = cameraId;
    
    if (dataInicio || dataFim) {
      filtros.timestamp = {};
      if (dataInicio) filtros.timestamp.$gte = new Date(dataInicio);
      if (dataFim) filtros.timestamp.$lte = new Date(dataFim);
    }

    return await Event.aggregate([
      { $match: filtros },
      {
        $group: {
          _id: '$tipoEvento',
          total: { $sum: 1 },
          avg_confidence: { $avg: '$confianca' },
          max_confidence: { $max: '$confianca' },
          min_confidence: { $min: '$confianca' },
          last_event: { $max: '$timestamp' }
        }
      },
      { $sort: { total: -1 } }
    ]);
  }

  /**
   * Obtém eventos agrupados por período
   * GET /api/events/timeline
   */
  async obterTimeline(req, res, next) {
    try {
      const {
        cameraId,
        dataInicio,
        dataFim,
        intervalo = 'hour', // 'hour', 'day', 'week', 'month'
        tipoEvento
      } = req.query;

      // Valida intervalo
      const intervalosValidos = ['hour', 'day', 'week', 'month'];
      if (!intervalosValidos.includes(intervalo)) {
        return res.status(400).json({
          success: false,
          message: 'Intervalo inválido. Use: hour, day, week, month'
        });
      }

      // Monta filtros
      const filtros = {};
      if (cameraId) filtros.cameraId = cameraId;
      if (tipoEvento) filtros.tipoEvento = tipoEvento;
      
      if (dataInicio || dataFim) {
        filtros.timestamp = {};
        if (dataInicio) filtros.timestamp.$gte = new Date(dataInicio);
        if (dataFim) filtros.timestamp.$lte = new Date(dataFim);
      }

      // Define formato de agrupamento por data
      const formatosData = {
        hour: {
          $dateToString: {
            format: '%Y-%m-%d %H:00:00',
            date: '$timestamp'
          }
        },
        day: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$timestamp'
          }
        },
        week: {
          $dateToString: {
            format: '%Y-%U',
            date: '$timestamp'
          }
        },
        month: {
          $dateToString: {
            format: '%Y-%m',
            date: '$timestamp'
          }
        }
      };

      const timeline = await Event.aggregate([
        { $match: filtros },
        {
          $group: {
            _id: {
              periodo: formatosData[intervalo],
              tipoEvento: '$tipoEvento'
            },
            total: { $sum: 1 },
            confiancaMedia: { $avg: '$confianca' }
          }
        },
        {
          $group: {
            _id: '$_id.periodo',
            eventos: {
              $push: {
                tipoEvento: '$_id.tipoEvento',
                total: '$total',
                confiancaMedia: '$confiancaMedia'
              }
            },
            totalPeriodo: { $sum: '$total' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.status(200).json({
        success: true,
        data: {
          timeline,
          intervalo,
          periodo: {
            inicio: dataInicio,
            fim: dataFim
          }
        }
      });

    } catch (error) {
      logger.error('Erro ao obter timeline de eventos:', error);
      next(error);
    }
  }

  /**
   * Remove eventos antigos (cleanup)
   * DELETE /api/events/cleanup
   */
  async limparEventosAntigos(req, res, next) {
    try {
      const { diasAntigos = 30, dryRun = false } = req.query;
      
      const dataCorte = new Date();
      dataCorte.setDate(dataCorte.getDate() - parseInt(diasAntigos));

      if (dryRun === 'true') {
        // Apenas conta quantos eventos seriam removidos
        const total = await Event.countDocuments({
          timestamp: { $lt: dataCorte }
        });

        return res.status(200).json({
          success: true,
          message: 'Simulação de limpeza',
          data: {
            eventosParaRemover: total,
            dataCorte
          }
        });
      }

      // Remove eventos antigos
      const resultado = await Event.deleteMany({
        timestamp: { $lt: dataCorte }
      });

      logger.info(`${resultado.deletedCount} eventos antigos removidos`);

      res.status(200).json({
        success: true,
        message: 'Limpeza realizada com sucesso',
        data: {
          eventosRemovidos: resultado.deletedCount,
          dataCorte
        }
      });

    } catch (error) {
      logger.error('Erro ao limpar eventos antigos:', error);
      next(error);
    }
  }

  /**
   * Obtém eventos recentes para dashboard
   * GET /api/events/recentes
   */
  async obterEventosRecentes(req, res, next) {
    try {
      const { limite = 10, cameraId } = req.query;
      
      const filtros = {};
      if (cameraId) filtros.cameraId = cameraId;

      const eventos = await Event.find(filtros)
        .sort({ timestamp: -1 })
        .limit(parseInt(limite))
        .lean();

      res.status(200).json({
        success: true,
        data: eventos
      });

    } catch (error) {
      logger.error('Erro ao obter eventos recentes:', error);
      next(error);
    }
  }
}

module.exports = new EventController();