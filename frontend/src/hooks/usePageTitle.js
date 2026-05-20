import { useEffect } from 'react'
import { useStorefront } from '../store/storefrontStore'

/**
 * 设置页面标题（浏览器标签页）
 * 格式：pageTitle - 店铺名
 * 如果没有 pageTitle，只显示店铺名
 */
export function usePageTitle(pageTitle) {
    const storefront = useStorefront()
    const shopName = storefront?.shopName || 'Vmart'

    useEffect(() => {
        if (pageTitle) {
            document.title = `${pageTitle} - ${shopName}`
        } else {
            document.title = shopName
        }
        return () => { document.title = shopName }
    }, [pageTitle, shopName])
}
