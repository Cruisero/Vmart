/**
 * 管理后台个人偏好
 *
 * - language: 'zh' | 'en' — 后台界面语言（per-user，本地存储）
 * - currency: 'CNY' | 'USD' — 商城经营货币（同步自 tenant systemSettings，本地缓存用于即时显示）
 *
 * currency 的权威来源是后端 tenant_settings.system_settings.currency，
 * 这里做本地缓存以便 Dashboard 等页面无需额外请求即可显示正确符号。
 * TenantSettings 页面加载时会把后端值同步到这里。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAdminPrefsStore = create(
    persist(
        (set) => ({
            language: 'zh',
            currency: 'CNY',

            setLanguage: (lang) => {
                if (lang !== 'zh' && lang !== 'en') return
                set({ language: lang })
            },
            setCurrency: (cur) => {
                if (cur !== 'CNY' && cur !== 'USD') return
                set({ currency: cur })
            },
        }),
        { name: 'vmart-admin-prefs' }
    )
)
