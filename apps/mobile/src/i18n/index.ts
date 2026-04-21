import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { pt } from './pt';
import { en } from './en';

const resources = {
  pt: { translation: pt },
  en: { translation: en },
};

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'pt';
const supportedLanguage = ['pt', 'en'].includes(deviceLanguage) ? deviceLanguage : 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: supportedLanguage,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });

export default i18n;
export { pt, en };
