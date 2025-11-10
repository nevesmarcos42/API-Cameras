#!/usr/bin/env node

/**
 * Script de exemplo para testar a API de Câmeras
 * Demonstra como usar os endpoints principais
 */

const axios = require('axios');

// Configuração da API
const API_BASE_URL = 'http://localhost:3000/api';

// Cliente HTTP configurado
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Função para logging com cores
 */
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',     // Cyan
    success: '\x1b[32m',  // Green
    error: '\x1b[31m',    // Red
    warning: '\x1b[33m',  // Yellow
    reset: '\x1b[0m'      // Reset
  };

  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * Testa o health check da API
 */
async function testHealthCheck() {
  try {
    log('Testando health check...', 'info');
    const response = await api.get('/health');
    log('✓ Health check passou', 'success');
    log(`Status: ${response.data.status}, Uptime: ${response.data.uptime}s`, 'info');
    return true;
  } catch (error) {
    log(`✗ Erro no health check: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Testa operações CRUD de câmeras
 */
async function testCameraOperations() {
  try {
    log('Testando operações de câmeras...', 'info');

    // 1. Listar câmeras existentes
    log('1. Listando câmeras existentes...', 'info');
    const listResponse = await api.get('/cameras');
    log(`✓ Encontradas ${listResponse.data.data.cameras.length} câmeras`, 'success');

    // 2. Criar nova câmera de teste
    log('2. Criando nova câmera de teste...', 'info');
    const newCamera = {
      nome: 'Câmera de Teste API',
      cameraID: 'camera-test-' + Date.now(),
      zona: 'teste',
      enderecoRTSP: 'rtsp://192.168.1.200:554/test',
      configuracoes: {
        qualidade: 'media',
        fps: 25,
        detectarMovimento: true,
        sensibilidade: 5
      }
    };

    const createResponse = await api.post('/cameras', newCamera);
    const createdCamera = createResponse.data.data;
    log(`✓ Câmera criada com ID: ${createdCamera._id}`, 'success');

    // 3. Buscar câmera por cameraID
    log('3. Buscando câmera por cameraID...', 'info');
    const getByIdResponse = await api.get(`/cameras/by-camera-id/${createdCamera.cameraID}`);
    log(`✓ Câmera encontrada: ${getByIdResponse.data.data.nome}`, 'success');

    // 4. Atualizar câmera
    log('4. Atualizando câmera...', 'info');
    const updateData = {
      nome: 'Câmera de Teste API - Atualizada',
      ativo: true
    };
    const updateResponse = await api.put(`/cameras/${createdCamera._id}`, updateData);
    log(`✓ Câmera atualizada: ${updateResponse.data.data.nome}`, 'success');

    // 5. Atualizar status de conexão
    log('5. Atualizando status de conexão...', 'info');
    await api.patch(`/cameras/${createdCamera._id}/conexao`);
    log('✓ Status de conexão atualizado', 'success');

    // 6. Obter estatísticas
    log('6. Obtendo estatísticas...', 'info');
    const statsResponse = await api.get('/cameras/estatisticas');
    log(`✓ Total de câmeras: ${statsResponse.data.data.resumo.total}`, 'success');

    // 7. Remover câmera de teste
    log('7. Removendo câmera de teste...', 'info');
    await api.delete(`/cameras/${createdCamera._id}`);
    log('✓ Câmera removida com sucesso', 'success');

    return true;
  } catch (error) {
    log(`✗ Erro nas operações de câmera: ${error.message}`, 'error');
    if (error.response?.data) {
      log(`Detalhes: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
    }
    return false;
  }
}

/**
 * Testa consultas de eventos
 */
