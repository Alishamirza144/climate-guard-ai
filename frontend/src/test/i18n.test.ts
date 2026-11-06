import { describe, expect, it, beforeEach } from 'vitest'
import i18n, { changeAppLanguage } from '../i18n'
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES, isRTL, getLanguageMeta } from '../i18n/languages'

describe('Indian Multilingual System (23 Languages)', () => {
  beforeEach(() => {
    localStorage.clear()
    changeAppLanguage('en')
  })

  it('contains exactly 23 languages (22 scheduled + English)', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(23)
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('hi')
    expect(codes).toContain('mr')
    expect(codes).toContain('bn')
    expect(codes).toContain('gu')
    expect(codes).toContain('ta')
    expect(codes).toContain('te')
    expect(codes).toContain('kn')
    expect(codes).toContain('ml')
    expect(codes).toContain('pa')
    expect(codes).toContain('or')
    expect(codes).toContain('as')
    expect(codes).toContain('ur')
    expect(codes).toContain('sa')
    expect(codes).toContain('ks')
    expect(codes).toContain('ne')
    expect(codes).toContain('kok')
    expect(codes).toContain('sd')
    expect(codes).toContain('mai')
    expect(codes).toContain('doi')
    expect(codes).toContain('brx')
    expect(codes).toContain('sat')
    expect(codes).toContain('mni')
  })

  it('correctly classifies RTL languages (Urdu, Kashmiri, Sindhi)', () => {
    expect(isRTL('ur')).toBe(true)
    expect(isRTL('ks')).toBe(true)
    expect(isRTL('sd')).toBe(true)

    expect(isRTL('en')).toBe(false)
    expect(isRTL('hi')).toBe(false)
    expect(isRTL('mr')).toBe(false)
    expect(isRTL('ta')).toBe(false)
    expect(isRTL('bn')).toBe(false)
  })

  it('changes application language without reload and persists in localStorage', () => {
    changeAppLanguage('hi')
    expect(i18n.language).toBe('hi')
    expect(localStorage.getItem('climateguard-lang')).toBe('hi')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('hi')

    // Switch to RTL Urdu
    changeAppLanguage('ur')
    expect(i18n.language).toBe('ur')
    expect(localStorage.getItem('climateguard-lang')).toBe('ur')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ur')

    // Switch to Marathi
    changeAppLanguage('mr')
    expect(i18n.language).toBe('mr')
    expect(localStorage.getItem('climateguard-lang')).toBe('mr')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('mr')
  })

  it('translates navigation and core climate terms accurately in Hindi and Marathi', () => {
    changeAppLanguage('hi')
    expect(i18n.t('nav.dashboard')).toContain('डैशबोर्ड')
    expect(i18n.t('risk.critical')).toContain('गंभीर')

    changeAppLanguage('mr')
    expect(i18n.t('nav.dashboard')).toContain('डॅशबोर्ड')
    expect(i18n.t('risk.critical')).toContain('गंभीर')
  })

  it('provides valid metadata for each language with native name and region', () => {
    const hiMeta = getLanguageMeta('hi')
    expect(hiMeta.name).toBe('Hindi')
    expect(hiMeta.nativeName).toBe('हिन्दी')
    expect(hiMeta.region).toContain('North')

    const taMeta = getLanguageMeta('ta')
    expect(taMeta.name).toBe('Tamil')
    expect(taMeta.nativeName).toBe('தமிழ்')

    const fallbackMeta = getLanguageMeta('unknown_code')
    expect(fallbackMeta.code).toBe('en')
  })
})
