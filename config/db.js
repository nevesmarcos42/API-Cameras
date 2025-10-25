const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL || "mongodb://root:example@localhost:27017/aeolus?authSource=admin");
        console.log('MongoDB conectado com sucesso');
    } catch (err) {
        console.error('Erro ao conectar ao MongoDB:', err);
        console.log('MongoDB URL:', process.env.MONGODB_URL);
        process.exit(1);
    }
};

module.exports = connectDB;