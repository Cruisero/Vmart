import { useEffect } from 'react'
import { useStorefront } from '../store/storefrontStore'

/**
 * 设置页面标题（浏览器标签页）
 * 格式：pageTitle - 店铺名/书签栏文字
 * 如果没有 pageTitle，只显示店铺名/书签栏文字
 */
export function usePageTitle(pageTitle) {
    const storefront = useStorefront()

    // 自动文字：如果是自定义域名，默认使用域名；否则使用商城名称
    const host = window.location.hostname
    const mainDomains = ['localhost', '127.0.0.1', 'vmart.cc', 'www.vmart.cc', 'fallback.vmart.cc']
    const isCustom = !mainDomains.includes(host)
    const autoTitle = isCustom ? host : (storefront?.shopName || 'Vmart')

    const titleBase = storefront?.shopBookmarkTitle || autoTitle

    useEffect(() => {
        if (pageTitle) {
            document.title = `${pageTitle} - ${titleBase}`
        } else {
            document.title = titleBase
        }
        return () => { document.title = titleBase }
    }, [pageTitle, titleBase])
}
