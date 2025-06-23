import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscriptionService, SubscriptionStatus } from '@/services/subscriptionService';
import { revenueCatService } from '@/services/revenueCatService';
import { supabase } from '@/lib/supabase';

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  isInitialized: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  refreshSubscription: async () => {},
  isInitialized: false,
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeSubscription();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await initializeSubscription();
        } else if (event === 'SIGNED_OUT') {
          setSubscription(null);
          setLoading(false);
          setIsInitialized(false);
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  const initializeSubscription = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      // Initialize RevenueCat with user
      try {
        await revenueCatService.identifyUser(user.id);
        
        // Sync subscription status from RevenueCat
        await revenueCatService.syncSubscriptionStatus();
      } catch (revenueCatError) {
        console.warn('RevenueCat initialization failed:', revenueCatError);
        // Continue with local subscription check even if RevenueCat fails
      }
      
      // Load current status from our database
      await refreshSubscription();
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing subscription:', error);
      setSubscription({ isPremium: false, status: 'free' });
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubscription(null);
        return;
      }
      
      setLoading(true);
      const status = await subscriptionService.getUserSubscriptionStatus(user.id);
      setSubscription(status);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      // Fallback to free tier on error
      setSubscription({ isPremium: false, status: 'free' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      refreshSubscription,
      isInitialized
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

/**
 * Hook to check if user has premium access
 */
export const usePremium = () => {
  const { subscription, loading } = useSubscription();
  
  return {
    isPremium: subscription?.isPremium ?? false,
    loading,
    expiresAt: subscription?.expiresAt,
    status: subscription?.status ?? 'free'
  };
};

/**
 * Hook to check feature access with loading state
 */
export const useFeatureAccess = () => {
  const { subscription, loading } = useSubscription();
  
  const checkFeature = (feature: 'ai_stories' | 'audio_generation' | 'full_reading') => {
    if (loading) return { hasAccess: false, loading: true };
    
    const isPremium = subscription?.isPremium ?? false;
    
    switch (feature) {
      case 'ai_stories':
        return { hasAccess: true, loading: false }; // Both free and premium have access (with different limits)
      case 'audio_generation':
        return { hasAccess: isPremium, loading: false };
      case 'full_reading':
        return { hasAccess: isPremium, loading: false };
      default:
        return { hasAccess: false, loading: false };
    }
  };
  
  return { checkFeature };
}; 