async function testEventOperations() {
  try {
    log('Testando operações de eventos...', 'info');

    // 1. Listar eventos recentes
    log('1. Listando eventos recentes...', 'info');
    const recentResponse = await api.get('/events/recentes?limite=5');
    log(`✓ Encontrados ${recentResponse.data.data.length} eventos recentes`, 'success');

    // 2. Obter estatísticas de eventos
    log('2. Obtendo estatísticas de eventos...', 'info');
    const statsResponse = await api.get('/events/estatisticas');
    log(`✓ Estatísticas obtidas, tipos de evento: ${statsResponse.data.data.length}`, 'success');

    // 3. Buscar timeline de eventos
    log('3. Buscando timeline de eventos (último dia)...', 'info');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const timelineResponse = await api.get('/events/timeline', {
      params: {
        dataInicio: yesterday.toISOString(),
        intervalo: 'hour'
      }
    });
    log(`✓ Timeline obtida: ${timelineResponse.data.data.timeline.length} períodos`, 'success');

    // 4. Buscar eventos com filtros
    log('4. Buscando eventos com filtros...', 'info');
    const eventsResponse = await api.get('/events', {
      params: {
        page: 1,
        limit: 10,
        orderBy: 'timestamp',
        order: 'DESC'
      }
    });
    
    const events = eventsResponse.data.data.eventos;
    log(`✓ Encontrados ${events.length} eventos`, 'success');

    // 5. Se houver eventos, testa URL de imagem
    if (events.length > 0) {
      const firstEvent = events[0];
      log(`5. Testando URL de imagem para evento: ${firstEvent.eventId}...`, 'info');
      
      try {
        const imageUrlResponse = await api.get(`/events/${firstEvent.eventId}/image-url`);
        log('✓ URL de imagem gerada com sucesso', 'success');
      } catch (imageError) {
        log('⚠ Evento não possui imagem ou serviço MinIO não disponível', 'warning');
      }
    }

    return true;
  } catch (error) {
    log(`✗ Erro nas operações de eventos: ${error.message}`, 'error');
    if (error.response?.data) {
      log(`Detalhes: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
    }
    return false;
  }
}

/**
 * Simula evento Kafka para teste
 */
async function simulateKafkaEvent() {
  log('Simulando evento Kafka (envio direto não implementado neste exemplo)', 'info');
  log('Para testar Kafka, use um producer externo enviando para o tópico configurado', 'info');
  
  // Exemplo de estrutura de evento que seria enviado ao Kafka
  const exampleEvent = {
    eventId: 'test-event-' + Date.now(),
    cameraId: 'camera-001',
    timestamp: new Date().toISOString(),
    tipoEvento: 'movimento',
    confianca: 0.85,
    coordenadas: {
      x: 150,
      y: 200,
      largura: 200,
      altura: 150
    }
  };

  log('Estrutura de evento de exemplo:', 'info');
  console.log(JSON.stringify(exampleEvent, null, 2));
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  log('='.repeat(60), 'info');
  log('INICIANDO TESTES DA API DE CÂMERAS', 'info');
  log('='.repeat(60), 'info');

  const results = {
    healthCheck: false,
    cameraOperations: false,
    eventOperations: false
  };

  // Teste 1: Health Check
  results.healthCheck = await testHealthCheck();
  
  if (!results.healthCheck) {
    log('API não está respondendo. Verifique se o servidor está rodando.', 'error');
    process.exit(1);
  }

  log('-'.repeat(60), 'info');

  // Teste 2: Operações de Câmeras
  results.cameraOperations = await testCameraOperations();

  log('-'.repeat(60), 'info');

  // Teste 3: Operações de Eventos
  results.eventOperations = await testEventOperations();

  log('-'.repeat(60), 'info');

  // Teste 4: Simulação Kafka
  await simulateKafkaEvent();

  // Resumo dos resultados
  log('='.repeat(60), 'info');
  log('RESUMO DOS TESTES:', 'info');
  log(`Health Check: ${results.healthCheck ? '✓ PASSOU' : '✗ FALHOU'}`, 
       results.healthCheck ? 'success' : 'error');
  log(`Operações de Câmeras: ${results.cameraOperations ? '✓ PASSOU' : '✗ FALHOU'}`, 
       results.cameraOperations ? 'success' : 'error');
  log(`Operações de Eventos: ${results.eventOperations ? '✓ PASSOU' : '✗ FALHOU'}`, 
       results.eventOperations ? 'success' : 'error');
  
  const allPassed = Object.values(results).every(result => result);
  log(`RESULTADO GERAL: ${allPassed ? 'TODOS OS TESTES PASSARAM' : 'ALGUNS TESTES FALHARAM'}`,
       allPassed ? 'success' : 'error');
  log('='.repeat(60), 'info');

  process.exit(allPassed ? 0 : 1);
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  log(`Erro não tratado: ${reason}`, 'error');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`Exceção não capturada: ${error.message}`, 'error');
  process.exit(1);
});

// Executa os testes se o script for chamado diretamente
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testHealthCheck,
  testCameraOperations,
  testEventOperations,
  simulateKafkaEvent
};