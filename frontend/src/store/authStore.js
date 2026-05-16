import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            // 登录
            login: (user, token) => {
                console.log('[AuthStore] 登录成功，保存用户信息:', { user, token: token ? '***' : null })
                set({
                    user,
                    token,
                    isAuthenticated: true
                })
            },

            // 登出
            logout: () => {
                console.log('[AuthStore] 执行登出')
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false
                })
            },

            // 更新用户信息
            updateUser: (userData) => {
                set({
                    user: { ...get().user, ...userData }
                })
            },

            // 检查是否是管理员（ADMIN 或 SUPER_ADMIN）
            isAdmin: () => {
                const role = get().user?.role
                return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SAAS_ADMIN'
            },

            // 检查是否是超级管理员
            isSuperAdmin: () => {
                return ['SUPER_ADMIN', 'SAAS_ADMIN'].includes(get().user?.role)
            }
        }),
        {
            name: 'kashop-auth',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
)
