const Minio = require('minio');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Serviço para integração com MinIO (Object Storage)
 * Gerencia upload, download e URLs assinadas para imagens
 */
class MinioService {
  constructor() {
    this.client = null;
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'camera-events';
    this.isInitialized = false;
  }

  /**
   * Inicializa o cliente MinIO
   */
  async initialize() {
    try {
      this.client = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT) || 9000,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minio',
        secretKey: process.env.MINIO_SECRET_KEY || 'minio123'
      });

      // Verifica se o bucket existe, se não, cria
      await this.ensureBucketExists();
      
      this.isInitialized = true;
      logger.info('MinIO inicializado com sucesso');

    } catch (error) {
      logger.error('Erro ao inicializar MinIO:', error);
      throw error;
    }
  }

  /**
   * Garante que o bucket existe, criando se necessário
   */
  async ensureBucketExists() {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        logger.info(`Bucket ${this.bucketName} criado`);
        
        // Define política pública para leitura (opcional)
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`]
            }
          ]
        };
        
        // Descomente a linha abaixo se quiser tornar o bucket público para leitura
        // await this.client.setBucketPolicy(this.bucketName, JSON.stringify(policy));
        
      } else {
        logger.info(`Bucket ${this.bucketName} já existe`);
      }
    } catch (error) {
      logger.error('Erro ao verificar/criar bucket:', error);
      throw error;
    }
  }

  /**
   * Faz upload de uma imagem para o MinIO
   */
  async uploadImage(imageBuffer, eventId, cameraId, mimeType = 'image/jpeg') {
    try {
      if (!this.isInitialized) {
        throw new Error('MinIO não está inicializado');
      }

      // Gera um nome único para o arquivo
      const fileExtension = this.getFileExtension(mimeType);
      const fileName = `${cameraId}/${new Date().toISOString().split('T')[0]}/${eventId}${fileExtension}`;
      
      // Metadados do arquivo
      const metaData = {
        'Content-Type': mimeType,
        'Event-Id': eventId,
        'Camera-Id': cameraId,
        'Upload-Date': new Date().toISOString()
      };

      // Upload do arquivo
      const result = await this.client.putObject(
        this.bucketName,
        fileName,
        imageBuffer,
        imageBuffer.length,
        metaData
      );

      logger.debug(`Imagem uploaded: ${fileName}, ETag: ${result.etag}`);

      return {
        success: true,
        fileName,
        path: `/${this.bucketName}/${fileName}`,
        size: imageBuffer.length,
        etag: result.etag
      };

    } catch (error) {
      logger.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  }

  /**
   * Gera URL assinada para acesso temporário à imagem
   */
  async getSignedUrl(fileName, expiry = 3600) {
    try {
      if (!this.isInitialized) {
        throw new Error('MinIO não está inicializado');
      }

      // Remove barra inicial se existir
      const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
      
      // Remove o nome do bucket se estiver no path
      const objectName = cleanFileName.startsWith(`${this.bucketName}/`) 
        ? cleanFileName.substring(`${this.bucketName}/`.length)
        : cleanFileName;

      const url = await this.client.presignedGetObject(
        this.bucketName,
        objectName,
        expiry
      );

      logger.debug(`URL assinada gerada para: ${objectName}`);
      return url;

    } catch (error) {
      logger.error('Erro ao gerar URL assinada:', error);
      throw error;
    }
  }

  /**
   * Remove uma imagem do MinIO
   */
  async deleteImage(fileName) {
    try {
      if (!this.isInitialized) {
        throw new Error('MinIO não está inicializado');
      }

      // Remove barra inicial se existir
      const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
      
      // Remove o nome do bucket se estiver no path
      const objectName = cleanFileName.startsWith(`${this.bucketName}/`) 
        ? cleanFileName.substring(`${this.bucketName}/`.length)
        : cleanFileName;

      await this.client.removeObject(this.bucketName, objectName);
      
      logger.debug(`Imagem removida: ${objectName}`);
      return true;

    } catch (error) {
      logger.error('Erro ao remover imagem:', error);
      throw error;
    }
  }

  /**
   * Lista objetos no bucket com filtros
   */
  async listImages(prefix = '', limit = 100) {
    try {
      if (!this.isInitialized) {
        throw new Error('MinIO não está inicializado');
      }

      const objects = [];
      const stream = this.client.listObjects(this.bucketName, prefix, true);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (objects.length < limit) {
            objects.push({
              name: obj.name,
              size: obj.size,
              lastModified: obj.lastModified,
              etag: obj.etag
            });
          }
        });

        stream.on('error', (error) => {
          logger.error('Erro ao listar objetos:', error);
          reject(error);
        });

        stream.on('end', () => {
          resolve(objects);
        });
      });

    } catch (error) {
      logger.error('Erro ao listar imagens:', error);
      throw error;
    }
  }

  /**
   * Obtém informações de um objeto
   */
  async getObjectInfo(fileName) {
    try {
      if (!this.isInitialized) {
        throw new Error('MinIO não está inicializado');
      }

      // Remove barra inicial se existir
      const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
      
      // Remove o nome do bucket se estiver no path
      const objectName = cleanFileName.startsWith(`${this.bucketName}/`) 
        ? cleanFileName.substring(`${this.bucketName}/`.length)
        : cleanFileName;

      const stat = await this.client.statObject(this.bucketName, objectName);
      
      return {
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        contentType: stat.metaData['content-type'],
        metaData: stat.metaData
      };

    } catch (error) {
      if (error.code === 'NotFound') {
        return null;
      }
      logger.error('Erro ao obter informações do objeto:', error);
      throw error;
    }
  }

  /**
   * Verifica se o serviço está pronto
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Obtém extensão do arquivo baseada no MIME type
   */
  getFileExtension(mimeType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff'
    };

    return extensions[mimeType.toLowerCase()] || '.jpg';
  }

  /**
   * Gera um path organizado por data para o arquivo
   */
  generateFilePath(cameraId, eventId, mimeType = 'image/jpeg') {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const extension = this.getFileExtension(mimeType);
    
    return `${cameraId}/${year}/${month}/${day}/${eventId}${extension}`;
  }

  /**
   * Limpa objetos antigos (para manutenção)
   */
  async cleanupOldImages(daysOld = 90) {
    try {
      if (!this.isInitialized) {
        throw new Error('MinIO não está inicializado');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const stream = this.client.listObjects(this.bucketName, '', true);
      const objectsToDelete = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.lastModified < cutoffDate) {
            objectsToDelete.push(obj.name);
          }
        });

        stream.on('error', (error) => {
          logger.error('Erro ao listar objetos para limpeza:', error);
          reject(error);
        });

        stream.on('end', async () => {
          try {
            if (objectsToDelete.length > 0) {
              await this.client.removeObjects(this.bucketName, objectsToDelete);
              logger.info(`${objectsToDelete.length} objetos antigos removidos`);
            }
            resolve(objectsToDelete.length);
          } catch (error) {
            reject(error);
          }
        });
      });

    } catch (error) {
      logger.error('Erro na limpeza de objetos antigos:', error);
      throw error;
    }
  }
}

// Exporta uma instância singleton
module.exports = new MinioService();