'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

import commonEn from '../public/locales/en/common.json';
import diseasesEn from '../public/locales/en/diseases.json';

// Initialize i18next instance
// We only use HttpBackend on the client side to avoid "Failed to parse URL" errors on server
// where relative paths are not supported by fetch.
if (typeof window !== 'undefined') {
  i18n.use(HttpBackend);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'sw', 'am', 'fr'], // Supported languages
    ns: ['common', 'diseases'], // Namespaces
    defaultNS: 'common',
    fallbackNS: 'common',
    debug: process.env.NODE_ENV === 'development',

    // Bundle English translations for SSR to avoid hydration mismatch
    resources: {
      en: {
        common: commonEn,
        diseases: diseasesEn,
      },
    },
    partialBundledLanguages: true, // Allow other languages to be loaded via backend

    interpolation: {
      escapeValue: false, // React safe
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'zeawatch_locale',
    },

    // React-specific options
    react: {
      useSuspense: false // Avoids suspense issues during initial load
    }
  });

export default i18n;
