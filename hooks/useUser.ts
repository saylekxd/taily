import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Session } from '@supabase/supabase-js';
import { ReadingSettings } from '@/types';

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
  reading_settings?: ReadingSettings;
};

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);

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
        // Check if in guest mode first
        const guestMode = await AsyncStorage.getItem('isGuestMode');
        const isGuest = guestMode === 'true';
        setIsGuestMode(isGuest);
        
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          setUser(data.session.user);
          const userProfile = await loadProfile(data.session.user.id);
          setProfile(userProfile);
          // If user signs in, exit guest mode
          if (isGuest) {
            await AsyncStorage.removeItem('isGuestMode');
            setIsGuestMode(false);
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        if (session?.user) {
          setUser(session.user);
          const userProfile = await loadProfile(session.user.id);
          setProfile(userProfile);
          // Exit guest mode when user signs in
          await AsyncStorage.removeItem('isGuestMode');
          setIsGuestMode(false);
        } else {
          setUser(null);
          setProfile(null);
          // Check if returning to guest mode
          const guestMode = await AsyncStorage.getItem('isGuestMode');
          setIsGuestMode(guestMode === 'true');
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    const userProfile = await loadProfile(user.id);
    setProfile(userProfile);
  }, [user, loadProfile]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const exitGuestMode = async () => {
    await AsyncStorage.removeItem('isGuestMode');
    setIsGuestMode(false);
  };

  return {
    user,
    profile,
    loading,
    isGuestMode,
    refreshProfile,
    logout,
    exitGuestMode,
  };
}