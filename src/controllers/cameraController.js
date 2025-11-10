const Camera = require('../models/Camera');
const logger = require('../utils/logger');

/**
 * Controlador para gerenciar operações CRUD de câmeras
 */
class CameraController {

  /**
   * Lista todas as câmeras com filtros opcionais
   * GET /api/cameras
   */
  async listarCameras(req, res, next) {
    try {
      const { zona, ativo, page = 1, limit = 10, sort = 'nome' } = req.query;
      
      // Monta filtros de busca
      const filtros = {};
      if (zona) filtros.zona = zona;
      if (ativo !== undefined) filtros.ativo = ativo === 'true';

      // Configurações de paginação
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = {};
      sortOptions[sort] = 1;

      // Executa consulta com paginação
      const cameras = await Camera.find(filtros)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Conta total de documentos
      const total = await Camera.countDocuments(filtros);

      res.status(200).json({
        success: true,
        data: {
          cameras,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Erro ao listar câmeras:', error);
      next(error);
    }
  }

  /**
   * Obtém uma câmera específica por ID
   * GET /api/cameras/:id
   */
  async obterCamera(req, res, next) {
    try {
      const { id } = req.params;
      
      const camera = await Camera.findById(id);
      
      if (!camera) {
        return res.status(404).json({
          success: false,
          message: 'Câmera não encontrada'
        });
      }

      res.status(200).json({
        success: true,
        data: camera
      });

    } catch (error) {
      logger.error('Erro ao obter câmera:', error);
      next(error);
    }
  }

  /**
   * Obtém uma câmera por cameraID
   * GET /api/cameras/by-camera-id/:cameraId
   */
  async obterCameraPorCameraID(req, res, next) {
    try {
      const { cameraId } = req.params;
      
      const camera = await Camera.findOne({ cameraID: cameraId.toLowerCase() });
      
      if (!camera) {
        return res.status(404).json({
          success: false,
          message: 'Câmera não encontrada'
        });
      }

      res.status(200).json({
        success: true,
        data: camera
      });

    } catch (error) {
      logger.error('Erro ao obter câmera por cameraID:', error);
      next(error);
    }
  }

  /**
   * Cria uma nova câmera
   * POST /api/cameras
   */
  async criarCamera(req, res, next) {
    try {
      const dadosCamera = req.body;
      
      // Verifica se já existe uma câmera com o mesmo cameraID
      const cameraExistente = await Camera.findOne({ 
        cameraID: dadosCamera.cameraID.toLowerCase() 
      });
      
      if (cameraExistente) {
        return res.status(409).json({
          success: false,
          message: 'Já existe uma câmera com este cameraID'
        });
      }

      // Cria nova câmera
      const novaCamera = new Camera(dadosCamera);
      await novaCamera.save();

      logger.info(`Nova câmera criada: ${novaCamera.cameraID}`);

      res.status(201).json({
        success: true,
        message: 'Câmera criada com sucesso',
        data: novaCamera
      });

    } catch (error) {
      logger.error('Erro ao criar câmera:', error);
      next(error);
    }
  }

  /**
   * Atualiza uma câmera existente
   * PUT /api/cameras/:id
   */
  async atualizarCamera(req, res, next) {
    try {
      const { id } = req.params;
      const dadosAtualizacao = req.body;

      // Se está atualizando cameraID, verifica se não existe outro com o mesmo ID
      if (dadosAtualizacao.cameraID) {
        const cameraExistente = await Camera.findOne({ 
          cameraID: dadosAtualizacao.cameraID.toLowerCase(),
          _id: { $ne: id }
        });
        
        if (cameraExistente) {
          return res.status(409).json({
            success: false,
            message: 'Já existe uma câmera com este cameraID'
          });
        }
      }

      const cameraAtualizada = await Camera.findByIdAndUpdate(
        id, 
        dadosAtualizacao, 
        { 
          new: true, 
          runValidators: true 
        }
      );

      if (!cameraAtualizada) {
        return res.status(404).json({
          success: false,
          message: 'Câmera não encontrada'
        });
      }

      logger.info(`Câmera atualizada: ${cameraAtualizada.cameraID}`);

      res.status(200).json({
        success: true,
        message: 'Câmera atualizada com sucesso',
        data: cameraAtualizada
      });

    } catch (error) {
      logger.error('Erro ao atualizar câmera:', error);
      next(error);
    }
  }

  /**
   * Remove uma câmera
   * DELETE /api/cameras/:id
   */
  async removerCamera(req, res, next) {
    try {
      const { id } = req.params;
      
      const cameraRemovida = await Camera.findByIdAndDelete(id);
      
      if (!cameraRemovida) {
        return res.status(404).json({
          success: false,
          message: 'Câmera não encontrada'
        });
      }

      logger.info(`Câmera removida: ${cameraRemovida.cameraID}`);

      res.status(200).json({
        success: true,
        message: 'Câmera removida com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao remover câmera:', error);
      next(error);
    }
  }

  /**
   * Atualiza status de conexão de uma câmera
   * PATCH /api/cameras/:id/conexao
   */
  async atualizarConexao(req, res, next) {
    try {
      const { id } = req.params;
      
      const camera = await Camera.findById(id);
      
      if (!camera) {
        return res.status(404).json({
          success: false,
          message: 'Câmera não encontrada'
        });
      }

      await camera.atualizarConexao();

      res.status(200).json({
        success: true,
        message: 'Status de conexão atualizado',
        data: {
          cameraID: camera.cameraID,
          ultimaConexao: camera.ultimaConexao,
          status: camera.status
        }
      });

    } catch (error) {
      logger.error('Erro ao atualizar conexão:', error);
      next(error);
    }
  }

  /**
   * Lista câmeras por zona
   * GET /api/cameras/zona/:zona
   */
  async listarCamerasPorZona(req, res, next) {
    try {
      const { zona } = req.params;
      const { ativo = true } = req.query;
      
      const cameras = await Camera.buscarPorZona(zona, ativo === 'true');
      
      res.status(200).json({
        success: true,
        data: cameras
      });

    } catch (error) {
      logger.error('Erro ao listar câmeras por zona:', error);
      next(error);
    }
  }

  /**
   * Lista apenas câmeras ativas
   * GET /api/cameras/ativas
   */
  async listarCamerasAtivas(req, res, next) {
    try {
      const cameras = await Camera.buscarAtivas();
      
      res.status(200).json({
        success: true,
        data: cameras
      });

    } catch (error) {
      logger.error('Erro ao listar câmeras ativas:', error);
      next(error);
    }
  }

  /**
   * Obtém estatísticas das câmeras
   * GET /api/cameras/estatisticas
   */
  async obterEstatisticas(req, res, next) {
    try {
      const totalCameras = await Camera.countDocuments();
      const camerasAtivas = await Camera.countDocuments({ ativo: true });
      const camerasInativas = totalCameras - camerasAtivas;

      // Estatísticas por zona
      const estatisticasPorZona = await Camera.aggregate([
        {
          $group: {
            _id: '$zona',
            total: { $sum: 1 },
            ativas: { 
              $sum: { $cond: [{ $eq: ['$ativo', true] }, 1, 0] } 
            }
          }
        },
        { $sort: { total: -1 } }
      ]);

      // Estatísticas por status de conexão
      const agora = new Date();
      const cincoPinUtosAtras = new Date(agora.getTime() - 5 * 60 * 1000);
      const trintaMinutosAtras = new Date(agora.getTime() - 30 * 60 * 1000);

      const camerasOnline = await Camera.countDocuments({
        ativo: true,
        ultimaConexao: { $gte: cincoPinUtosAtras }
      });

      const camerasInstaveis = await Camera.countDocuments({
        ativo: true,
        ultimaConexao: { 
          $gte: trintaMinutosAtras,
          $lt: cincoPinUtosAtras
        }
      });

      const camerasOffline = await Camera.countDocuments({
        ativo: true,
        $or: [
          { ultimaConexao: { $lt: trintaMinutosAtras } },
          { ultimaConexao: null }
        ]
      });

      res.status(200).json({
        success: true,
        data: {
          resumo: {
            total: totalCameras,
            ativas: camerasAtivas,
            inativas: camerasInativas
          },
          statusConexao: {
            online: camerasOnline,
            instaveis: camerasInstaveis,
            offline: camerasOffline
          },
          porZona: estatisticasPorZona
        }
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      next(error);
    }
  }
}

module.exports = new CameraController();