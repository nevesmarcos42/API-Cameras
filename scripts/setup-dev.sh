#!/bin/bash

# Script de inicialização rápida para desenvolvimento
# Este script configura o ambiente de desenvolvimento com Docker

set -e  # Sai se algum comando falhar

echo "🚀 Iniciando ambiente de desenvolvimento da API de Câmeras..."

# Verifica se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Verifica se Docker Compose está disponível
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instalando..."
    # Instruções para instalar docker-compose dependem do SO
    echo "Por favor, instale o Docker Compose manualmente."
    exit 1
fi

echo "📦 Parando containers existentes (se houver)..."
docker-compose down --remove-orphans

echo "🧹 Limpando volumes antigos..."
docker-compose down -v

echo "🔧 Construindo e iniciando serviços..."
docker-compose up -d

echo "⏳ Aguardando serviços ficarem prontos..."

# Aguarda MongoDB
echo "📊 Aguardando MongoDB..."
while ! docker exec camera-mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; do
    echo "   Aguardando MongoDB..."
    sleep 2
done
echo "✅ MongoDB pronto"

# Aguarda ClickHouse
echo "📊 Aguardando ClickHouse..."
while ! curl -s http://localhost:8123/ping > /dev/null 2>&1; do
    echo "   Aguardando ClickHouse..."
    sleep 2
done
echo "✅ ClickHouse pronto"

# Aguarda MinIO
echo "📦 Aguardando MinIO..."
while ! curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; do
    echo "   Aguardando MinIO..."
    sleep 2
done
echo "✅ MinIO pronto"

# Aguarda Kafka
echo "📨 Aguardando Kafka..."
sleep 10  # Kafka demora um pouco mais para ficar pronto
echo "✅ Kafka pronto"

echo "📄 Verificando se .env existe..."
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env a partir do .env.example..."
    cp .env.example .env
    echo "⚠️  Por favor, revise o arquivo .env se necessário"
fi

echo "📦 Instalando dependências npm..."
npm install

echo "🧪 Criando tópico Kafka..."
docker exec camera-kafka kafka-topics --create --topic device-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1 --if-not-exists

echo "🎉 Ambiente de desenvolvimento pronto!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Inicie a aplicação: npm run dev"
echo "   2. Teste a API: node scripts/test-api.js"
echo "   3. Acesse interfaces web:"
echo "      - Kafka UI: http://localhost:8080"
echo "      - MinIO Console: http://localhost:9001 (admin/admin123)"
echo ""
echo "🔗 Endpoints da API:"
echo "   - Health Check: http://localhost:3000/health"
echo "   - Câmeras: http://localhost:3000/api/cameras"
echo "   - Eventos: http://localhost:3000/api/events"
echo ""
echo "⚡ Para parar tudo: docker-compose down"