/**
 * useAdminL — 后台管理界面的双语 hook
 *
 * 用法：
 *   const L = useAdminL()
 *   <h2>{L('admin.products.title')}</h2>
 *   <button>{L('admin.common.save')}</button>
 *
 * 语言来源：adminPrefsStore.language（'zh' | 'en'）
 * 在商城设置 → 基本信息 → 后台语言 中切换，即时生效
 */
import { useCallback } from 'react'
import { useAdminPrefsStore } from '../store/adminPrefsStore'
import adminZh from '../i18n/admin/zh'
import adminEn from '../i18n/admin/en'
import { formatMessage, getByPath } from '../i18n/lookup'

export function useAdminL() {
    const lang = useAdminPrefsStore((s) => s.language)

    return useCallback((keyOrZh, enOrValues, values = {}) => {
        if (typeof enOrValues === 'string') {
            return formatMessage(lang === 'en' ? enOrValues : keyOrZh, values)
        }

        const source = lang === 'en' ? adminEn : adminZh
        const fallback = lang === 'en' ? getByPath(adminZh, keyOrZh) : getByPath(adminEn, keyOrZh)
        return formatMessage(getByPath(source, keyOrZh) ?? fallback ?? keyOrZh, enOrValues || {})
    }, [lang])
}
