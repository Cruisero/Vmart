#!/bin/bash
# 数据库备份脚本
# 每天自动备份MySQL数据库并发送到指定邮箱

BACKUP_DIR="/var/www/haodongxi/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/haodongxi_${DATE}.sql"

# 邮件配置
SMTP_HOST="smtp.qiye.aliyun.com"
SMTP_PORT="465"
SMTP_USER="noreply@haodongxi.shop"
SMTP_PASS="Pure31415926."
TO_EMAIL="support@haodongxi.shop"
SENDER_NAME="HaoDongXi数据库备份"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 导出数据库
docker exec haodongxi-mysql mysqldump -u root -pRoot2026! haodongxi > $BACKUP_FILE

if [ $? -eq 0 ] && [ -s $BACKUP_FILE ]; then
    # 压缩备份
    gzip $BACKUP_FILE
    GZIP_FILE="${BACKUP_FILE}.gz"
    FILE_SIZE=$(du -h $GZIP_FILE | cut -f1)
    echo "$(date): Backup completed: ${GZIP_FILE} (${FILE_SIZE})"

    # 发送邮件（附带备份文件）
    python3 -c "
import smtplib, os, sys
from email.message import EmailMessage
from email.utils import formatdate

smtp_host = '${SMTP_HOST}'
smtp_port = int('${SMTP_PORT}')
smtp_user = '${SMTP_USER}'
smtp_pass = '${SMTP_PASS}'
to_email = '${TO_EMAIL}'
sender_name = '${SENDER_NAME}'
date = '${DATE}'
filepath = '${GZIP_FILE}'
filename = os.path.basename(filepath)
file_size = '${FILE_SIZE}'

msg = EmailMessage()
msg['Subject'] = f'[HaoDongXi] 数据库备份 - {date}'
msg['From'] = f'{sender_name} <{smtp_user}>'
msg['To'] = to_email
msg['Date'] = formatdate(localtime=True)
msg.set_content(f'HaoDongXi 数据库自动备份\\n\\n备份时间: $(date)\\n文件大小: {file_size}\\n文件名: {filename}\\n\\n此邮件由系统自动发送。')

if os.path.exists(filepath):
    with open(filepath, 'rb') as f:
        msg.add_attachment(f.read(), maintype='application', subtype='gzip', filename=filename)

try:
    with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
except Exception as e:
    sys.stderr.write(f'Email FAILED: {e}\\n')
    sys.exit(1)
" >> ${BACKUP_DIR}/email.log 2>&1

    if [ $? -eq 0 ]; then
        echo "$(date): Backup email sent to $TO_EMAIL"
    else
        echo "$(date): Backup email FAILED"
    fi

    # 删除30天前的备份
    find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
else
    echo "$(date): Backup FAILED"
    rm -f $BACKUP_FILE
    exit 1
fi
