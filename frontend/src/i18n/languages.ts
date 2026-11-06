// All 22 Scheduled Indian Languages + English (23 Total)
export interface LanguageMeta {
  code: string
  name: string
  nativeName: string
  region: string
  script: string
  dir: 'ltr' | 'rtl'
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  {
    "code": "en",
    "name": "English",
    "nativeName": "English",
    "region": "Pan-India / International",
    "script": "Latin",
    "dir": "ltr"
  },
  {
    "code": "hi",
    "name": "Hindi",
    "nativeName": "हिन्दी",
    "region": "North & Central India",
    "script": "Devanagari",
    "dir": "ltr"
  },
  {
    "code": "mr",
    "name": "Marathi",
    "nativeName": "मराठी",
    "region": "Maharashtra, Goa",
    "script": "Devanagari",
    "dir": "ltr"
  },
  {
    "code": "bn",
    "name": "Bengali",
    "nativeName": "বাংলা",
    "region": "West Bengal, Tripura, Assam",
    "script": "Bengali",
    "dir": "ltr"
  },
  {
    "code": "gu",
    "name": "Gujarati",
    "nativeName": "ગુજરાતી",
    "region": "Gujarat, Daman & Diu",
    "script": "Gujarati",
    "dir": "ltr"
  },
  {
    "code": "ta",
    "name": "Tamil",
    "nativeName": "தமிழ்",
    "region": "Tamil Nadu, Puducherry",
    "script": "Tamil",
    "dir": "ltr"
  },
  {
    "code": "te",
    "name": "Telugu",
    "nativeName": "తెలుగు",
    "region": "Andhra Pradesh, Telangana",
    "script": "Telugu",
    "dir": "ltr"
  },
  {
    "code": "kn",
    "name": "Kannada",
    "nativeName": "ಕನ್ನಡ",
    "region": "Karnataka",
    "script": "Kannada",
    "dir": "ltr"
  },
  {
    "code": "ml",
    "name": "Malayalam",
    "nativeName": "മലയാളം",
    "region": "Kerala, Lakshadweep",
    "script": "Malayalam",
    "dir": "ltr"
  },
  {
    "code": "pa",
    "name": "Punjabi",
    "nativeName": "ਪੰਜਾਬੀ",
    "region": "Punjab, Chandigarh, Delhi",
    "script": "Gurmukhi",
    "dir": "ltr"
  },
  {
    "code": "or",
    "name": "Odia",
    "nativeName": "ଓଡ଼ିଆ",
    "region": "Odisha",
    "script": "Odia",
    "dir": "ltr"
  },
  {
    "code": "as",
    "name": "Assamese",
    "nativeName": "অসমীয়া",
    "region": "Assam",
    "script": "Bengali-Assamese",
    "dir": "ltr"
  },
  {
    "code": "ur",
    "name": "Urdu",
    "nativeName": "اردو",
    "region": "J&K, Telangana, UP, Bihar, Delhi",
    "script": "Perso-Arabic",
    "dir": "rtl"
  },
  {
    "code": "sa",
    "name": "Sanskrit",
    "nativeName": "संस्कृतम्",
    "region": "Pan-India / Classical",
    "script": "Devanagari",
    "dir": "ltr"
  },
  {
    "code": "ks",
    "name": "Kashmiri",
    "nativeName": "کٲشُر",
    "region": "Jammu & Kashmir",
    "script": "Perso-Arabic",
    "dir": "rtl"
  },
  {
    "code": "ne",
    "name": "Nepali",
    "nativeName": "नेपाली",
    "region": "Sikkim, West Bengal",
    "script": "Devanagari",
    "dir": "ltr"
  },
  {
    "code": "kok",
    "name": "Konkani",
    "nativeName": "कोंकणी",
    "region": "Goa, Maharashtra, Karnataka",
    "script": "Devanagari",
    "dir": "ltr"
  },
  {
    "code": "sd",
    "name": "Sindhi",
    "nativeName": "سنڌي",
    "region": "Gujarat, Rajasthan, Maharashtra",
    "script": "Perso-Arabic",
    "dir": "rtl"
  },
  {
    "code": "mai",
    "name": "Maithili",
    "nativeName": "मैथिली",
    "region": "Bihar, Jharkhand",
    "script": "Devanagari",
    "dir": "ltr"
  },
  {
    "code": "doi",
    "name": "Dogri",
    "nativeName": "डोगरी",
    "region": "Jammu & Kashmir, Himachal Pradesh",
    "script": "Devanagari",
    "dir": "ltr"
  },
  {
    "code": "brx",
    "name": "Bodo",
    "nativeName": "बड़ो",
    "region": "Assam / Bodoland",
    "script": "Devanagari",
    "dir": "ltr"
  },
  {
    "code": "sat",
    "name": "Santali",
    "nativeName": "ᱥᱟᱱᱛᱟᱲᱤ",
    "region": "Jharkhand, Odisha, West Bengal",
    "script": "Ol Chiki",
    "dir": "ltr"
  },
  {
    "code": "mni",
    "name": "Manipuri",
    "nativeName": "ꯃꯤꯇꯩꯂꯣꯟ",
    "region": "Manipur",
    "script": "Meitei Mayek / Bengali",
    "dir": "ltr"
  }
];

export const RTL_LANGUAGES = ['ur', 'ks', 'sd'] as const

export function isRTL(code: string): boolean {
  return RTL_LANGUAGES.includes(code as (typeof RTL_LANGUAGES)[number])
}

export function getLanguageMeta(code: string): LanguageMeta {
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.code === code)
  return match ?? SUPPORTED_LANGUAGES[0] // fallback to English
}
