import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export interface LocaleConfig {
  locale: string
  nu: string
  digits: string
}

export const LANGUAGE_LOCALES: Record<string, LocaleConfig> = {
  en: { locale: 'en-IN', nu: 'latn', digits: '0123456789' },
  hi: { locale: 'hi-IN', nu: 'deva', digits: '०१२३४५६७८९' },
  mr: { locale: 'mr-IN', nu: 'deva', digits: '०१२३४५६७८९' },
  bn: { locale: 'bn-IN', nu: 'beng', digits: '০১২৩৪৫৬৭৮৯' },
  gu: { locale: 'gu-IN', nu: 'gujr', digits: '૦૧૨૩૪૫૬૭૮૯' },
  ta: { locale: 'ta-IN', nu: 'tamldec', digits: '௦௧௨௩௪௫௬௭௮௯' },
  te: { locale: 'te-IN', nu: 'telu', digits: '౦౧౨౩౪౫౬౭౮౯' },
  kn: { locale: 'kn-IN', nu: 'knda', digits: '೦೧೨೩೪೫೬೭೮೯' },
  ml: { locale: 'ml-IN', nu: 'mlym', digits: '൦൧൨൩൪൫൬൭൮൯' },
  pa: { locale: 'pa-IN', nu: 'guru', digits: '੦੧੨੩੪੫੬੭੮੯' },
  or: { locale: 'or-IN', nu: 'orya', digits: '୦୧୨୩୪୫୬୭୮୯' },
  as: { locale: 'as-IN', nu: 'beng', digits: '০১২৩৪৫৬৭৮৯' },
  ur: { locale: 'ur-IN', nu: 'arabext', digits: '۰۱۲۳۴۵۶۷۸۹' },
  sa: { locale: 'sa-IN', nu: 'deva', digits: '०१२३४५६७८९' },
  ks: { locale: 'ks-IN', nu: 'arabext', digits: '۰۱۲۳۴۵۶۷۸۹' },
  ne: { locale: 'ne-NP', nu: 'deva', digits: '०१२३४५६७८९' },
  kok: { locale: 'kok-IN', nu: 'deva', digits: '०१२३४५६७८९' },
  sd: { locale: 'sd-IN', nu: 'arabext', digits: '۰۱۲۳۴۵۶۷۸۹' },
  mai: { locale: 'mai-IN', nu: 'deva', digits: '०१२३४५६७८९' },
  doi: { locale: 'doi-IN', nu: 'deva', digits: '०१२३४५६७८९' },
  brx: { locale: 'brx-IN', nu: 'deva', digits: '०१२३४५६७८९' },
  sat: { locale: 'sat-IN', nu: 'olck', digits: '᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙' },
  mni: { locale: 'mni-IN', nu: 'beng', digits: '০১২৩৪৫৬৭৮৯' },
}

export function getLocaleConfig(lang?: string): LocaleConfig {
  const code = (lang || 'en').toLowerCase().trim()
  return LANGUAGE_LOCALES[code] || LANGUAGE_LOCALES.en
}

/**
 * Replaces ASCII/Latin digits (0-9) in any string or number with the native script digits of the target language.
 * Preserves decimal points, punctuation, percent signs, and SI units.
 */
export function formatDigits(val: string | number | null | undefined, lang = 'en'): string {
  if (val == null) return ''
  const str = String(val)
  const conf = getLocaleConfig(lang)
  if (conf.nu === 'latn') return str
  return str.replace(/[0-9]/g, (d) => conf.digits[Number(d)])
}

/**
 * Formats a number with locale-aware decimal and grouping separators, rendering native digits for the active language.
 */
export function formatNumber(
  val: number | string | null | undefined,
  optsOrLang?: (Intl.NumberFormatOptions & { lang?: string }) | string,
  langArg = 'en'
): string {
  if (val == null || val === '') return '—'
  const num = Number(val)
  if (!Number.isFinite(num)) return String(val)

  let opts: Intl.NumberFormatOptions = {}
  let lang = langArg

  if (typeof optsOrLang === 'string') {
    lang = optsOrLang
  } else if (optsOrLang) {
    opts = optsOrLang
    if (optsOrLang.lang) {
      lang = optsOrLang.lang
    }
  }

  const conf = getLocaleConfig(lang)
  try {
    const formatted = new Intl.NumberFormat(`${conf.locale}-u-nu-${conf.nu}`, opts).format(num)
    // If the browser did not substitute native digits (e.g. unsupported locale), pass through digit mapper
    if (conf.nu !== 'latn' && /[0-9]/.test(formatted)) {
      return formatDigits(formatted, lang)
    }
    return formatted
  } catch {
    return formatDigits(num.toLocaleString('en-IN', opts), lang)
  }
}

/**
 * Formats a percentage value (e.g. 54 -> "54%" or "५४%").
 */
export function formatPercent(
  val: number | string | null | undefined,
  optsOrLang?: (Intl.NumberFormatOptions & { lang?: string }) | string,
  langArg = 'en'
): string {
  if (val == null || val === '') return '—'
  const num = Number(val)
  if (!Number.isFinite(num)) return String(val)
  return `${formatNumber(num, optsOrLang, langArg)}%`
}

/**
 * Formats GPS Coordinates with native digits (e.g. 19.9975°N, 73.7898°E -> १९.९९७५°N, ७३.७८९८°E).
 */
export function formatCoordinates(lat: number, lon: number, lang = 'en'): string {
  const latStr = `${lat.toFixed(4)}°N`
  const lonStr = `${lon.toFixed(4)}°E`
  return `${formatDigits(latStr, lang)}, ${formatDigits(lonStr, lang)}`
}

/**
 * Formats digital clock time (HH:mm:ss).
 */
export function formatClock(date: Date, lang = 'en'): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return formatDigits(timeStr, lang)
}

/**
 * Formats time with locale-aware AM/PM or 24-hr formatting.
 */
export function formatTime(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = { timeStyle: 'short' },
  lang = 'en'
): string {
  try {
    const d = typeof date === 'object' && date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) return String(date)
    const conf = getLocaleConfig(lang)
    const formatted = new Intl.DateTimeFormat(conf.locale, opts).format(d)
    return formatDigits(formatted, lang)
  } catch {
    return String(date)
  }
}

/**
 * Formats date with locale-aware calendar conventions.
 */
export function formatDate(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  lang = 'en'
): string {
  try {
    const d = typeof date === 'object' && date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) return String(date)
    const conf = getLocaleConfig(lang)
    const formatted = new Intl.DateTimeFormat(conf.locale, opts).format(d)
    return formatDigits(formatted, lang)
  } catch {
    return String(date)
  }
}

/**
 * React hook that returns formatting utilities reactively bound to the active i18n language.
 */
export function useLocaleFormatter() {
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'

  return useMemo(
    () => ({
      lang,
      formatNumber: (n: number | string | null | undefined, opts?: Intl.NumberFormatOptions) =>
        formatNumber(n, opts, lang),
      formatPercent: (n: number | string | null | undefined, opts?: Intl.NumberFormatOptions) =>
        formatPercent(n, opts, lang),
      formatDigits: (text: string | number | null | undefined) => formatDigits(text, lang),
      formatCoordinates: (lat: number, lon: number) => formatCoordinates(lat, lon, lang),
      formatClock: (date: Date) => formatClock(date, lang),
      formatTime: (date: Date | string | number, opts?: Intl.DateTimeFormatOptions) =>
        formatTime(date, opts, lang),
      formatDate: (date: Date | string | number, opts?: Intl.DateTimeFormatOptions) =>
        formatDate(date, opts, lang),
    }),
    [lang]
  )
}
