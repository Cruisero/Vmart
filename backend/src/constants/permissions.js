/**
 * 子管理员（ADMIN）的细粒度权限定义
 * 格式：模块.操作
 *
 * - 所有者（TENANT_ADMIN / SUPER_ADMIN）拥有所有权限，无需检查
 * - 子管理员（ADMIN）的 user.permissions 是 JSON 字符串，存储 { "products.view": true, ... }
 */

const PERMISSION_GROUPS = [
    {
        key: 'dashboard',
        label: '仪表盘',
        items: [
            { key: 'dashboard.view', label: '访问仪表盘页面' },
            { key: 'dashboard.viewStatsGrid', label: '查看顶部统计卡（订单、收入、商品、用户、访问量）' },
            { key: 'dashboard.viewTodayStats', label: '查看今日数据（今日订单 / 今日收入）' },
            { key: 'dashboard.viewRevenue', label: '查看总收入数据' }
        ]
    },
    {
        key: 'products',
        label: '商品管理',
        items: [
            { key: 'products.view', label: '查看商品' },
            { key: 'products.edit', label: '创建/编辑商品' },
            { key: 'products.delete', label: '删除商品' },
            { key: 'products.categories', label: '管理商品分类' }
        ]
    },
    {
        key: 'orders',
        label: '订单管理',
        items: [
            { key: 'orders.view', label: '查看订单' },
            { key: 'orders.ship', label: '发货 / 重发卡密' },
            { key: 'orders.cancel', label: '取消订单' },
            { key: 'orders.refund', label: '订单退款' },
            { key: 'orders.export', label: '导出订单 CSV' }
        ]
    },
    {
        key: 'cards',
        label: '卡密管理',
        items: [
            { key: 'cards.view', label: '查看卡密' },
            { key: 'cards.import', label: '导入卡密' },
            { key: 'cards.delete', label: '删除卡密' }
        ]
    },
    {
        key: 'tickets',
        label: '工单管理',
        items: [
            { key: 'tickets.view', label: '查看工单' },
            { key: 'tickets.reply', label: '回复工单' },
            { key: 'tickets.close', label: '关闭工单' }
        ]
    },
    {
        key: 'customers',
        label: '顾客管理',
        items: [
            { key: 'customers.view', label: '查看顾客列表' }
        ]
    },
    {
        key: 'agents',
        label: '代理管理（仅启用代理时）',
        items: [
            { key: 'agents.review', label: '审核代理申请' },
            { key: 'agents.skinPool', label: '管理皮肤池' },
            { key: 'agents.withdraw', label: '提现审核' }
        ]
    }
]

// 扁平 key 列表
const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key))

// 默认子管理员权限（创建时使用，给基础权限）
const DEFAULT_ADMIN_PERMISSIONS = {
    'dashboard.view': true,
    'dashboard.viewStatsGrid': true,
    'dashboard.viewTodayStats': true,
    'products.view': true,
    'products.edit': true,
    'orders.view': true,
    'orders.ship': true,
    'cards.view': true,
    'cards.import': true,
    'tickets.view': true,
    'tickets.reply': true,
    'customers.view': true
}

module.exports = {
    PERMISSION_GROUPS,
    ALL_PERMISSION_KEYS,
    DEFAULT_ADMIN_PERMISSIONS
}
