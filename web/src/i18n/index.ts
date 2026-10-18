import { en } from './en';
import { hi } from './hi';
import { gu } from './gu';

export type Language = 'en' | 'hi' | 'gu';

export const translations = { en, hi, gu };

export const getTranslation = (lang: Language = 'en') => {
  return translations[lang] || translations.en;
};
