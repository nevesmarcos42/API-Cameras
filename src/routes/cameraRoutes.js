const express = require('express');
const router = express.Router();
const cameraController = require('../Controllers/cameraController');

// Rota para criar uma nova câmera
router.post('/cameras', cameraController.createCamera);

// Rota para obter todas as câmeras
router.get('/cameras', cameraController.getAllCameras);

// Rota para obter uma câmera por ID
router.get('/cameras/:cameraID', cameraController.getCameraID);

// Rota para atualizar uma câmera por ID
router.put('/cameras/:cameraID', cameraController.updateCamera);

// Rota para deletar uma câmera por ID
router.delete('/cameras/:cameraID', cameraController.deleteCamera);

module.exports = router;