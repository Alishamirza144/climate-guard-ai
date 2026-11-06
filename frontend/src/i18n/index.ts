import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { isRTL, SUPPORTED_LANGUAGES } from './languages'

import en from './locales/en'
import hi from './locales/hi'
import mr from './locales/mr'
import bn from './locales/bn'
import gu from './locales/gu'
import ta from './locales/ta'
import te from './locales/te'
import kn from './locales/kn'
import ml from './locales/ml'
import pa from './locales/pa'
import or from './locales/or'
import as from './locales/as'
import ur from './locales/ur'
import sa from './locales/sa'
import ks from './locales/ks'
import ne from './locales/ne'
import kok from './locales/kok'
import sd from './locales/sd'
import mai from './locales/mai'
import doi from './locales/doi'
import brx from './locales/brx'
import sat from './locales/sat'
import mni from './locales/mni'

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
  bn: { translation: bn },
  gu: { translation: gu },
  ta: { translation: ta },
  te: { translation: te },
  kn: { translation: kn },
  ml: { translation: ml },
  pa: { translation: pa },
  or: { translation: or },
  as: { translation: as },
  ur: { translation: ur },
  sa: { translation: sa },
  ks: { translation: ks },
  ne: { translation: ne },
  kok: { translation: kok },
  sd: { translation: sd },
  mai: { translation: mai },
  doi: { translation: doi },
  brx: { translation: brx },
  sat: { translation: sat },
  mni: { translation: mni }
} as const

export const defaultLanguage = 'en'
const storedLang = typeof window !== 'undefined' ? localStorage.getItem('climateguard-lang') : null
export const initialLanguage =
  storedLang && SUPPORTED_LANGUAGES.some((l) => l.code === storedLang)
    ? storedLang
    : defaultLanguage

export function applyLanguageSettings(code: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = code
    document.documentElement.dir = isRTL(code) ? 'rtl' : 'ltr'
  }
}

// Initial document direction & language
applyLanguageSettings(initialLanguage)

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: defaultLanguage,
  interpolation: { escapeValue: false },
})

export function changeAppLanguage(code: string) {
  void i18n.changeLanguage(code)
  if (typeof window !== 'undefined') {
    localStorage.setItem('climateguard-lang', code)
  }
  applyLanguageSettings(code)
}

export default i18n
