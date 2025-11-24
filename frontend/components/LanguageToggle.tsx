'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'sw' : 'en';
    i18n.changeLanguage(newLang);
    
    // Persist to localStorage
    localStorage.setItem('zeawatch_language', newLang);
    
    // Send analytics event (if analytics is set up)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'language_changed', {
        language: newLang,
      });
    }
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle language"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">
        {i18n.language === 'en' ? 'EN' : 'SW'}
      </span>
      <span className="text-gray-400">|</span>
      <span className="font-medium">
        {i18n.language === 'en' ? 'SW' : 'EN'}
      </span>
    </button>
  );
};


