import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import type { User, Session as AuthSession, AuthChangeEvent } from '@supabase/supabase-js';

type Profile = {
  id: string;
  child_name: string;
  age: number;
  interests: string[];
  reading_level: 'beginner' | 'intermediate' | 'advanced';
  language: 'en' | 'pl';
  streak: number;
  total_stories_read: number;
  total_reading_time: number;
  onboarding_completed: boolean;
  created_at: string;
};

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error loading profile:', error);
      return null;
    }
    
    return data as Profile;
  }, []);

  // Initial auth check
  useEffect(() => {
    const checkUser = async () => {
      try {
        setSessionError(false);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setSessionError(true);
        } else if (data.session?.user) {
          setUser(data.session.user);
          const userProfile = await loadProfile(data.session.user.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        setSessionError(true);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Define handlers outside to ensure proper cleanup
    let handleVisibilityChange: (() => void) | undefined;
    let handleFocus: (() => void) | undefined;

    // Handle page visibility change for web
    if (Platform.OS === 'web') {
      handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Tab became visible, refreshing session...');
          checkUser();
        }
      };

      handleFocus = () => {
        console.log('Window focused, refreshing session...');
        checkUser();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
    }

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: AuthSession | null) => {
        console.log('Auth state changed:', event);
        setSessionError(false);
        
        if (session?.user) {
          setUser(session.user);
          const userProfile = await loadProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Return cleanup function
    return () => {
      subscription.unsubscribe();
      
      if (Platform.OS === 'web' && handleVisibilityChange && handleFocus) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    const userProfile = await loadProfile(user.id);
    setProfile(userProfile);
  }, [user, loadProfile]);

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSessionError(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear the session even if signOut fails
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to retry session
  const retrySession = async () => {
    setLoading(true);
    setSessionError(false);
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Retry session error:', error);
        setSessionError(true);
      } else if (data.session?.user) {
        setUser(data.session.user);
        const userProfile = await loadProfile(data.session.user.id);
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error retrying session:', error);
      setSessionError(true);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    loading,
    sessionError,
    refreshProfile,
    logout,
    retrySession,
  };
}