import { createContext, useContext } from 'react'
import { getStorefrontBasePath } from '../utils/agentDomain'

// Storefront context for agent sub-sites
// When set, theme components should fetch from /api/s/:slug/... instead of /api/...
export const StorefrontContext = createContext(null)

export function useStorefront() {
    return useContext(StorefrontContext)
}

/**
 * useStorefrontPath - 统一处理店面下的路径前缀
 * 返回:
 *   - prefix: 当前店面的 base path（如 /v/gq48i3 或 ''）
 *   - withPrefix(path): 把以 / 开头的绝对路径转换为带店面前缀的路径
 *
 * 用法：
 *   const { withPrefix } = useStorefrontPath()
 *   navigate(withPrefix('/order/123'))   // 主站: /order/123, 店面: /v/gq48i3/order/123
 *   <Link to={withPrefix('/cart')} />
 */
export function useStorefrontPath() {
    const storefront = useStorefront()
    const prefix = storefront ? getStorefrontBasePath(storefront) : ''
    const withPrefix = (path) => {
        if (!path) return prefix || '/'
        if (!path.startsWith('/')) path = '/' + path
        return `${prefix}${path}`.replace(/\/+/g, '/')
    }
    return { prefix, withPrefix, storefront }
}
