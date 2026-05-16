import { createContext, useContext } from 'react'

// Storefront context for agent sub-sites
// When set, theme components should fetch from /api/s/:slug/... instead of /api/...
export const StorefrontContext = createContext(null)

export function useStorefront() {
    return useContext(StorefrontContext)
}
