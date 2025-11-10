@echo off
REM Script de inicializacao rapida para desenvolvimento no Windows
REM Este script configura o ambiente de desenvolvimento com Docker

echo 🚀 Iniciando ambiente de desenvolvimento da API de Camaras...

REM Verifica se Docker esta rodando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker nao esta rodando. Por favor, inicie o Docker primeiro.
    exit /b 1
)

REM Verifica se Docker Compose esta disponivel
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose nao encontrado. Por favor, instale o Docker Desktop.
    exit /b 1
)

echo 📦 Parando containers existentes (se houver)...
docker-compose down --remove-orphans

echo 🧹 Limpando volumes antigos...
docker-compose down -v

echo 🔧 Construindo e iniciando servicos...
docker-compose up -d

echo ⏳ Aguardando servicos ficarem prontos...

REM Aguarda MongoDB
echo 📊 Aguardando MongoDB...
:wait_mongodb
docker exec camera-mongodb mongosh --eval "db.runCommand('ping')" >nul 2>&1
if %errorlevel% neq 0 (
    echo    Aguardando MongoDB...
    timeout /t 2 >nul
    goto wait_mongodb
)
echo ✅ MongoDB pronto

REM Aguarda ClickHouse
echo 📊 Aguardando ClickHouse...
:wait_clickhouse
curl -s http://localhost:8123/ping >nul 2>&1
if %errorlevel% neq 0 (
    echo    Aguardando ClickHouse...
    timeout /t 2 >nul
    goto wait_clickhouse
)
echo ✅ ClickHouse pronto

REM Aguarda MinIO
echo 📦 Aguardando MinIO...
:wait_minio
curl -s http://localhost:9000/minio/health/live >nul 2>&1
if %errorlevel% neq 0 (
    echo    Aguardando MinIO...
    timeout /t 2 >nul
    goto wait_minio
)
echo ✅ MinIO pronto

REM Aguarda Kafka
echo 📨 Aguardando Kafka...
timeout /t 10 >nul
echo ✅ Kafka pronto

echo 📄 Verificando se .env existe...
if not exist .env (
    echo 📝 Criando arquivo .env a partir do .env.example...
    copy .env.example .env >nul
    echo ⚠️  Por favor, revise o arquivo .env se necessario
)

echo 📦 Instalando dependencias npm...
npm install

echo 🧪 Criando topico Kafka...
docker exec camera-kafka kafka-topics --create --topic device-events --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1 --if-not-exists >nul 2>&1

echo.
echo 🎉 Ambiente de desenvolvimento pronto!
echo.
echo 📋 Proximos passos:
echo    1. Inicie a aplicacao: npm run dev
echo    2. Teste a API: node scripts/test-api.js
echo    3. Acesse interfaces web:
echo       - Kafka UI: http://localhost:8080
echo       - MinIO Console: http://localhost:9001 (admin/admin123)
echo.
echo 🔗 Endpoints da API:
echo    - Health Check: http://localhost:3000/health
echo    - Camaras: http://localhost:3000/api/cameras
echo    - Eventos: http://localhost:3000/api/events
echo.
echo ⚡ Para parar tudo: docker-compose down

pause