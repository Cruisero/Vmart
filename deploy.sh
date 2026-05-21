#!/bin/bash

# Vmart 生产环境部署脚本（参考 Kashop 逻辑）
# 用法: ./deploy.sh [frontend|backend|all|migrate|backup|help]

set -e

SERVER="root@159.195.71.45"
REMOTE_PATH="/var/www/vmart"
COMPOSE_FILE="docker-compose.prod.yml"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSH_OPTS="-o ServerAliveInterval=15 -o StrictHostKeyChecking=no -o ControlMaster=auto -o ControlPath=/tmp/ssh-vmart-%r@%h:%p -o ControlPersist=10m"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }


backup_database() {
    local timestamp backup_file
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="backup_${timestamp}.sql"

    info "📦 备份生产数据库 -> ${backup_file} ..."
    ssh ${SSH_OPTS} ${SERVER} "mkdir -p ${REMOTE_PATH}/backend/backups" 2>/dev/null
    ssh ${SSH_OPTS} -o ConnectTimeout=10 ${SERVER} "cd ${REMOTE_PATH} && \
        docker compose -f ${COMPOSE_FILE} exec -T mysql \
        mysqldump -uhaodongxi -pHaoDongXi2026! \
        --single-transaction --routines --triggers haodongxi \
        > backend/backups/${backup_file} 2>/dev/null" &

    local ssh_pid=$!
    local wait_count=0
    while kill -0 $ssh_pid 2>/dev/null; do
        sleep 1
        wait_count=$((wait_count + 1))
        if [ $wait_count -ge 120 ]; then
            kill $ssh_pid 2>/dev/null
            warning "备份超时（120秒），跳过备份继续部署"
            return 0
        fi
    done

    local backup_status=0
    wait $ssh_pid 2>/dev/null || backup_status=$?
    if [ ${backup_status} -eq 0 ]; then
        success "数据库已备份: backend/backups/${backup_file}"
    else
        warning "数据库备份失败或超时，但继续部署（请检查服务器备份目录）"
    fi
}

preserve_server_schema() {
    info "🔒 保存服务器当前的 Prisma Schema..."
    ssh ${SSH_OPTS} ${SERVER} "cp ${REMOTE_PATH}/backend/prisma/schema.prisma ${REMOTE_PATH}/backend/prisma/schema.prisma.server.bak 2>/dev/null || true"
}

restore_server_schema() {
    info "🔒 恢复服务器的 Prisma Schema（不使用本地开发版本）..."
    ssh ${SSH_OPTS} ${SERVER} "if [ -f ${REMOTE_PATH}/backend/prisma/schema.prisma.server.bak ]; then \
        cp ${REMOTE_PATH}/backend/prisma/schema.prisma.server.bak ${REMOTE_PATH}/backend/prisma/schema.prisma && \
        rm -f ${REMOTE_PATH}/backend/prisma/schema.prisma.server.bak; \
    fi"
}

deploy_frontend() {
    info "同步前端文件到服务器..."
    rsync -avz --delete -e "ssh ${SSH_OPTS}" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        ${SCRIPT_DIR}/frontend/ ${SERVER}:${REMOTE_PATH}/frontend/

    info "重新构建前端 Docker 镜像..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache frontend"

    info "重启前端容器..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d frontend"

    success "前端部署完成！"
}

deploy_backend() {
    backup_database
    preserve_server_schema

    info "同步后端文件到服务器..."
    rsync -avz --delete -e "ssh ${SSH_OPTS}" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'uploads' \
        --exclude 'backups' \
        --exclude 'prisma/schema.prisma' \
        --exclude '.env' \
        ${SCRIPT_DIR}/backend/ ${SERVER}:${REMOTE_PATH}/backend/

    restore_server_schema

    info "重新构建后端 Docker 镜像..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache backend"

    info "重启后端容器..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d backend"

    success "后端部署完成！"
}

