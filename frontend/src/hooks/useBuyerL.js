import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import buyerZh from '../i18n/buyer/zh'
import buyerEn from '../i18n/buyer/en'
import { formatMessage, getByPath } from '../i18n/lookup'

export function useBuyerL() {
    const { i18n } = useTranslation()

    return useCallback((keyOrZh, enOrValues, values = {}) => {
        const isEn = i18n.language?.startsWith('en')

        if (typeof enOrValues === 'string') {
            return formatMessage(isEn ? enOrValues : keyOrZh, values)
        }

        const source = isEn ? buyerEn : buyerZh
        const fallback = isEn ? getByPath(buyerZh, keyOrZh) : getByPath(buyerEn, keyOrZh)
        return formatMessage(getByPath(source, keyOrZh) ?? fallback ?? keyOrZh, enOrValues || {})
    }, [i18n.language])
}
