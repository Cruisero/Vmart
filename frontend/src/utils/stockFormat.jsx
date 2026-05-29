import React from 'react'

/**
 * Generic stock formatting utility
 * 
 * @param {number} stock Actual stock count
 * @param {boolean} fuzzyEnabled Whether fuzzy stock display is enabled
 * @param {number} threshold Sufficient stock threshold (defaults to 10)
 * @param {function} t Translation function (usually useBuyerL or t from useTranslation)
 * @returns {JSX.Element} Formatted stock badge
 */
export function formatStock(stock, fuzzyEnabled, threshold = 10, t = (k) => k) {
    const numStock = Number(stock) || 0
    
    const translate = (key, fallback) => {
        if (typeof t !== 'function') return fallback
        const res = t(key)
        return res === key ? fallback : res
    }

    if (!fuzzyEnabled) {
        if (numStock <= 0) {
            return translate('products.soldOut', '已售罄')
        }
        return `${translate('products.stock', '库存')} ${numStock}`
    }

    if (numStock <= 0) {
        return (
            <span className="stock-badge stock-badge-red">
                <span className="stock-dot" />
                <span>{translate('products.soldOut', '已售罄')}</span>
            </span>
        )
    }

    const limit = typeof threshold === 'number' ? threshold : parseInt(threshold || '10', 10)
    if (numStock > limit) {
        return (
            <span className="stock-badge stock-badge-green">
                <span className="stock-dot" />
                <span>{translate('products.inStockSufficient', '库存充足')}</span>
            </span>
        )
    } else {
        return (
            <span className="stock-badge stock-badge-amber">
                <span className="stock-dot" />
                <span>{translate('products.inStockLow', '少量库存')}</span>
            </span>
        )
    }
}
