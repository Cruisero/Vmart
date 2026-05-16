// 构建代理商分站 URL（只使用路径模式）
export function buildAgentStorefrontUrl(slug) {
    return `${window.location.origin}/s/${slug}`
}

// 分站内部链接前缀（isSubdomain 模式已移除，统一用路径模式）
export function getStorefrontBasePath(storefront) {
    return `/s/${storefront?.slug}`
}
