# Projeto API de Câmeras

## Visão Geral
API RESTful construída com Node.js, Express e MongoDB (via Mongoose) para gerenciar câmeras, permitindo operações CRUD completas.

## Funcionalidades Implementadas
- Configuração modular da conexão MongoDB em `config/db.js`.
- Endpoints REST para CRUD de câmeras:
  - POST /api/cameras – criar nova câmera
  - GET /api/cameras – listar todas as câmeras
  - GET /api/cameras/:cameraID – obter câmera por ID customizado
  - PUT /api/cameras/:cameraID – atualizar dados da câmera
  - DELETE /api/cameras/:cameraID – deletar câmera
- Tratamento de erros e validações básicas.
- Parâmetro de rota unificado `cameraID` para acesso consistente.

## Estrutura do Projeto
- `app.js` – ponto de entrada da aplicação.
- `config/db.js` – configuração da conexão com MongoDB.
- `src/controllers/` – lógica dos endpoints.
- `src/routes/` – rotas da aplicação.
- `src/models/` – esquemas Mongoose.

## Como rodar
1. Clonar repositório e instalar dependências: `npm install`
2. Configurar `.env` com `MONGODB_URL`
3. Iniciar servidor: `npm start` ou `nodemon app.js`
4. Testar API com Postman, curl ou similar.

## Próximos Passos
- Autenticação e autorização.
- Testes automatizados.
- Integração com Kafka para eventos.
- Documentação Swagger/OpenAPI.

---

Este README será atualizado conforme o projeto evolui para manter organização e facilitar o onboarding de colaboradores.
