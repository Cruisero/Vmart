/**
 * 商户状态管理 Store
 * 管理平台登录状态（独立于商城 authStore）
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useMerchantStore = create(
    persist(
        (set, get) => ({
            token: null,
            merchant: null,
            shop: null,

            setAuth: (token, merchant, shop) => set({ token, merchant, shop }),

            updateShop: (shopData) => set(state => ({
                shop: { ...state.shop, ...shopData }
            })),

            logout: () => set({ token: null, merchant: null, shop: null }),

            isAuthenticated: () => !!get().token,

            isSuperAdmin: () => get().merchant?.isSuperAdmin === true,

            // 判断试用是否到期
            isTrialExpired: () => {
                const shop = get().shop
                if (!shop) return false
                const now = new Date()
                if (shop.plan !== 'FREE') return false
                return now > new Date(shop.trialEndsAt)
            },

            // 判断套餐是否到期
            isPlanExpired: () => {
                const shop = get().shop
                if (!shop) return false
                if (!shop.planExpiresAt) return false
                return new Date() > new Date(shop.planExpiresAt)
            },

            // 获取剩余试用秒数
            getTrialSecondsLeft: () => {
                const shop = get().shop
                if (!shop) return 0
                return Math.max(0, Math.floor((new Date(shop.trialEndsAt) - new Date()) / 1000))
            }
        }),
        {
            name: 'merchant-auth',
            partialize: (state) => ({ token: state.token, merchant: state.merchant, shop: state.shop })
        }
    )
)
