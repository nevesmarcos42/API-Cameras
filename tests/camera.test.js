const mongoose = require('mongoose');
const Camera = require('../src/models/Camera');

describe('Camera Model', () => {
  // Limpa a collection antes de cada teste
  beforeEach(async () => {
    await Camera.deleteMany({});
  });

  describe('Validação de dados', () => {
    it('deve criar uma câmera válida', async () => {
      const cameraData = {
        nome: 'Câmera Teste',
        cameraID: 'camera-test-001',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1'
      };

      const camera = new Camera(cameraData);
      const savedCamera = await camera.save();

      expect(savedCamera._id).toBeDefined();
      expect(savedCamera.nome).toBe(cameraData.nome);
      expect(savedCamera.cameraID).toBe(cameraData.cameraID.toLowerCase());
      expect(savedCamera.zona).toBe(cameraData.zona);
      expect(savedCamera.enderecoRTSP).toBe(cameraData.enderecoRTSP);
      expect(savedCamera.ativo).toBe(true); // valor padrão
    });

    it('deve falhar sem nome obrigatório', async () => {
      const cameraData = {
        cameraID: 'camera-test-002',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1'
      };

      const camera = new Camera(cameraData);
      
      await expect(camera.save()).rejects.toThrow('Nome da câmera é obrigatório');
    });

    it('deve falhar sem cameraID obrigatório', async () => {
      const cameraData = {
        nome: 'Câmera Teste',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1'
      };

      const camera = new Camera(cameraData);
      
      await expect(camera.save()).rejects.toThrow('ID da câmera é obrigatório');
    });

    it('deve falhar com endereço RTSP inválido', async () => {
      const cameraData = {
        nome: 'Câmera Teste',
        cameraID: 'camera-test-003',
        zona: 'teste',
        enderecoRTSP: 'http://192.168.1.100:554/stream1' // não é RTSP
      };

      const camera = new Camera(cameraData);
      
      await expect(camera.save()).rejects.toThrow('Endereço RTSP deve começar com rtsp://');
    });

    it('deve falhar com cameraID duplicado', async () => {
      const cameraData = {
        nome: 'Câmera Teste',
        cameraID: 'camera-test-004',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1'
      };

      // Cria primeira câmera
      const camera1 = new Camera(cameraData);
      await camera1.save();

      // Tenta criar segunda câmera com mesmo cameraID
      const camera2 = new Camera(cameraData);
      
      await expect(camera2.save()).rejects.toThrow();
    });

    it('deve converter cameraID para lowercase', async () => {
      const cameraData = {
        nome: 'Câmera Teste',
        cameraID: 'CAMERA-TEST-005',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1'
      };

      const camera = new Camera(cameraData);
      const savedCamera = await camera.save();

      expect(savedCamera.cameraID).toBe('camera-test-005');
    });
  });

  describe('Configurações de câmera', () => {
    it('deve usar valores padrão para configurações', async () => {
      const cameraData = {
        nome: 'Câmera Teste',
        cameraID: 'camera-test-006',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1'
      };

      const camera = new Camera(cameraData);
      const savedCamera = await camera.save();

      expect(savedCamera.configuracoes.qualidade).toBe('media');
      expect(savedCamera.configuracoes.fps).toBe(30);
      expect(savedCamera.configuracoes.detectarMovimento).toBe(true);
      expect(savedCamera.configuracoes.sensibilidade).toBe(5);
    });

    it('deve validar FPS dentro do range', async () => {
      const cameraData = {
        nome: 'Câmera Teste',
        cameraID: 'camera-test-007',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1',
        configuracoes: {
          fps: 100 // acima do máximo
        }
      };

      const camera = new Camera(cameraData);
      
      await expect(camera.save()).rejects.toThrow('FPS não pode exceder 60');
    });
  });

  describe('Métodos de instância', () => {
    it('deve atualizar última conexão', async () => {
      const camera = new Camera({
        nome: 'Câmera Teste',
        cameraID: 'camera-test-008',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1'
      });

      await camera.save();
      expect(camera.ultimaConexao).toBeNull();

      await camera.atualizarConexao();
      expect(camera.ultimaConexao).toBeInstanceOf(Date);
    });
  });

  describe('Virtual - status', () => {
    it('deve retornar "nunca_conectada" para câmera sem conexão', async () => {
      const camera = new Camera({
        nome: 'Câmera Teste',
        cameraID: 'camera-test-009',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1'
      });

      expect(camera.status).toBe('nunca_conectada');
    });

    it('deve retornar "online" para câmera conectada recentemente', async () => {
      const camera = new Camera({
        nome: 'Câmera Teste',
        cameraID: 'camera-test-010',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1',
        ultimaConexao: new Date() // agora
      });

      expect(camera.status).toBe('online');
    });

    it('deve retornar "offline" para câmera desconectada há mais de 30 minutos', async () => {
      const trintaECincoMinutosAtras = new Date();
      trintaECincoMinutosAtras.setMinutes(trintaECincoMinutosAtras.getMinutes() - 35);

      const camera = new Camera({
        nome: 'Câmera Teste',
        cameraID: 'camera-test-011',
        zona: 'teste',
        enderecoRTSP: 'rtsp://192.168.1.100:554/stream1',
        ultimaConexao: trintaECincoMinutosAtras
      });

      expect(camera.status).toBe('offline');
    });
  });

  describe('Métodos estáticos', () => {
    beforeEach(async () => {
      // Cria algumas câmeras de teste
      await Camera.create([
        {
          nome: 'Câmera Zona A1',
          cameraID: 'camera-zona-a-1',
          zona: 'zona-a',
          enderecoRTSP: 'rtsp://192.168.1.101:554/stream1',
          ativo: true
        },
        {
          nome: 'Câmera Zona A2',
          cameraID: 'camera-zona-a-2',
          zona: 'zona-a',
          enderecoRTSP: 'rtsp://192.168.1.102:554/stream1',
          ativo: true
        },
        {
          nome: 'Câmera Zona B1',
          cameraID: 'camera-zona-b-1',
          zona: 'zona-b',
          enderecoRTSP: 'rtsp://192.168.1.103:554/stream1',
          ativo: false
        }
      ]);
    });

    it('deve buscar câmeras por zona', async () => {
      const camerasZonaA = await Camera.buscarPorZona('zona-a');
      expect(camerasZonaA).toHaveLength(2);
      expect(camerasZonaA.every(c => c.zona === 'zona-a')).toBe(true);
    });

    it('deve buscar apenas câmeras ativas', async () => {
      const camerasAtivas = await Camera.buscarAtivas();
      expect(camerasAtivas).toHaveLength(2);
      expect(camerasAtivas.every(c => c.ativo === true)).toBe(true);
    });

    it('deve buscar câmeras inativas por zona', async () => {
      const camerasZonaBInativas = await Camera.buscarPorZona('zona-b', false);
      expect(camerasZonaBInativas).toHaveLength(1);
      expect(camerasZonaBInativas[0].ativo).toBe(false);
    });
  });
});