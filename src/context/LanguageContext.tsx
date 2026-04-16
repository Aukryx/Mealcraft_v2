import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../database/db';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isFr: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  isFr: true,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    // Charger la langue depuis la DB au démarrage
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'language'"
    ).then((row) => {
      if (row?.value === 'en') setLanguageState('en');
    }).catch(() => {});
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('language', ?)",
        [lang]
      );
    } catch {}
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isFr: language === 'fr' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
