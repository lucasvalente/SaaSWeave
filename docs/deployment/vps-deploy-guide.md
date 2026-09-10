# Guia de Deploy em Produção na VPS — AUTUAX

Este guia descreve os passos práticos para colocar a plataforma AUTUAX em execução na sua VPS Linux utilizando Docker e Docker Compose.

---

## 1. Requisitos Mínimos da VPS

- **Sistema Operacional:** Ubuntu 22.04 / 24.04 LTS ou Debian 12.
- **Hardware Recomendado:** 2 vCPUs, 2 GB RAM (mínimo), 20 GB SSD.
- **Softwares no Host:**
  - `git`
  - `docker` (versão 24+ ou Docker Engine oficial)
  - `docker compose` (plugin versão 2+)

---

## 2. Passo a Passo do Deploy

### Passo 1: Obter o Código na VPS
Na sua máquina VPS, clone o repositório ou faça upload dos arquivos:
```bash
git clone <URL_DO_SEU_REPOSITORIO> autuax
cd autuax
```

### Passo 2: Configurar o Arquivo de Ambiente de Produção
Copie o modelo de exemplo para `.env.production`:
```bash
cp .env.production.example .env.production
```

Edite o arquivo `.env.production` com um editor de sua preferência (`nano .env.production`):
```env
NODE_ENV=production
APP_VERSION=0.1.0
LOG_LEVEL=info

API_PORT=3333
WEB_PORT=80

POSTGRES_DB=autuax
POSTGRES_USER=autuax
POSTGRES_PASSWORD=gere_uma_senha_muito_forte_aqui
REDIS_PASSWORD=gere_outra_senha_muito_forte_aqui
```

> **Atenção:** Nunca compartilhe nem suba o arquivo `.env.production` para repositórios públicos.

---

### Passo 3: Construir e Iniciar os Serviços
Execute o comando do Docker Compose para construir as imagens e iniciar os containers em segundo plano:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Os seguintes 5 serviços serão orquestrados:
1. **`postgres`** (PostgreSQL 16 Alpine com volume persistente).
2. **`redis`** (Redis 7 Alpine com senha e persistência AOF).
3. **`api`** (Backend HTTP Hono com Bun na porta 3333).
4. **`worker`** (Daemon assíncrono em Bun conectado a Postgres e Redis).
5. **`web`** (Frontend React 19 servido com Nginx de alta performance na porta 80).

---

### Passo 4: Verificar a Saúde dos Containers
Confira o status de todos os containers:
```bash
docker compose -f docker-compose.prod.yml ps
```
Todos os serviços devem estar listados como `running` (e `healthy`).

Para testar a resposta da API diretamente na VPS:
```bash
curl http://localhost:3333/health
curl http://localhost:3333/health/live
curl http://localhost:3333/health/ready
```

Para testar o frontend:
```bash
curl -I http://localhost:80/
```

---

### Passo 5: Acompanhar os Logs
Para monitorar a saída de todos os serviços em tempo real:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

Para monitorar apenas a API ou o Worker:
```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker
```

---

### Passo 6: Atualizações Futuras
Quando houver atualizações no código, basta rodar na VPS:
```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```
O Docker irá reconstruir apenas as camadas modificadas sem perda de dados do banco de dados ou do Redis.
