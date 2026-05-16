import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
    persist(
        (set, get) => ({
            items: [],

            // 添加商品到购物车（支持规格）
            addItem: (product, quantity = 1, variant = null) => {
                const items = get().items
                // 使用 productId + variantId 作为唯一标识
                const cartItemId = variant ? `${product.id}-${variant.id}` : product.id
                const existingItem = items.find(item => item.cartItemId === cartItemId)

                // 构建购物车项目
                const cartItem = {
                    ...product,
                    cartItemId,
                    variant,
                    // 如果有规格，使用规格的价格和库存
                    price: variant?.price || product.price,
                    stock: variant?.stock ?? product.stock,
                    variantName: variant?.name || null,
                }

                if (existingItem) {
                    set({
                        items: items.map(item =>
                            item.cartItemId === cartItemId
                                ? { ...item, quantity: item.quantity + quantity }
                                : item
                        )
                    })
                } else {
                    set({
                        items: [...items, { ...cartItem, quantity }]
                    })
                }
            },

            // 更新商品数量
            updateQuantity: (cartItemId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(cartItemId)
                    return
                }
                set({
                    items: get().items.map(item =>
                        item.cartItemId === cartItemId ? { ...item, quantity } : item
                    )
                })
            },

            // 移除商品
            removeItem: (cartItemId) => {
                set({
                    items: get().items.filter(item => item.cartItemId !== cartItemId)
                })
            },

            // 清空购物车
            clearCart: () => set({ items: [] }),

            // 获取购物车总价
            getTotalPrice: () => {
                return get().items.reduce(
                    (total, item) => total + item.price * item.quantity,
                    0
                )
            },

            // 获取商品总数
            getTotalCount: () => {
                return get().items.reduce(
                    (count, item) => count + item.quantity,
                    0
                )
            }
        }),
        {
            name: 'kashop-cart'
        }
    )
)
