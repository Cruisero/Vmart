/**
 * 通用货币格式化工具（前台 + 后台通用）
 *
 * 前台买家端：从 storefront context 获取 currency
 * 后台管理端：从 adminPrefsStore 获取 currency
 */

/**
 * 根据货币类型格式化金额
 * @param {number|string} amount
 * @param {'CNY'|'USD'} [currency='CNY']
 * @returns {string}
 */
export function formatPrice(amount, currency = 'CNY') {
    const n = Number(amount) || 0
    const formatted = n.toFixed(2)
    if (currency === 'USD') return `$${formatted}`
    return `¥${formatted}`
}

/**
 * 获取货币符号
 * @param {'CNY'|'USD'} [currency='CNY']
 * @returns {string}
 */
export function currencySymbol(currency = 'CNY') {
    return currency === 'USD' ? '$' : '¥'
}
