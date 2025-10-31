const Minio = require('minio');

// Initialize MinIO client (correto: endPoint com 'p' minúsculo)
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost', // 'p' minúsculo é obrigatório
  port: parseInt(process.env.MINIO_PORT, 10) || 9002,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  region: ''  // importante para evitar erro de região
});

// Função para upload de arquivo para MinIO
async function uploadFile(buffer, fileName, contentType) {
  const bucket = process.env.MINIO_BUCKET || 'camera-events';

  // Verificar se o bucket existe
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) {
    await minioClient.makeBucket(bucket);
  }

  // Fazer upload do arquivo
  await minioClient.putObject(bucket, fileName, buffer, contentType);
  return `${bucket}/${fileName}`;
}

// Função simples para testar conexão e bucket
async function testConnection() {
  const bucket = process.env.MINIO_BUCKET || 'camera-events';
  try {
    const exists = await minioClient.bucketExists(bucket);
    console.log(`Bucket "${bucket}" existe?`, exists);
  } catch (error) {
    console.error('Erro ao checar bucket:', error);
  }
}

// Executar teste simples agora (opcional)
testConnection();

module.exports = {
  uploadFile,
  minioClient,
};
