#!/bin/bash

# Kashop 本地一键部署脚本
# 用法: ./deploy-local.sh [frontend|backend|all]

set -e

# 配置
SERVER="root@159.195.71.45"
REMOTE_PATH="/var/www/haodongxi"
COMPOSE_FILE="docker-compose.prod.yml"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 部署前端
deploy_frontend() {
    info "同步前端文件到服务器..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        frontend/ ${SERVER}:${REMOTE_PATH}/frontend/
    
    info "重新构建前端 Docker 镜像..."
    ssh -o ServerAliveInterval=15 ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache frontend"
    
    info "重启前端容器..."
    ssh -o ServerAliveInterval=15 ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d frontend"
    
    success "前端部署完成！"
}

# 部署后端
deploy_backend() {
    info "同步后端文件到服务器..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'uploads' \
        backend/ ${SERVER}:${REMOTE_PATH}/backend/
    
    info "重新构建后端 Docker 镜像..."
    ssh -o ServerAliveInterval=15 ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache backend"
    
    info "重启后端容器..."
    ssh -o ServerAliveInterval=15 ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d backend"
    
    success "后端部署完成！"
}

# 部署全部
deploy_all() {
    info "同步所有文件到服务器..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude 'uploads' \
        --exclude '.env' \
        ./ ${SERVER}:${REMOTE_PATH}/
    
    info "重新构建所有 Docker 镜像..."
    ssh -o ServerAliveInterval=15 ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache"
    
    info "重启所有容器..."
    ssh -o ServerAliveInterval=15 ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d"
    
    success "全部部署完成！"
}

# 显示帮助
show_help() {
    echo "Kashop 本地一键部署脚本"
    echo ""
    echo "用法: ./deploy-local.sh [选项]"
    echo ""
    echo "选项:"
    echo "  frontend  仅部署前端"
    echo "  backend   仅部署后端"
    echo "  all       部署全部 (默认)"
    echo "  help      显示帮助"
    echo ""
    echo "示例:"
    echo "  ./deploy-local.sh frontend   # 仅部署前端"
    echo "  ./deploy-local.sh backend    # 仅部署后端"
    echo "  ./deploy-local.sh            # 部署全部"
}

# 主逻辑
main() {
    echo ""
    echo "=========================================="
    echo "     Kashop 生产环境部署脚本"
    echo "=========================================="
    echo ""
    
    case "${1:-frontend}" in
        frontend|f)
            deploy_frontend
            ;;
        backend|b)
            deploy_backend
            ;;
        all|a)
            deploy_all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "未知选项: $1\n使用 './deploy-local.sh help' 查看帮助"
            ;;
    esac
    
    echo ""
    info "部署地址: https://haodongxi.shop"
    echo ""
}

main "$@"
