import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
    persist(
        (set, get) => ({
            theme: 'light', // 'light' | 'dark'

            toggleTheme: () => {
                const newTheme = get().theme === 'dark' ? 'light' : 'dark'
                document.documentElement.setAttribute('data-theme', newTheme)
                set({ theme: newTheme })
            },

            setTheme: (theme) => {
                document.documentElement.setAttribute('data-theme', theme)
                set({ theme })
            },

            // 初始化主题（在应用启动时调用）
            initTheme: () => {
                const theme = get().theme
                document.documentElement.setAttribute('data-theme', theme)
            }
        }),
        {
            name: 'kashop-theme', // localStorage key
        }
    )
)
