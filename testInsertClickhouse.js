const { createClient } = require('@clickhouse/client');
require('dotenv').config();

async function testInsert() {
  const clickhouse = createClient({
    url: process.env.CLICKHOUSE_URL,
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
  });

  // Evento fixo com timestamp formatado para ClickHouse
  const event = {
    deviceId: 'camera-test',
    eventType: 'test-event',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19), // 'YYYY-MM-DD HH:mm:ss'
  };

  try {
    // Insere o evento como objeto dentro de array, sem JSON.stringify
    await clickhouse.insert({
      table: 'default.device_events',
      values: [event],
      format: 'JSONEachRow',
    });
    console.log('Evento inserido com sucesso:', event);
  } catch (error) {
    console.error('Erro ao inserir evento no ClickHouse:', error);
  } finally {
    await clickhouse.close();
  }
}

testInsert();
