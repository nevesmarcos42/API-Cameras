# API de Câmeras de Videomonitoramento

Esta é uma API RESTful desenvolvida em Node.js com Express para gerenciar câmeras de videomonitoramento e registrar eventos de movimento. O sistema integra MongoDB, ClickHouse, Apache Kafka e MinIO para fornecer uma solução completa de monitoramento e análise.

## Tecnologias Utilizadas

- **Node.js** com Express.js para a API REST
- **MongoDB** com Mongoose para persistência de dados das câmeras
- **ClickHouse** para armazenamento OLAP de eventos
- **Apache Kafka** para consumo de eventos em tempo real
- **MinIO** (compatível com S3) para armazenamento de imagens
- **Winston** para logging estruturado
- **Joi** para validação de dados
- **Helmet** e outras bibliotecas para segurança

## Funcionalidades

### Gerenciamento de Câmeras
- Operações CRUD completas para câmeras
- Filtros por zona, status ativo/inativo
- Controle de configurações de qualidade, FPS e detecção de movimento
- Monitoramento de status de conexão
- Estatísticas por zona e status

### Processamento de Eventos
- Consumo automático de eventos do Kafka
- Processamento e armazenamento de imagens no MinIO
- Persistência de dados no MongoDB e ClickHouse
- Geração de URLs assinadas para visualização de imagens
- Consultas otimizadas com filtros e paginação

### APIs de Consulta
- Timeline de eventos com agrupamento por período
- Estatísticas detalhadas por tipo de evento
- Filtros por câmera, data e tipo de evento
- Suporte a consultas tanto no MongoDB quanto ClickHouse

## Pré-requisitos

- Node.js >= 18.0.0
- MongoDB >= 5.0
- ClickHouse >= 22.0
- Apache Kafka >= 2.8
- MinIO ou serviço S3 compatível

## Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd API-Cameras
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações específicas:

```env
# Configuração do servidor
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/camera_surveillance

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=camera-api
KAFKA_GROUP_ID=camera-events-consumer
KAFKA_TOPIC=device-events

# ClickHouse
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_DATABASE=surveillance
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET_NAME=camera-events
MINIO_USE_SSL=false
```

4. Inicie os serviços de infraestrutura:

**MongoDB:**
```bash
# Com Docker
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Ou instalação local conforme documentação oficial
```

**ClickHouse:**
```bash
# Com Docker
docker run -d --name clickhouse -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server:latest
```

**Kafka:**
```bash
# Com Docker Compose (incluso no projeto)
docker-compose up -d kafka zookeeper
```

**MinIO:**
```bash
# Com Docker
docker run -d --name minio \
  -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ACCESS_KEY=minio" \
  -e "MINIO_SECRET_KEY=minio123" \
  minio/minio server /data --console-address ":9001"
```

## Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Testes
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Estrutura do Projeto

```
src/
├── config/          # Configurações de banco e serviços
├── controllers/     # Controladores das rotas
├── middleware/      # Middlewares personalizados
├── models/          # Modelos do Mongoose
├── routes/          # Definições de rotas
├── services/        # Serviços para integração externa
├── utils/           # Utilitários e validadores
└── server.js        # Arquivo principal da aplicação
```

## Documentação da API

### Endpoint Base
```
http://localhost:3000/api
```

### Câmeras

#### Listar câmeras
```http
GET /api/cameras?zona=string&ativo=boolean&page=1&limit=10&sort=nome
```

#### Criar câmera
```http
POST /api/cameras
Content-Type: application/json

{
  "nome": "Câmera Portão Principal",
  "cameraID": "camera-001",
  "zona": "entrada",
  "enderecoRTSP": "rtsp://192.168.1.100:554/stream1",
  "configuracoes": {
    "qualidade": "alta",
    "fps": 30,
    "detectarMovimento": true,
    "sensibilidade": 7
  }
}
```

#### Atualizar câmera
```http
PUT /api/cameras/:id
Content-Type: application/json

{
  "nome": "Câmera Portão Principal - Atualizada",
  "ativo": true
}
```

#### Obter câmera por ID
```http
GET /api/cameras/:id
```

#### Obter câmera por cameraID
```http
GET /api/cameras/by-camera-id/:cameraId
```

#### Remover câmera
```http
DELETE /api/cameras/:id
```

#### Estatísticas de câmeras
```http
GET /api/cameras/estatisticas
```

### Eventos

#### Listar eventos
```http
GET /api/events?cameraId=string&dataInicio=2023-01-01&dataFim=2023-12-31&page=1&limit=50
```

#### Obter evento específico
```http
GET /api/events/:eventId
```

#### URL assinada para imagem
```http
GET /api/events/:eventId/image-url?expiry=3600
```

#### Estatísticas de eventos
```http
GET /api/events/estatisticas?cameraId=camera-001&dataInicio=2023-01-01
```

#### Timeline de eventos
```http
GET /api/events/timeline?intervalo=hour&cameraId=camera-001&dataInicio=2023-01-01
```

#### Eventos recentes
```http
GET /api/events/recentes?limite=10
```

## Formato de Evento Kafka

A API consome eventos do tópico Kafka configurado. O formato esperado é:

```json
{
  "eventId": "uuid-opcional",
  "cameraId": "camera-001",
  "timestamp": "2023-10-01T12:00:00.000Z",
  "tipoEvento": "movimento",
  "confianca": 0.85,
  "coordenadas": {
    "x": 100,
    "y": 200,
    "largura": 150,
    "altura": 100
  },
  "imageData": "base64-encoded-image-data",
  "imageMimeType": "image/jpeg"
}
```

## Monitoramento e Logs

A aplicação utiliza Winston para logging estruturado. Os logs são salvos em:
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs
- Console (em desenvolvimento)

### Health Check
```http
GET /health
```

Retorna o status da aplicação e tempo de execução.

## Segurança

- Rate limiting configurado (100 requests/15min por IP)
- Helmet.js para headers de segurança
- Validação rigorosa de entrada com Joi
- Sanitização de dados
- Logs de auditoria

## Performance

- Índices otimizados no MongoDB
- Consultas eficientes no ClickHouse
- Compressão gzip habilitada
- Pool de conexões configurado
- TTL automático para limpeza de dados antigos

## Manutenção

### Limpeza de eventos antigos
```http
DELETE /api/events/cleanup?diasAntigos=30&dryRun=true
```

### Backup
- MongoDB: Use mongodump/mongorestore
- ClickHouse: Use clickhouse-backup ou exportação nativa
- MinIO: Use mc (MinIO Client) ou AWS CLI

## Troubleshooting

### Problemas Comuns

1. **Erro de conexão com MongoDB:**
   - Verifique se o MongoDB está rodando
   - Confirme a string de conexão no .env

2. **Kafka não está consumindo:**
   - Verifique se o tópico existe
   - Confirme as configurações de broker

3. **ClickHouse não está respondendo:**
   - Verifique se o serviço está ativo na porta 8123
   - Confirme credenciais de acesso

4. **MinIO não está acessível:**
   - Verifique se está rodando na porta configurada
   - Confirme access key e secret key

### Logs de Debug

Para habilitar logs detalhados, configure:
```env
LOG_LEVEL=debug
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Consulte o arquivo LICENSE para mais detalhes.

## Suporte

Para dúvidas ou problemas:
- Abra uma issue no repositório
- Consulte a documentação das dependências
- Verifique os logs da aplicação em `logs/`

## Versioning

Utilizamos [SemVer](http://semver.org/) para versionamento. Para ver as versões disponíveis, consulte as [tags do repositório](tags).