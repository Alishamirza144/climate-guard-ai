import { describe, expect, it, beforeEach } from 'vitest'
import i18n, { changeAppLanguage } from '../i18n'
import { SUPPORTED_LANGUAGES, RTL_LANGUAGES, isRTL, getLanguageMeta } from '../i18n/languages'
import {
  translateAlertTitle,
  translateAlertReason,
  translateRecommendedAction,
  translateWeatherCondition,
  translateLatencyStatus,
} from '../i18n/dynamic'

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
    expect(i18n.t('latency.title')).toContain('डेटा विलंबता')
    expect(i18n.t('common.causalReason')).toContain('कारणात्मक विश्लेषण')

    changeAppLanguage('mr')
    expect(i18n.t('nav.dashboard')).toContain('डॅशबोर्ड')
    expect(i18n.t('risk.critical')).toContain('गंभीर')
    expect(i18n.t('latency.title')).toContain('माहिती विलंबता')
    expect(i18n.t('common.causalReason')).toContain('कारणात्मक विश्लेषण')
  })

  it('translates dynamic backend alerts and descriptions in Hindi and Marathi', () => {
    // Test Hindi
    changeAppLanguage('hi')
    const tHi = i18n.t.bind(i18n)

    const hiTitle = translateAlertTitle('✅ NO ACTIVE FLOOD THREAT – MUMBAI REGION', tHi)
    expect(hiTitle).toContain('कोई सक्रिय बाढ़ खतरा नहीं')
    expect(hiTitle).toContain('MUMBAI')

    const hiReason = translateAlertReason(
      'No significant rainfall recorded in Mumbai (Maharashtra). River water level and runoff remain within nominal limits.',
      tHi,
      'Mumbai',
      'Maharashtra'
    )
    expect(hiReason).toContain('में कोई उल्लेखनीय वर्षा दर्ज नहीं की गई')

    const hiAction = translateRecommendedAction(
      'Routine civic monitoring. Follow official DDMA/Mumbai Municipal advisories.',
      tHi,
      'Mumbai'
    )
    expect(hiAction).toContain('नियमित नागरिक निगरानी')

    const hiWeather = translateWeatherCondition('Mainly clear', tHi)
    expect(hiWeather).toContain('मुख्यतः साफ')

    // Test Marathi
    changeAppLanguage('mr')
    const tMr = i18n.t.bind(i18n)

    const mrTitle = translateAlertTitle('✅ NO ACTIVE FLOOD THREAT – MUMBAI REGION', tMr)
    expect(mrTitle).toContain('कोणताही सक्रिय पूर धोका नाही')
    expect(mrTitle).toContain('MUMBAI')

    const mrReason = translateAlertReason(
      'No significant rainfall recorded in Mumbai (Maharashtra). River water level and runoff remain within nominal limits.',
      tMr,
      'Mumbai',
      'Maharashtra'
    )
    expect(mrReason).toContain('कोणताही लक्षणीय पाऊस नोंदवला गेला नाही')

    const mrAction = translateRecommendedAction(
      'Routine civic monitoring. Follow official DDMA/Mumbai Municipal advisories.',
      tMr,
      'Mumbai'
    )
    expect(mrAction).toContain('नियमित नागरी देखरेख')

    const mrWeather = translateWeatherCondition('Mainly clear', tMr)
    expect(mrWeather).toContain('मुख्यतः स्वच्छ')
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
