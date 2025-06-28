import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

type AppContextType = {
  session: Session | null;
  language: 'en' | 'pl';
  isGuestMode: boolean;
  setLanguage: (lang: 'en' | 'pl') => void;
  setGuestMode: (isGuest: boolean) => void;
  exitGuestMode: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [language, setLanguage] = useState<'en' | 'pl'>('en');
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);

  useEffect(() => {
    // Initialize session and guest mode
    const initializeApp = async () => {
      // Check guest mode status
      const guestMode = await AsyncStorage.getItem('isGuestMode');
      setIsGuestMode(guestMode === 'true');

    // Initialize session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
        // If user signs in, exit guest mode
        if (session && guestMode === 'true') {
          AsyncStorage.removeItem('isGuestMode');
          setIsGuestMode(false);
        }
    });
    };

    initializeApp();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        // If user signs in, exit guest mode
        if (session) {
          await AsyncStorage.removeItem('isGuestMode');
          setIsGuestMode(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const setGuestMode = async (isGuest: boolean) => {
    setIsGuestMode(isGuest);
    if (isGuest) {
      await AsyncStorage.setItem('isGuestMode', 'true');
    } else {
      await AsyncStorage.removeItem('isGuestMode');
    }
  };

  const exitGuestMode = async () => {
    await AsyncStorage.removeItem('isGuestMode');
    setIsGuestMode(false);
  };

  return (
    <AppContext.Provider
      value={{
        session,
        language,
        isGuestMode,
        setLanguage,
        setGuestMode,
        exitGuestMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}