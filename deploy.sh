#!/bin/bash

# Kashop 本地一键部署脚本
# 用法: ./deploy.sh [frontend|backend|all|migrate|backup|help]

set -e

# 配置
SERVER="root@159.195.71.45"
REMOTE_PATH="/var/www/haodongxi"
COMPOSE_FILE="docker-compose.prod.yml"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSH_OPTS="-o ServerAliveInterval=15 -o StrictHostKeyChecking=no"

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

# ============================================================
# 安全函数
# ============================================================

# 远程备份数据库（部署后端前自动执行）
backup_database() {
    local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local BACKUP_FILE="backup_${TIMESTAMP}.sql"

    info "📦 备份生产数据库 -> ${BACKUP_FILE} ..."
    
    # 确保备份目录存在
    ssh ${SSH_OPTS} ${SERVER} "mkdir -p ${REMOTE_PATH}/backend/backups" 2>/dev/null

    # 使用直接密码避免 shell 转义问题，加超时防止挂起
    ssh ${SSH_OPTS} -o ConnectTimeout=10 ${SERVER} "cd ${REMOTE_PATH} && \
        docker compose -f ${COMPOSE_FILE} exec -T mysql \
        mysqldump -uhaodongxi -pHaoDongXi2026! \
        --single-transaction --routines --triggers haodongxi \
        > backend/backups/${BACKUP_FILE} 2>/dev/null" &
    local SSH_PID=$!
    local WAIT_COUNT=0
    while kill -0 $SSH_PID 2>/dev/null; do
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
        if [ $WAIT_COUNT -ge 120 ]; then
            kill $SSH_PID 2>/dev/null
            warning "备份超时（120秒），跳过备份继续部署"
            return 0
        fi
    done
    wait $SSH_PID 2>/dev/null

    if [ $? -eq 0 ]; then
        success "数据库已备份: backend/backups/${BACKUP_FILE}"
    else
        warning "数据库备份失败或超时，但继续部署（请检查服务器备份目录）"
    fi
}

# 保护服务器的 prisma schema（先保存，rsync 后恢复）
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

# ============================================================
# 部署函数
# ============================================================

