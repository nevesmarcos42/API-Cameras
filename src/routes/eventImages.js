const express = require('express');
const multer = require('multer');
const { uploadFile, minioClient } = require('../services/minioClient');

const router = express.Router();
const upload = multer();

// Endpoint para upload da imagem
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        // Verifica se o arquivo foi enviado
        if (!req.file) return res.status(400).json({ error: 'Imagem não enviada' });

        // Criar nome único para o arquivo baseado no timestamp e nome original
        const fileName = `${Date.now()}_${req.file.originalname}`;

        // Chama a função que faz o upload da imagem para o MinIO
        await uploadFile(req.file.buffer, fileName, req.file.mimetype);

        // Retorna sucesso com o nome do arquivo armazenado
        res.status(200).json({ message: 'Imagem enviada com sucesso', fileName });
    } catch (error) {
        console.error('Erro ao enviar imagem:', error);
        res.status(500).json({ error: 'Erro ao enviar imagem' });
    }
});

// Endpoint para gerar URL assinada para visualização segura da imagem
router.get('/signed-url/:fileName', async (req, res) => {
    try {
        const { fileName } = req.params;
        // Obtém o nome do bucket das variáveis de ambiente ou usa 'camera-events' como padrão
        const bucket = process.env.MINIO_BUCKET || 'camera-events';

        // Gera uma URL assinada válida por 1 hora (3600 segundos)
        const url = await minioClient.presignedGetObject(bucket, fileName, 3600);

        // Retorna a URL assinada no json da resposta
        res.status(200).json({ url });
    } catch (error) {
        console.error('Erro ao gerar URL assinada:', error);
        res.status(500).json({ error: 'Erro ao gerar URL' });
    }
});

module.exports = router;
