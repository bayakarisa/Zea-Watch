/**
 * i18n Configuration
 * Sets up internationalization for English and Swahili
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../public/locales/en.json';
import swTranslations from '../public/locales/sw.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      sw: {
        translation: swTranslations,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'sw'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'zeawatch_language',
    },
  });

export default i18n;


