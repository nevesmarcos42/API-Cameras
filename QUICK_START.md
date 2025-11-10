# Início Rápido - API de Câmeras

## Opção 1: Usando Docker (Recomendado)

1. **Clone e configure:**
```bash
git clone <url-do-repo>
cd API-Cameras
```

2. **Execute o script de setup (Windows):**
```bash
.\scripts\setup-dev.bat
```

**Ou (Linux/Mac):**
```bash
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

3. **Inicie a aplicação:**
```bash
npm run dev
```

4. **Teste a API:**
```bash
node scripts/test-api.js
```

## Opção 2: Instalação Manual

### Pré-requisitos
- Node.js >= 18
- MongoDB
- ClickHouse
- Kafka + Zookeeper
- MinIO

### Configuração

1. **Instale dependências:**
```bash
npm install
```

2. **Configure ambiente:**
```bash
cp .env.example .env
# Edite .env com suas configurações
```

3. **Inicie serviços externos:**
```bash
# MongoDB
mongod

# ClickHouse
clickhouse-server

# Kafka (com Zookeeper)
# MinIO
```

4. **Inicie aplicação:**
```bash
npm run dev
```

## Testando

### Health Check
```bash
curl http://localhost:3000/health
```

### Criar Câmera
```bash
curl -X POST http://localhost:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Câmera Teste",
    "cameraID": "test-001",
    "zona": "entrada",
    "enderecoRTSP": "rtsp://192.168.1.100:554/stream1"
  }'
```

### Listar Câmeras
```bash
curl http://localhost:3000/api/cameras
```

## Interfaces Web

- **Kafka UI:** http://localhost:8080
- **MinIO Console:** http://localhost:9001 (admin/admin123)

## Logs

Verifique logs em tempo real:
```bash
tail -f logs/combined.log
```

## Parar Ambiente Docker

```bash
docker-compose down
```