# 部署前端
deploy_frontend() {
    info "同步前端文件到服务器..."
    rsync -avz --delete \
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

# 部署后端
deploy_backend() {
    # 1. 自动备份数据库
    backup_database

    # 2. 保存服务器当前 schema
    preserve_server_schema

    # 3. 同步代码（排除 prisma 目录，避免覆盖生产 schema）
    info "同步后端文件到服务器..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'uploads' \
        --exclude 'backups' \
        --exclude 'prisma/schema.prisma' \
        --exclude '.env' \
        ${SCRIPT_DIR}/backend/ ${SERVER}:${REMOTE_PATH}/backend/

    # 4. 恢复服务器 schema（确保用的是生产版本）
    restore_server_schema
    
    # 5. 构建并重启
    info "重新构建后端 Docker 镜像..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache backend"
    
    info "重启后端容器..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d backend"

    # 6. 不再自动执行 prisma db push！
    # 如果需要变更数据库结构，请使用: ./deploy.sh migrate
    
    success "后端部署完成！"
}

# 部署全部
deploy_all() {
    # 1. 自动备份数据库
    backup_database

    # 2. 保存服务器当前 schema
    preserve_server_schema

    # 3. 同步所有文件
    info "同步所有文件到服务器..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude 'uploads' \
        --exclude 'backups' \
        --exclude '.env' \
        --exclude 'backend/prisma/schema.prisma' \
        ${SCRIPT_DIR}/ ${SERVER}:${REMOTE_PATH}/

    # 4. 恢复服务器 schema
    restore_server_schema

    # 5. 构建并重启
    info "重新构建所有 Docker 镜像..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache"
    
    info "重启所有容器..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d"

    info "等待服务就绪..."
    sleep 10

    # 不再自动执行 prisma db push！
    
    success "全部部署完成！"
}

# ============================================================
# 数据库迁移（手动触发，带完整安全检查）
# ============================================================
deploy_migrate() {
    echo ""
    warning "⚠️  你即将对生产数据库执行 Schema 变更！"
    warning "这可能会导致数据丢失或服务中断。"
    echo ""

    # 显示当前本地 schema 与服务器 schema 的差异
    info "📋 对比本地 Schema 与服务器 Schema 差异..."
    echo ""
    
    LOCAL_SCHEMA="${SCRIPT_DIR}/backend/prisma/schema.prisma"
    REMOTE_SCHEMA_TMP="/tmp/remote_schema_$(date +%s).prisma"
    
    # 下载服务器当前 schema
    scp ${SERVER}:${REMOTE_PATH}/backend/prisma/schema.prisma "${REMOTE_SCHEMA_TMP}" 2>/dev/null

    if [ -f "${REMOTE_SCHEMA_TMP}" ]; then
        DIFF_OUTPUT=$(diff --color=always "${REMOTE_SCHEMA_TMP}" "${LOCAL_SCHEMA}" 2>/dev/null || true)
        if [ -z "${DIFF_OUTPUT}" ]; then
            success "本地 Schema 与服务器完全一致，无需迁移。"
            rm -f "${REMOTE_SCHEMA_TMP}"
            return 0
        fi
        echo "${DIFF_OUTPUT}"
        echo ""
        rm -f "${REMOTE_SCHEMA_TMP}"
    else
        warning "无法获取服务器 Schema，请手动确认差异"
    fi

    # 二次确认
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  确认要将以上变更应用到生产数据库吗？  ${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    read -p "输入 'YES' 确认执行迁移（其他输入取消）: " CONFIRM
    
    if [ "${CONFIRM}" != "YES" ]; then
        info "已取消迁移操作。"
        return 0
    fi

    # 执行前备份
    backup_database

    # 上传本地 schema 到服务器
    info "上传本地 Schema 到服务器..."
    scp "${LOCAL_SCHEMA}" ${SERVER}:${REMOTE_PATH}/backend/prisma/schema.prisma

    # 重新构建后端（使用新 schema 生成 Prisma Client）
    info "重新构建后端镜像..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build --no-cache backend"
    
    info "重启后端容器..."
    ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} up -d backend"

    sleep 5

    # 执行安全模式的 prisma db push（不带 --accept-data-loss）
    info "执行数据库迁移（安全模式，如有数据丢失风险会中止）..."
    ssh -t ${SSH_OPTS} ${SERVER} "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} exec backend npx prisma db push"
    
    if [ $? -eq 0 ]; then
        success "✅ 数据库迁移成功完成！"
    else
        error "❌ 数据库迁移失败！请检查服务器日志。数据库已在迁移前备份。"
    fi
}

# 仅备份
deploy_backup() {
    backup_database
}

# 显示帮助
show_help() {
    echo "Kashop 一键部署脚本（安全版）"
    echo ""
    echo "用法: ./deploy.sh [选项]"
    echo ""
    echo "部署选项:"
    echo "  frontend    仅部署前端"
    echo "  backend     仅部署后端（自动备份 DB，保护 Schema）"
    echo "  all         部署全部（自动备份 DB，保护 Schema）"
    echo ""
    echo "数据库选项:"
    echo "  migrate     执行数据库 Schema 迁移（需手动确认）"
    echo "  backup      仅备份生产数据库"
    echo ""
    echo "其他:"
    echo "  help        显示帮助"
    echo ""
    echo "安全机制:"
    echo "  ✅ 部署后端时自动备份数据库"
    echo "  ✅ 部署时保留服务器的 Prisma Schema（不会被本地开发版覆盖）"
    echo "  ✅ 数据库迁移需要手动执行 ./deploy.sh migrate 并二次确认"
    echo "  ✅ 迁移前显示 Schema 差异，不使用 --accept-data-loss"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh frontend    # 仅部署前端"
    echo "  ./deploy.sh backend     # 仅部署后端（安全）"
    echo "  ./deploy.sh all         # 部署全部（安全）"
    echo "  ./deploy.sh migrate     # 手动迁移数据库 Schema"
    echo "  ./deploy.sh backup      # 仅备份数据库"
}

# 主逻辑
main() {
    echo ""
    echo "=========================================="
    echo "     🚀 Kashop 生产环境部署（安全版）"
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
    info "部署地址: https://haodongxi.shop"
    echo ""
}

main "$@"
