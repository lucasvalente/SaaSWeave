param(
    [string]$VpsHost = "37.60.237.117",
    [string]$VpsUser = "root"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Conectando à VPS ($VpsUser@$VpsHost)..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$remoteScript = @'
set -e

APP_DIR="/root/autuax"
REPO_URL="https://github.com/lucasvalente/SaaSWeave.git"

echo ">>> [1/5] Verificando Docker e Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
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
    echo ".env.production gerado com senhas seguras."
fi

echo ">>> [4/5] Executando build e subindo containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --remove-orphans

echo ">>> [5/5] Verificando status dos containers..."
docker compose -f docker-compose.prod.yml ps

echo "========================================================"
echo " DEPLOY CONCLUÍDO COM SUCESSO NA VPS!"
echo " Frontend Web: http://37.60.237.117:80"
echo " Backend API:   http://37.60.237.117:3333/health"
echo "========================================================"
'@

$remoteScript | ssh -o StrictHostKeyChecking=accept-new "$VpsUser@$VpsHost" "bash -s"
