const clickhouse = require('../services/clickhouseClient');

// Controlador para consultar eventos com filtros e paginação
exports.getEvents = async (req, res) => {
  try {
    const {
      deviceId,    // filtro por ID da câmera
      eventType,   // filtro por tipo de evento
      startDate,   // filtro por data inicial
      endDate,     // filtro por data final
      page = 1,    // número da página atual, padrão 1
      limit = 10   // limite de registros por página, padrão 10
    } = req.query;

    // Validação e conversão dos parâmetros page e limit para números inteiros
    // Garante page >= 1 e limit entre 1 e 100 para evitar carga excessiva
    const pageNumber = Math.max(parseInt(page), 1);
    const limitNumber = Math.min(Math.max(parseInt(limit), 1), 100);

    // Array para armazenar as condições do filtro montadas dinamicamente
    const filters = [];
    if (deviceId) filters.push(`deviceId = '${deviceId}'`);
    if (eventType) filters.push(`eventType = '${eventType}'`);
    if (startDate) filters.push(`timestamp >= '${startDate}'`);
    if (endDate) filters.push(`timestamp <= '${endDate}'`);

    // Monta a cláusula WHERE SQL combinando todos os filtros com AND,
    // ou string vazia se nenhum filtro foi aplicado
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Cálculo do offset para paginação (número de registros a pular)
    const offset = (pageNumber - 1) * limitNumber;

    // Monta a query SQL para consultar eventos com filtros, ordenação e paginação
    const query = `
      SELECT deviceId, eventType, timestamp
      FROM default.device_events
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limitNumber} OFFSET ${offset}
    `;

    console.log("Query ClickHouse gerada:", query);

    // Executa a query no ClickHouse, obtendo os dados em JSON
    const result = await clickhouse.query({ query });
    const events = await result.json();

    // Retorna resultado com estrutura JSON contendo dados da página e metadados de paginação
    res.json({
      data: events,               // registros da página atual
      pagination: {
        page: pageNumber,         // número da página atual
        limit: limitNumber,       // limite de registros por página
        offset,                   // offset calculado
        count: events.length      // número de registros retornados
      }
    });
  } catch (error) {
    // Em caso de erro, loga no console para depuração e retorna HTTP 500 com mensagem genérica
    console.error('Erro ao consultar eventos:', error);
    res.status(500).json({ error: 'Erro ao consultar eventos: ' + error.message });
  }
};
