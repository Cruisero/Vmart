#!/bin/bash
# Batch replace Chinese hardcoded strings in Dashboard with t() calls
FILE="/Users/bradpit/Code/Vmart/frontend/src/pages/Admin/Dashboard/index.jsx"

# Products page
sed -i '' 's/<h2>商品管理<\/h2>/<h2>{t('\''admin.products.title'\'')}<\/h2>/g' "$FILE"
sed -i '' 's/📁 分类管理/{t('\''admin.products.categories'\'')}/g' "$FILE"
sed -i '' 's/+ 添加商品/{t('\''admin.products.add'\'')}/g' "$FILE"
sed -i '' 's/<th>商品名称<\/th>/<th>{t('\''admin.products.table.name'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>价格<\/th>/<th>{t('\''admin.products.table.price'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>库存<\/th>/<th>{t('\''admin.products.table.stock'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>已售<\/th>/<th>{t('\''admin.products.table.sold'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>权重<\/th>/<th>{t('\''admin.products.table.weight'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>状态<\/th>/<th>{t('\''admin.common.status'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>操作<\/th>/<th>{t('\''admin.common.actions'\'')}<\/th>/g' "$FILE"
sed -i '' "s/'上架'/t('admin.products.active')/g" "$FILE"
sed -i '' "s/'下架'/t('admin.products.inactive')/g" "$FILE"
sed -i '' 's/>编辑</>{{t('\''admin.products.edit'\'')}}</g' "$FILE"
sed -i '' 's/>卡密</>{{t('\''admin.products.cards'\'')}}</g' "$FILE"
sed -i '' 's/>删除</>{{t('\''admin.products.delete'\'')}}</g' "$FILE"
sed -i '' 's/暂无商品/{t('\''admin.products.noProducts'\'')}/g' "$FILE"
sed -i '' 's/加载中\.\.\./{t('\''admin.common.loading'\'')}/g' "$FILE"

# Orders page
sed -i '' 's/<h2>订单管理<\/h2>/<h2>{t('\''admin.orders.title'\'')}<\/h2>/g' "$FILE"
sed -i '' 's/<th>订单号<\/th>/<th>{t('\''admin.orders.table.orderNo'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>商品<\/th>/<th>{t('\''admin.orders.table.product'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>金额<\/th>/<th>{t('\''admin.orders.table.amount'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>邮箱<\/th>/<th>{t('\''admin.orders.table.email'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>备注<\/th>/<th>{t('\''admin.orders.table.remark'\'')}<\/th>/g' "$FILE"
sed -i '' 's/<th>时间<\/th>/<th>{t('\''admin.common.time'\'')}<\/th>/g' "$FILE"
sed -i '' 's/>查看</>{{t('\''admin.orders.view'\'')}}</g' "$FILE"
sed -i '' 's/暂无订单/{t('\''admin.orders.noOrders'\'')}/g' "$FILE"
sed -i '' 's/搜索订单号 \/ 邮箱 \/ 商品名/{t('\''admin.orders.search'\'')}/g' "$FILE"
sed -i '' 's/全部状态/{t('\''admin.orders.allStatus'\'')}/g' "$FILE"

# Tickets page
sed -i '' 's/全部工单/{t('\''admin.tickets.stats.total'\'')}/g' "$FILE"
sed -i '' 's/待处理/{t('\''admin.tickets.stats.pending'\'')}/g' "$FILE"
sed -i '' 's/处理中/{t('\''admin.tickets.stats.inProgress'\'')}/g' "$FILE"
sed -i '' 's/待超管处理/{t('\''admin.tickets.stats.pendingSuperAdmin'\'')}/g' "$FILE"
sed -i '' 's/已关闭/{t('\''admin.tickets.stats.closed'\'')}/g' "$FILE"
sed -i '' 's/用户未读/{t('\''admin.tickets.stats.userUnread'\'')}/g' "$FILE"
sed -i '' 's/待回复/{t('\''admin.tickets.stats.pendingReply'\'')}/g' "$FILE"
sed -i '' 's/工单列表/{t('\''admin.tickets.list'\'')}/g' "$FILE"

# Cards page
sed -i '' 's/<h2>卡密管理<\/h2>/<h2>{t('\''admin.cards.title'\'')}<\/h2>/g' "$FILE"

# Users page  
sed -i '' 's/<th>用户名<\/th>/<th>{t('\''admin.users.table.username'\'')}<\/th>/g' "$FILE"

echo "Done"
