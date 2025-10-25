const Camera = require('../models/Camera');

// Controlador para criar uma nova câmera
exports.createCamera = async (req, res) => {
    try {
        const camera = new Camera(req.body);
        const savedCamera = camera.save();
        res.status(201).json(savedCamera);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Controlador para obter todas as câmeras
exports.getAllCameras = async (req, res) => {
    try {
        const cameras = await Camera.find();
        res.status(200).json(cameras);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controlador para obter uma câmera por ID
exports.getCameraID = async (req, res) => {
    try {
        const cameraID = req.params.cameraID;
        const camera = await Camera.findOne({ cameraID: new RegExp(`^${cameraID}$`, "i") });
        console.log("Atualizando câmera com cameraID:", cameraID);
        if (!camera) {
            return res.status(404).json({ error: `Câmera não encontrada` });
        }
        res.status(200).json(camera);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controlador para atualizar uma câmera por ID
exports.updateCamera = async (req, res) => {
    try {
        const cameraID = req.params.cameraID;
        const updateData = req.body;
        const updatedCamera = await Camera.findOneAndUpdate(
            { cameraID: new RegExp(`^${cameraID}$`, "i") }, 
            updateData,
            { new: true, runValidators: true } // retorna o documento atualizado
        );
        if (!updatedCamera) {
            return res.status(404).json({ error: 'Câmera não encontrada' });
        }
        res.status(200).json(updatedCamera);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Controlador para deletar uma câmera por ID
exports.deleteCamera = async (req, res) => {
    try {
        const deletedCamera = await Camera.findOneAndDelete(req.params.cameraID);
        if (!deletedCamera) {
            return res.status(404).json({ error: 'Câmera não encontrada' });
        }
        res.status(200).json({ message: 'Câmera deletada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};