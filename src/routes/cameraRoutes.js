const express = require('express');
const cameraController = require('../controllers/cameraController');
const {
  validateCamera,
  validateCameraUpdate,
  validatePagination
} = require('../utils/validators');

const router = express.Router();

/**
 * Rotas para gerenciamento de câmeras
 * Todas as rotas seguem padrões RESTful
 */

/**
 * @route   GET /api/cameras
 * @desc    Lista todas as câmeras com filtros opcionais
 * @access  Public
 * @params  ?zona=string&ativo=boolean&page=number&limit=number&sort=string
 */
router.get('/', validatePagination, cameraController.listarCameras);

/**
 * @route   GET /api/cameras/ativas
 * @desc    Lista apenas câmeras ativas
 * @access  Public
 */
router.get('/ativas', cameraController.listarCamerasAtivas);

/**
 * @route   GET /api/cameras/estatisticas
 * @desc    Obtém estatísticas gerais das câmeras
 * @access  Public
 */
router.get('/estatisticas', cameraController.obterEstatisticas);

/**
 * @route   GET /api/cameras/zona/:zona
 * @desc    Lista câmeras de uma zona específica
 * @access  Public
 * @params  ?ativo=boolean
 */
router.get('/zona/:zona', cameraController.listarCamerasPorZona);

/**
 * @route   GET /api/cameras/by-camera-id/:cameraId
 * @desc    Obtém uma câmera pelo cameraID
 * @access  Public
 */
router.get('/by-camera-id/:cameraId', cameraController.obterCameraPorCameraID);

/**
 * @route   GET /api/cameras/:id
 * @desc    Obtém uma câmera específica por ID do MongoDB
 * @access  Public
 */
router.get('/:id', cameraController.obterCamera);

/**
 * @route   POST /api/cameras
 * @desc    Cria uma nova câmera
 * @access  Public
 * @body    { nome, cameraID, zona, enderecoRTSP, ativo?, configuracoes? }
 */
router.post('/', validateCamera, cameraController.criarCamera);

/**
 * @route   PUT /api/cameras/:id
 * @desc    Atualiza uma câmera existente
 * @access  Public
 * @body    { nome?, cameraID?, zona?, enderecoRTSP?, ativo?, configuracoes? }
 */
router.put('/:id', validateCameraUpdate, cameraController.atualizarCamera);

/**
 * @route   PATCH /api/cameras/:id/conexao
 * @desc    Atualiza status de conexão de uma câmera
 * @access  Public
 */
router.patch('/:id/conexao', cameraController.atualizarConexao);

/**
 * @route   DELETE /api/cameras/:id
 * @desc    Remove uma câmera
 * @access  Public
 */
router.delete('/:id', cameraController.removerCamera);

module.exports = router;