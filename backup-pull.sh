#!/bin/bash
# 本地一键拉取服务器备份脚本

SERVER="root@159.195.71.45"
REMOTE_BACKUP_DIR="/var/www/haodongxi/backups"
LOCAL_BACKUP_DIR="./backups"

# 创建本地备份目录
mkdir -p $LOCAL_BACKUP_DIR

echo "📦 正在获取服务器备份列表..."

# 获取最新备份文件名
LATEST_BACKUP=$(ssh -o ConnectTimeout=10 $SERVER "ls -t $REMOTE_BACKUP_DIR/*.sql.gz 2>/dev/null | head -1")

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ 服务器上没有找到备份文件"
    echo ""
    echo "正在创建新的备份..."
    ssh -o ConnectTimeout=10 $SERVER "bash $REMOTE_BACKUP_DIR/../backup-db.sh"
    LATEST_BACKUP=$(ssh -o ConnectTimeout=10 $SERVER "ls -t $REMOTE_BACKUP_DIR/*.sql.gz 2>/dev/null | head -1")
fi

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ 备份创建失败"
    exit 1
fi

FILENAME=$(basename $LATEST_BACKUP)
echo "📥 正在下载: $FILENAME"

# 下载备份文件
scp -o ConnectTimeout=10 $SERVER:$LATEST_BACKUP $LOCAL_BACKUP_DIR/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 备份已下载到: $LOCAL_BACKUP_DIR/$FILENAME"
    echo ""
    echo "📋 本地备份列表:"
    ls -lh $LOCAL_BACKUP_DIR/*.sql.gz 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'
    echo ""
    echo "💡 恢复命令: gunzip -c $LOCAL_BACKUP_DIR/$FILENAME | docker exec -i haodongxi-mysql mysql -u root -pRoot2026! haodongxi"
else
    echo "❌ 下载失败"
    exit 1
fi
