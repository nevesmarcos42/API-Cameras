const express = require('express');
const eventController = require('../controllers/eventController');
const {
  validateEventQuery,
  validateTimelineQuery,
  validateCleanupQuery,
  validateImageUrlQuery
} = require('../utils/validators');

const router = express.Router();

/**
 * Rotas para consulta e gerenciamento de eventos
 * Todas as rotas seguem padrões RESTful
 */

/**
 * @route   GET /api/events
 * @desc    Lista eventos com filtros e paginação
 * @access  Public
 * @params  ?cameraId=string&dataInicio=date&dataFim=date&tipoEvento=string&page=number&limit=number&orderBy=string&order=string&source=string
 */
router.get('/', validateEventQuery, eventController.listarEventos);

/**
 * @route   GET /api/events/recentes
 * @desc    Obtém eventos mais recentes para dashboard
 * @access  Public
 * @params  ?limite=number&cameraId=string
 */
router.get('/recentes', eventController.obterEventosRecentes);

/**
 * @route   GET /api/events/estatisticas
 * @desc    Obtém estatísticas de eventos
 * @access  Public
 * @params  ?cameraId=string&dataInicio=date&dataFim=date&source=string
 */
router.get('/estatisticas', eventController.obterEstatisticas);

/**
 * @route   GET /api/events/timeline
 * @desc    Obtém eventos agrupados por período para visualização de timeline
 * @access  Public
 * @params  ?cameraId=string&dataInicio=date&dataFim=date&intervalo=string&tipoEvento=string
 */
router.get('/timeline', validateTimelineQuery, eventController.obterTimeline);

/**
 * @route   DELETE /api/events/cleanup
 * @desc    Remove eventos antigos (operação de limpeza)
 * @access  Public
 * @params  ?diasAntigos=number&dryRun=boolean
 */
router.delete('/cleanup', validateCleanupQuery, eventController.limparEventosAntigos);

/**
 * @route   GET /api/events/:eventId
 * @desc    Obtém um evento específico por ID
 * @access  Public
 */
router.get('/:eventId', eventController.obterEvento);

/**
 * @route   GET /api/events/:eventId/image-url
 * @desc    Gera URL assinada para visualização da imagem de um evento
 * @access  Public
 * @params  ?expiry=number (segundos, padrão 3600)
 */
router.get('/:eventId/image-url', validateImageUrlQuery, eventController.obterUrlImagem);

module.exports = router;