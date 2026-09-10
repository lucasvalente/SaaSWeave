#!/usr/bin/env bash
set -e

VPS_HOST="${1:-37.60.237.117}"
REPO_URL="https://github.com/lucasvalente/SaaSWeave.git"
APP_DIR="/root/autuax"

echo "========================================================"
echo " Conectando à VPS ($VPS_HOST) para realizar o deploy..."
echo "========================================================"

ssh -o StrictHostKeyChecking=accept-new "$VPS_HOST" "bash -s" << 'EOF'
set -e

APP_DIR="/root/autuax"
REPO_URL="https://github.com/lucasvalente/SaaSWeave.git"

echo ">>> [1/5] Verificando Docker e Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

echo ">>> [2/5] Atualizando repositório AUTUAX..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo ">>> [3/5] Configurando ambiente de produção (.env.production)..."
if [ ! -f .env.production ]; then
    cp .env.production.example .env.production
    POSTGRES_PWD=$(openssl rand -hex 16)
    REDIS_PWD=$(openssl rand -hex 16)
    sed -i "s/defina_uma_senha_forte_aqui_para_o_postgres/$POSTGRES_PWD/g" .env.production
    sed -i "s/defina_uma_senha_forte_aqui_para_o_redis/$REDIS_PWD/g" .env.production
    echo ".env.production criado com senhas criptograficamente seguras geradas automaticamente."
fi

echo ">>> [4/5] Executando build e subindo containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --remove-orphans

echo ">>> [5/5] Verificando containers em execução..."
docker compose -f docker-compose.prod.yml ps

echo "========================================================"
echo " DEPLOY CONCLUÍDO COM SUCESSO NA VPS!"
echo " Site Frontend: http://$(hostname -I | awk '{print $1}'):80"
echo " Backend API:   http://$(hostname -I | awk '{print $1}'):3333/health"
echo "========================================================"
EOF
