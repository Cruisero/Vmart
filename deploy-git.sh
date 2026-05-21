#!/bin/bash

# Vmart Git 增量部署脚本
# 用法: ./deploy-git.sh [all|frontend|backend]

set -euo pipefail

SERVER="${SERVER:-root@159.195.71.45}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/vmart}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_URL="${REPO_URL:-$(git -C "$SCRIPT_DIR" remote get-url origin)}"
SERVER_REPO_URL="${SERVER_REPO_URL:-${REPO_URL}}"
DEFAULT_BRANCH="$(git -C "$SCRIPT_DIR" branch --show-current)"
BRANCH="${2:-${BRANCH:-${DEFAULT_BRANCH:-main}}}"
MODE="${1:-all}"
SSH_OPTS="${SSH_OPTS:--o ServerAliveInterval=15 -o StrictHostKeyChecking=no}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

shell_quote() {
    printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

normalize_server_repo_url() {
    case "$1" in
        git@github-cruisero-443:*)
            printf '%s\n' "git@github.com:${1#*:}"
            ;;
        ssh://git@github-cruisero-443/*)
            printf '%s\n' "ssh://git@github.com/${1#ssh://git@github-cruisero-443/}"
            ;;
        *)
            printf '%s\n' "$1"
            ;;
    esac
}

auto_commit_and_push() {
    local current_branch dirty commit_msg
    current_branch="$(git -C "$SCRIPT_DIR" rev-parse --abbrev-ref HEAD)"
    dirty="$(git -C "$SCRIPT_DIR" status --porcelain)"

    if ! git -C "$SCRIPT_DIR" config user.name >/dev/null; then
        git -C "$SCRIPT_DIR" config user.name "Codex Deploy"
    fi
    if ! git -C "$SCRIPT_DIR" config user.email >/dev/null; then
        git -C "$SCRIPT_DIR" config user.email "codex@local"
    fi

    if [ -n "$dirty" ]; then
        info "提交本地变更并推送到 GitHub..."
        git -C "$SCRIPT_DIR" add -A
        if ! git -C "$SCRIPT_DIR" diff --cached --quiet; then
            commit_msg="deploy: auto sync $(date +'%Y-%m-%d %H:%M:%S')"
            git -C "$SCRIPT_DIR" commit -m "$commit_msg"
        fi
    else
        info "本地没有未提交变更，直接推送当前分支..."
    fi

    if ! git -C "$SCRIPT_DIR" push origin "HEAD:${current_branch}"; then
        warning "直接推送失败，尝试先 rebase 再推送..."
        git -C "$SCRIPT_DIR" pull --rebase origin "$current_branch"
        git -C "$SCRIPT_DIR" push origin "HEAD:${current_branch}"
    fi
}

remote_git_update() {
    local remote_repo remote_branch remote_path remote_compose
    remote_repo="$(shell_quote "$REPO_URL")"
    remote_branch="$(shell_quote "$BRANCH")"
    remote_path="$(shell_quote "$REMOTE_PATH")"
    remote_compose="$(shell_quote "$COMPOSE_FILE")"
    remote_server_repo="$(shell_quote "$(normalize_server_repo_url "$SERVER_REPO_URL")")"

    info "通过 git 更新服务器代码: ${REPO_URL} @ ${BRANCH}"

    ssh ${SSH_OPTS} "${SERVER}" "REPO_URL=${remote_repo} SERVER_REPO_URL=${remote_server_repo} BRANCH=${remote_branch} REMOTE_PATH=${remote_path} COMPOSE_FILE=${remote_compose} bash -s" <<'EOF'
set -e

if [ -d "$REMOTE_PATH/.git" ]; then
    cd "$REMOTE_PATH"
    git remote set-url origin "$SERVER_REPO_URL"
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    preserve_tmp="$(mktemp -d)"
    mkdir -p "$REMOTE_PATH"
    for path in backend/uploads backend/backups .env backend/.env; do
        if [ -e "$REMOTE_PATH/$path" ]; then
            mkdir -p "$preserve_tmp/$(dirname "$path")"
            cp -a "$REMOTE_PATH/$path" "$preserve_tmp/$path"
        fi
    done

    find "$REMOTE_PATH" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    git clone --branch "$BRANCH" --single-branch "$SERVER_REPO_URL" "$REMOTE_PATH"

    for path in backend/uploads backend/backups .env backend/.env; do
        if [ -e "$preserve_tmp/$path" ]; then
            mkdir -p "$REMOTE_PATH/$(dirname "$path")"
            cp -a "$preserve_tmp/$path" "$REMOTE_PATH/$path"
        fi
    done

    rm -rf "$preserve_tmp"
fi

git clean -fd -e backend/uploads -e backend/backups -e .env
git status --short
EOF

    success "git 增量更新完成"
}

deploy_frontend() {
    auto_commit_and_push
    remote_git_update
    info "重建前端并重启容器..."
    ssh ${SSH_OPTS} "${SERVER}" "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build frontend && docker compose -f ${COMPOSE_FILE} up -d frontend"
    success "前端已更新"
}

deploy_backend() {
    auto_commit_and_push
    remote_git_update
    info "重建后端并重启容器..."
    ssh ${SSH_OPTS} "${SERVER}" "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build backend && docker compose -f ${COMPOSE_FILE} up -d backend"
    success "后端已更新"
}

deploy_all() {
    auto_commit_and_push
    remote_git_update
    info "重建前后端并重启容器..."
    ssh ${SSH_OPTS} "${SERVER}" "cd ${REMOTE_PATH} && docker compose -f ${COMPOSE_FILE} build frontend backend && docker compose -f ${COMPOSE_FILE} up -d frontend backend"
    success "前后端已更新"
}

show_help() {
    cat <<EOF
Vmart Git 增量部署脚本

用法:
  ./deploy-git.sh [all|frontend|backend]

示例:
  ./deploy-git.sh
  ./deploy-git.sh backend
  ./deploy-git.sh all

说明:
  - 本地如果有未提交改动，会自动 add / commit / push 到 GitHub
  - 服务器端首次会先保留 uploads/backups/.env，再初始化为 git 工作区
  - 之后只执行 git fetch + git reset --hard origin/<branch>
  - 不会像 rsync 那样整目录删除再上传
EOF
}

main() {
    case "${MODE}" in
        all|a)
            deploy_all
            ;;
        frontend|f)
            deploy_frontend
            ;;
        backend|b)
            deploy_backend
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "未知选项: ${MODE}"
            ;;
    esac

    echo ""
    info "部署地址: https://vmart.cc"
}

main "$@"
