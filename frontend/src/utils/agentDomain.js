// 构建代理商分站 URL（只使用路径模式）
export function buildAgentStorefrontUrl(slug) {
    return `${window.location.origin}/s/${slug}`
}

// 分站内部链接前缀（isSubdomain 模式已移除，统一用路径模式）
export function getStorefrontBasePath(storefront) {
    if (storefront?._tenantMode) {
        const host = window.location.hostname
        const mainDomains = ['localhost', '127.0.0.1', 'vmart.cc', 'www.vmart.cc', 'fallback.vmart.cc']
        const isCustom = !mainDomains.includes(host)
        if (isCustom) {
            return ''
        }
        return `/v/${storefront?.slug}`
    }
    return `/s/${storefront?.slug}`
}
