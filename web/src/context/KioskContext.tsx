import { createContext, useContext } from 'react';
import type { Language } from '../i18n';

interface KioskContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const KioskContext = createContext<KioskContextType>({
  language: 'en',
  setLanguage: () => {},
});

export const useKiosk = () => useContext(KioskContext);
