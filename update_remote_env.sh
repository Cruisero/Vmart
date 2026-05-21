#!/bin/bash

# 配置（引用 deploy.sh 的成功连接参数）
SERVER="root@159.195.71.45"
REMOTE_PATH="/var/www/vmart"
COMPOSE_FILE="docker-compose.prod.yml"
SSH_OPTS="-o ServerAliveInterval=15 -o StrictHostKeyChecking=no -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=10m"

echo "=================================================="
echo "🎯 正在将 Cloudflare 凭证一键写入您的远程服务器..."
echo "=================================================="

# 写入配置
ssh ${SSH_OPTS} ${SERVER} "cat >> ${REMOTE_PATH}/backend/.env << 'EOF'

# Cloudflare Custom Hostnames (SaaS) Integration
CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}
CLOUDFLARE_ZONE_ID=8ef3bfdd2138f359574fc06345b30715
CLOUDFLARE_FALLBACK_ORIGIN=fallback.vmart.cc
EOF
"

echo "✅ 配置写入成功！"
echo "=================================================="
echo "🔄 正在重启远程服务器上的后端容器..."
echo "=================================================="

# 重启容器
ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} restart backend"

echo "=================================================="
echo "🎉 远程服务器配置更新并重启完毕！"
echo "=================================================="
