# Theme and Skin Notes

This folder contains buyer-facing storefront themes and skins.

## Translation

Use the buyer translation hook in all theme components:

```jsx
import { useBuyerL } from '../../../hooks/useBuyerL'

export default function ThemeComponent() {
    const L = useBuyerL()

    return <button>{L('products.buyNow')}</button>
}
```

Translation text lives in:

- `frontend/src/i18n/buyer/zh.js`
- `frontend/src/i18n/buyer/en.js`

Add the same key to both files when a theme needs new text:

```js
// zh.js
theme: {
    featured: '精选商品'
}

// en.js
theme: {
    featured: 'Featured'
}
```

Then use:

```jsx
L('theme.featured')
```

Do not hard-code visible buyer-facing Chinese or English text inside theme components when it can be translated.

## Common Keys

Reusable examples:

```jsx
L('nav.home')
L('nav.orderQuery')
L('products.soldOut')
L('products.noProducts')
L('checkout.submit')
L('order.cardKeys')
L('auth.login')
L('common.back')
```

## Language Source

`useBuyerL()` reads the current buyer language from the existing i18next state, then loads text from the buyer translation files above.

The theme only needs to call `L('some.key')`.
