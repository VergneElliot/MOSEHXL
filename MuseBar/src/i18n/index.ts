import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AppLanguage, resources } from './resources';
export type { AppLanguage } from './resources';

const LANGUAGE_STORAGE_KEY = 'musebar_language';

function resolveInitialLanguage(): AppLanguage {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'fr' || stored === 'en') {
    return stored;
  }

  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function setAppLanguage(language: AppLanguage): void {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  void i18n.changeLanguage(language);
}

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resolveInitialLanguage(),
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    ns: ['common', 'auth'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

export default i18n;
