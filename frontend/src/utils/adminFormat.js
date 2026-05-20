/**
 * 后台金额格式化：根据商城经营货币显示对应符号
 *
 * 设计要点：
 * - 商户在设置中选择经营货币（CNY 或 USD）
 * - 商品价格直接以该货币定价，price 字段存的就是对应货币的金额
 * - 此工具仅负责加上正确的货币符号
 */
import { useAdminPrefsStore } from '../store/adminPrefsStore'

function toFixed2(n) {
    const v = Number(n)
    return Number.isFinite(v) ? v.toFixed(2) : '0.00'
}

/**
 * @param {number|string} amount  金额
 * @param {object} [options]
 * @param {'CNY'|'USD'} [options.currency]  覆盖当前货币
 * @returns {string}
 */
export function formatMoney(amount, options = {}) {
    const state = useAdminPrefsStore.getState()
    const currency = options.currency || state.currency
    const n = Number(amount) || 0

    if (currency === 'USD') {
        return `$${toFixed2(n)}`
    }
    return `¥${toFixed2(n)}`
}

/**
 * 仅返回当前货币符号
 */
export function getCurrencySymbol(currency) {
    const c = currency || useAdminPrefsStore.getState().currency
    return c === 'USD' ? '$' : '¥'
}

/**
 * Hook 版本：组件中使用，偏好变化时会自动重渲染
 */
export function useFormatMoney() {
    const currency = useAdminPrefsStore((s) => s.currency)
    return (amount) => formatMoney(amount, { currency })
}

/**
 * Hook 版本：返回当前货币符号
 */
export function useCurrencySymbol() {
    const currency = useAdminPrefsStore((s) => s.currency)
    return currency === 'USD' ? '$' : '¥'
}
