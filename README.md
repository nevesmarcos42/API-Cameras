# Projeto API de Câmeras

## Visão Geral

Este projeto é uma API RESTful criada com Node.js, Express e MongoDB (via Mongoose) para gerenciar câmeras em um sistema. O foco é oferecer funcionalidades CRUD (Criar, Ler, Atualizar, Deletar) organizadas com boas práticas modernas de código.

Adicionalmente, a API foi estendida para consumir eventos via Kafka e persistir esses eventos no banco de dados analítico ClickHouse, garantindo armazenamento eficiente e consultas rápidas para análise.

Também implementa upload de imagens associadas aos eventos, armazenando-as no MinIO (armazenamento compatível com S3) e fornecendo URLs assinadas para acesso seguro às imagens.

## Funcionalidades Implementadas

- Configuração modular da conexão MongoDB em `config/db.js`.
- Endpoints REST para CRUD de câmeras:  
  - POST /api/cameras – criar nova câmera  
  - GET /api/cameras – listar todas as câmeras  
  - GET /api/cameras/:cameraID – obter câmera por ID customizado  
  - PUT /api/cameras/:cameraID – atualizar dados da câmera  
  - DELETE /api/cameras/:cameraID – deletar câmera  
- Upload de imagens via POST /api/event-images/upload, com armazenamento em MinIO.
- Rota GET /api/event-images/signed-url/:fileName para fornecer URL assinada para acesso a imagens.
- Integração com Kafka para consumo de eventos de movimento detectados pelas câmeras.
- Persistência dos eventos consumidos no banco ClickHouse com timestamp formatado para compatibilidade, usando cliente oficial em Node.js.
- Endpoint GET /api/events com filtros (cameraID, tipo, datas) e paginação para consulta dos eventos.
- Tratamento de erros e validações básicas.
- Parâmetro de rota unificado `cameraID` para acesso consistente.

## Estrutura do Projeto

- `app.js` – ponto de entrada da aplicação.  
- `config/db.js` – configuração da conexão com MongoDB.  
- `src/controllers/` – lógica dos endpoints.  
- `src/routes/` – rotas da aplicação.  
- `src/models/` – esquemas Mongoose.  
- `src/kafka/` – lógica de consumidor Kafka e integração com ClickHouse (exemplo).  
- `testInsertClickhouse.js` – script de teste isolado para inserir evento no ClickHouse.

## Como rodar

1. Clone o repositório e instale dependências:  
  - `npm install`

2. Configure o arquivo `.env` com as variáveis necessárias:  
  - `MONGODB_URL=<url_do_mongodb>`  
  - `CLICKHOUSE_URL=<url_do_clickhouse>`  
  - `CLICKHOUSE_USER=<usuario_clickhouse>`  
  - `CLICKHOUSE_PASSWORD=<senha_clickhouse>`  
  - `KAFKA_BROKERS=<lista_brokers_kafka>`  
  - `KAFKA_GROUP_ID=camera-group`  
  - `MINIO_ENDPOINT=<endpoint_minio>`  
  - `MINIO_PORT=<porta_minio>`  
  - `MINIO_ACCESS_KEY=<access_key_minio>`  
  - `MINIO_SECRET_KEY=<secret_key_minio>`  
  - `MINIO_BUCKET=camera-events`

3. Inicie o servidor API:  
  - `npm start` ou `nodemon app.js`

4. Teste a API com Postman, curl ou similar.

5. Para validar a integração ClickHouse, rode o script de teste:  
  - `node testInsertClickhouse.js`

6. Para rodar o consumidor Kafka e persistir eventos no ClickHouse, execute o serviço consumidor conforme definido no código.

## Estrutura da Tabela ClickHouse

A tabela `device_events` no banco `default` é configurada conforme:

CREATE TABLE default.device_events (

deviceId String,

eventType String,

timestamp DateTime

) ENGINE = MergeTree()

ORDER BY timestamp;


## Documentação dos Endpoints principais

### Câmeras (CRUD)

| Método | Rota                    | Descrição                     |
|--------|-------------------------|-------------------------------|
| POST   | /api/cameras            | Criar nova câmera              |
| GET    | /api/cameras            | Listar todas as câmeras       |
| GET    | /api/cameras/:cameraID  | Obter câmera por ID           |
| PUT    | /api/cameras/:cameraID  | Atualizar detalhes da câmera  |
| DELETE | /api/cameras/:cameraID  | Remover câmera                |

### Eventos

| Método | Rota                  | Descrição                                  |
|--------|-----------------------|--------------------------------------------|
| GET    | /api/events            | Consultar eventos com filtros e paginação |

### Imagens de eventos

| Método | Rota                              | Descrição                                           |
|--------|----------------------------------|-----------------------------------------------------|
| POST   | /api/event-images/upload          | Upload de imagem associada a evento                 |
| GET    | /api/event-images/signed-url/:fileName | Obter URL assinada para visualizar imagem         |

## Próximos Passos

- Implementar autenticação e autorização na API.
- Adicionar testes automatizados para rotas e consumidores.
- Documentar API com Swagger/OpenAPI para facilitar consumos externos.
- Aprimorar a solução de eventos em tempo real com monitoramento e alertas.

## Contato e Contribuições

Colaborações e sugestões são bem-vindas!  
Abra issues ou pull requests para participar do desenvolvimento.

---
