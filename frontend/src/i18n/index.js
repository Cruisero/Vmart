import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import en from './locales/en.json'

// 优先级：用户手动选择 > 浏览器语言 > 默认中文
function detectLang() {
  const saved = localStorage.getItem('vmart-lang')
  if (saved) return saved

  // 跟随浏览器语言（Auto 模式）
  const browserLang = navigator.language || navigator.languages?.[0] || 'zh'
  return browserLang.startsWith('en') ? 'en' : 'zh'
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en }
  },
  lng: detectLang(),
  fallbackLng: 'zh',
  interpolation: { escapeValue: false }
})

export default i18n
