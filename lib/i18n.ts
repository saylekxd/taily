import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// Import translation files
import en from '../locales/en.json';
import pl from '../locales/pl.json';

// Create i18n instance
const i18n = new I18n();

// Set translations
i18n.translations = { en, pl };

// Enable fallback to English
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Locale change listeners
let localeChangeListeners: (() => void)[] = [];

// Function to add locale change listener
export const addLocaleChangeListener = (listener: () => void) => {
  localeChangeListeners.push(listener);
  return () => {
    localeChangeListeners = localeChangeListeners.filter(l => l !== listener);
  };
};

// Function to notify locale change listeners
const notifyLocaleChange = () => {
  localeChangeListeners.forEach(listener => listener());
};

// Function to set locale based on user preference or device locale
export const setI18nLocale = (userLanguage?: string) => {
  const previousLocale = i18n.locale;
  
  if (userLanguage) {
    i18n.locale = userLanguage;
  } else {
    // Fallback to device locale
    const deviceLanguage = getLocales()[0]?.languageCode || 'en';
    i18n.locale = deviceLanguage === 'pl' ? 'pl' : 'en';
  }
  
  // Notify listeners if locale changed
  if (previousLocale !== i18n.locale) {
    notifyLocaleChange();
  }
};

// Initialize with device locale
setI18nLocale();

// Translation function with type safety
export const t = (key: string, options?: any) => {
  return i18n.t(key, options);
};

// Export the i18n instance for direct access if needed
export default i18n; 