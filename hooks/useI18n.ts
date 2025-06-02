import { useEffect, useState } from 'react';
import { useUser } from './useUser';
import { setI18nLocale, t, addLocaleChangeListener } from '@/lib/i18n';

export function useI18n() {
  const { profile } = useUser();
  const [locale, setLocale] = useState(profile?.language || 'en');
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // Set locale based on user's language preference
    if (profile?.language) {
      setI18nLocale(profile.language);
      setLocale(profile.language);
    } else {
      setI18nLocale();
      setLocale('en');
    }
  }, [profile?.language]);

  // Listen for locale changes to force component re-renders
  useEffect(() => {
    const removeListener = addLocaleChangeListener(() => {
      forceUpdate({});
    });
    
    return removeListener;
  }, []);

  return {
    t,
    locale,
  };
} 