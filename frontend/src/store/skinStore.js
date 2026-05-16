import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSkinStore = create(
    persist(
        (set, get) => ({
            skin: 'fresh',
            skinReady: false,
            siteName: '',
            siteLogo: '',
            siteFavicon: '',

            fetchSkin: async () => {
                try {
                    const res = await fetch('/api/settings/public')
                    const data = await res.json()
                    const s = data.settings || {}
                    set({
                        skin: s.frontend_skin || 'fresh',
                        siteName: s.siteName || '',
                        siteLogo: s.siteLogo || '',
                        siteFavicon: s.siteFavicon || '',
                        skinReady: true
                    })
                } catch {
                    set({ skinReady: true })
                }
            },

            setSkin: (skin) => set({ skin }),
        }),
        {
            name: 'vmart-skin',
            partialize: (state) => ({ skin: state.skin, siteName: state.siteName, siteLogo: state.siteLogo, siteFavicon: state.siteFavicon }),
        }
    )
)
