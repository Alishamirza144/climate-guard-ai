import { describe, it, expect } from 'vitest'
import {
  formatDigits,
  formatNumber,
  formatPercent,
  formatCoordinates,
  LANGUAGE_LOCALES,
} from '../i18n/formatters'
import {
  localizeCity,
  localizeState,
  localizeLocationLabel,
} from '../i18n/locations'

describe('Localization Formatters & Locations', () => {
  it('covers all 23 supported languages in LANGUAGE_LOCALES', () => {
    const supportedLangs = [
      'en', 'hi', 'mr', 'bn', 'gu', 'ta', 'te', 'kn', 'ml', 'pa',
      'or', 'as', 'ur', 'sa', 'ks', 'ne', 'kok', 'sd', 'mai', 'doi',
      'brx', 'sat', 'mni'
    ]
    expect(Object.keys(LANGUAGE_LOCALES).length).toBe(23)
    supportedLangs.forEach((lang) => {
      expect(LANGUAGE_LOCALES[lang]).toBeDefined()
    })
  })

  it('formats digits into native numeral scripts correctly', () => {
    // English -> Western Arabic
    expect(formatDigits('28.5', 'en')).toBe('28.5')
    // Hindi (Devanagari)
    expect(formatDigits('28.5', 'hi')).toBe('२८.५')
    // Marathi (Devanagari)
    expect(formatDigits('28.5', 'mr')).toBe('२८.५')
    // Bengali (Bengali)
    expect(formatDigits('28.5', 'bn')).toBe('২৮.৫')
    // Gujarati (Gujarati)
    expect(formatDigits('28.5', 'gu')).toBe('૨૮.૫')
    // Tamil (Tamil)
    expect(formatDigits('28.5', 'ta')).toBe('௨௮.௫')
    // Telugu (Telugu)
    expect(formatDigits('28.5', 'te')).toBe('౨౮.౫')
    // Kannada (Kannada)
    expect(formatDigits('28.5', 'kn')).toBe('೨೮.೫')
    // Malayalam (Malayalam)
    expect(formatDigits('28.5', 'ml')).toBe('൨൮.൫')
    // Punjabi (Gurmukhi)
    expect(formatDigits('28.5', 'pa')).toBe('੨੮.੫')
    // Odia (Odia)
    expect(formatDigits('28.5', 'or')).toBe('୨୮.୫')
    // Urdu (Extended Arabic-Indic)
    expect(formatDigits('28.5', 'ur')).toBe('۲۸.۵')
    // Santali (Ol Chiki)
    expect(formatDigits('28.5', 'sat')).toBe('᱒᱘.᱕')
  })

  it('formats numbers and percentages with native numbering systems', () => {
    const numHindi = formatNumber(1012, { lang: 'hi' })
    expect(numHindi).toBe('१,०१२')

    const pctMarathi = formatPercent(54, { lang: 'mr' })
    expect(pctMarathi).toContain('५४')

    const numBengali = formatNumber(1234.56, { lang: 'bn', maximumFractionDigits: 2 })
    expect(numBengali).toContain('১')
  })

  it('formats geographic coordinates into localized numeral format', () => {
    const coordsHi = formatCoordinates(19.9975, 73.7898, 'hi')
    expect(coordsHi).toContain('१९.९९७५')
    expect(coordsHi).toContain('७३.७८९८')

    const coordsEn = formatCoordinates(19.9975, 73.7898, 'en')
    expect(coordsEn).toBe('19.9975°N, 73.7898°E')
  })

  it('localizes Indian cities and states across languages', () => {
    // Hindi
    expect(localizeCity('Nashik', 'hi')).toBe('नाशिक')
    expect(localizeState('Maharashtra', 'hi')).toBe('महाराष्ट्र')
    expect(localizeLocationLabel('Nashik, Maharashtra', 'hi')).toBe('नाशिक, महाराष्ट्र')

    // Marathi
    expect(localizeCity('Mumbai', 'mr')).toBe('मुंबई')
    expect(localizeCity('Pune', 'mr')).toBe('पुणे')

    // Bengali
    expect(localizeCity('Kolkata', 'bn')).toBe('কলকাতা')
    expect(localizeState('West Bengal', 'bn')).toBe('পশ্চিমবঙ্গ')

    // Tamil
    expect(localizeCity('Chennai', 'ta')).toBe('சென்னை')
    expect(localizeState('Tamil Nadu', 'ta')).toBe('தமிழ்நாடு')

    // Telugu
    expect(localizeCity('Hyderabad', 'te')).toBe('హైదరాబాద్')
    expect(localizeState('Telangana', 'te')).toBe('తెలంగాణ')

    // Gujarati
    expect(localizeCity('Ahmedabad', 'gu')).toBe('અમદાવાદ')
    expect(localizeState('Gujarat', 'gu')).toBe('ગુજરાત')

    // Urdu
    expect(localizeCity('Delhi', 'ur')).toBe('دہلی')
    expect(localizeState('Delhi', 'ur')).toBe('دہلی')

    // English fallback
    expect(localizeCity('Nashik', 'en')).toBe('Nashik')
    expect(localizeState('Maharashtra', 'en')).toBe('Maharashtra')
    expect(localizeLocationLabel('Nashik, Maharashtra', 'en')).toBe('Nashik, Maharashtra')
  })
})
