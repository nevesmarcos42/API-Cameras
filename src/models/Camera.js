const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true },
    cameraID: { type: String, required: true, trim: true, unique: true },
    zona: { type: String, required: true, trim: true },
    enderecoRTSP: { type: String, required: true, trim: true },
}, {
    timestamps: true // Cria createdAt e updatedAt de forma automatica
});
 
const Device = mongoose.model('Device', cameraSchema);

module.exports = Device;