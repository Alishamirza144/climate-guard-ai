import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const defaultLanguage = 'en'

const resources = {
  en: {
    translation: {
      nav: {
        dashboard: 'Live Dashboard',
        simulations: 'Simulations',
        methodology: 'Methodology',
        sources: 'Data Sources',
        alerts: 'Alerts',
        about: 'About Team',
      },
      alerts: {
        decisionSupport: 'Decision-support tool. Follow official advisories.',
      },
      app: {
        install: 'Install app',
        language: 'Language',
      },
    },
  },
  hi: {
    translation: {
      nav: {
        dashboard: 'लाइव डैशबोर्ड',
        simulations: 'सिमुलेशन',
        methodology: 'विधि',
        sources: 'डेटा स्रोत',
        alerts: 'अलर्ट',
        about: 'टीम के बारे में',
      },
      alerts: {
        decisionSupport: 'सहायक उपकरण। आधिकारिक सलाह का पालन करें।',
      },
      app: {
        install: 'ऐप इंस्टॉल करें',
        language: 'भाषा',
      },
    },
  },
  mr: {
    translation: {
      nav: {
        dashboard: 'लाइव्ह डॅशबोर्ड',
        simulations: 'सिम्युलेशन',
        methodology: 'पद्धत',
        sources: 'डेटा स्रोत',
        alerts: 'अलर्ट',
        about: 'संघाबद्दल',
      },
      alerts: {
        decisionSupport: 'निर्णय-सहाय्य साधन. अधिकृत सुचना लक्षात घ्या.',
      },
      app: {
        install: 'अ‍ॅप इंस्टॉल करा',
        language: 'भाषा',
      },
    },
  },
}

const savedLanguage = localStorage.getItem('climateguard-lang') ?? defaultLanguage

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: defaultLanguage,
  interpolation: { escapeValue: false },
})

export default i18n
