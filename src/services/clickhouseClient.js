const { createClient } = require('@clickhouse/client');
require('dotenv').config();

console.log('CLICKHOUSE_URL:', process.env.CLICKHOUSE_URL);
console.log('CLICKHOUSE_USER:', process.env.CLICKHOUSE_USER);
console.log('CLICKHOUSE_PASSWORD:', process.env.CLICKHOUSE_PASSWORD ? '****' : '(empty)');

const clickHouse = createClient({
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'myuser',
    password: process.env.CLICKHOUSE_PASSWORD || 'mypassword',
});


module.exports = clickHouse;