deploy_all() {
    backup_database
    preserve_server_schema

    info "同步所有文件到服务器..."
    rsync -avz --delete -e "ssh ${SSH_OPTS}" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude 'uploads' \
        --exclude 'backups' \
        --exclude '.env' \
        --exclude 'backend/prisma/schema.prisma' \
        ${SCRIPT_DIR}/ ${SERVER}:${REMOTE_PATH}/

    restore_server_schema

    info "重新构建所有 Docker 镜像..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache"

    info "重启所有容器..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d"

    info "等待服务就绪..."
    sleep 10

    success "全部部署完成！"
}

deploy_migrate() {
    echo ""
    warning "⚠️  你即将对生产数据库执行 Schema 变更！"
    warning "这可能会导致数据丢失或服务中断。"
    echo ""

    info "📋 对比本地 Schema 与服务器 Schema 差异..."
    echo ""

    local_schema="${SCRIPT_DIR}/backend/prisma/schema.prisma"
    remote_schema_tmp="/tmp/remote_schema_$(date +%s).prisma"

    scp ${SSH_OPTS} ${SERVER}:${REMOTE_PATH}/backend/prisma/schema.prisma "${remote_schema_tmp}" 2>/dev/null
    if [ -f "${remote_schema_tmp}" ]; then
        diff_output=$(diff --color=always "${remote_schema_tmp}" "${local_schema}" 2>/dev/null || true)
        if [ -z "${diff_output}" ]; then
            success "本地 Schema 与服务器完全一致，无需迁移。"
            rm -f "${remote_schema_tmp}"
            return 0
        fi
        echo "${diff_output}"
        echo ""
        rm -f "${remote_schema_tmp}"
    else
        warning "无法获取服务器 Schema，请手动确认差异"
    fi

    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  确认要将以上变更应用到生产数据库吗？  ${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    read -p "输入 'YES' 确认执行迁移（其他输入取消）: " confirm

    if [ "${confirm}" != "YES" ]; then
        info "已取消迁移操作。"
        return 0
    fi

    backup_database

    info "上传本地 Schema 到服务器..."
    scp ${SSH_OPTS} "${local_schema}" ${SERVER}:${REMOTE_PATH}/backend/prisma/schema.prisma

    info "重新构建后端镜像..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache backend"

    info "重启后端容器..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d backend"

    sleep 5

    info "执行数据库迁移（安全模式，如有数据丢失风险会中止）..."
    ssh -t ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} exec backend npx prisma db push"

    if [ $? -eq 0 ]; then
        success "✅ 数据库迁移成功完成！"
    else
        error "❌ 数据库迁移失败！请检查服务器日志。数据库已在迁移前备份。"
    fi
}

deploy_backup() {
    backup_database
}

show_help() {
    echo "Vmart 一键部署脚本（参考 Kashop）"
    echo ""
    echo "用法: ./deploy.sh [选项]"
    echo ""
    echo "部署选项:"
    echo "  frontend    仅部署前端"
    echo "  backend     仅部署后端"
    echo "  all         部署全部（默认）"
    echo ""
    echo "数据库选项:"
    echo "  migrate     执行数据库 Schema 迁移"
    echo "  backup      仅备份生产数据库"
    echo ""
    echo "其他:"
    echo "  help        显示帮助"
}

main() {
    echo ""
    echo "=========================================="
    echo "     🚀 Vmart 生产环境部署（参考 Kashop）"
    echo "=========================================="
    echo ""

    case "${1:-all}" in
        frontend|f)
            deploy_frontend
            ;;
        backend|b)
            deploy_backend
            ;;
        all|a)
            deploy_all
            ;;
        migrate|m)
            deploy_migrate
            ;;
        backup)
            deploy_backup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "未知选项: $1\n使用 './deploy.sh help' 查看帮助"
            ;;
    esac

    echo ""
    info "部署地址: https://vmart.cc"
    echo ""
}

main "$@"
