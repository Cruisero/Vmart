import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 按"商城作用域"隔离 token：路径模式按 /v/:slug，主站统一 main
function getStorageKey() {
    if (typeof window === 'undefined') return 'kashop-auth-main'
    const path = window.location.pathname
    const m = path.match(/^\/v\/([^/]+)/)
    if (m) return `kashop-auth-tenant-${m[1]}`
    return 'kashop-auth-main'
}

// 自定义 storage：每次读写都用"当前 path"对应的 key
const dynamicStorage = {
    getItem: (_name) => {
        const key = getStorageKey()
        const v = localStorage.getItem(key)
        return v ? JSON.parse(v) : null
    },
    setItem: (_name, value) => {
        const key = getStorageKey()
        localStorage.setItem(key, JSON.stringify(value))
    },
    removeItem: (_name) => {
        const key = getStorageKey()
        localStorage.removeItem(key)
    }
}

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: (user, token) => {
                set({ user, token, isAuthenticated: true })
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false })
            },

            updateUser: (userData) => {
                set({ user: { ...get().user, ...userData } })
            },

            isAdmin: () => {
                const role = get().user?.role
                return role === 'ADMIN' || role === 'SUPER_ADMIN'
            },

            isSuperAdmin: () => {
                return get().user?.role === 'SUPER_ADMIN'
            }
        }),
        {
            name: 'kashop-auth',
            storage: dynamicStorage,
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
)

// 路径变化时，如果对应 storage key 变了才重新加载
if (typeof window !== 'undefined') {
    let lastKey = getStorageKey()
    const checkPath = () => {
        const k = getStorageKey()
        if (k !== lastKey) {
            lastKey = k
            useAuthStore.persist.rehydrate()
        }
    }
    const _push = window.history.pushState
    const _replace = window.history.replaceState
    window.history.pushState = function (...args) { _push.apply(this, args); setTimeout(checkPath, 0) }
    window.history.replaceState = function (...args) { _replace.apply(this, args); setTimeout(checkPath, 0) }
    window.addEventListener('popstate', checkPath)
}
