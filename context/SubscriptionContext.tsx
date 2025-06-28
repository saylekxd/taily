import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { subscriptionService, SubscriptionStatus } from '@/services/subscriptionService';
import { revenueCatService } from '@/services/revenueCatService';
import { useUser } from '@/hooks/useUser';

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  refreshSubscription: async () => {}
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initializeSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  // Refresh subscription when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user) {
        console.log('App became active, refreshing subscription status...');
        refreshSubscription();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [user]);

  const initializeSubscription = async () => {
    if (!user) return;
    
    try {
      // Initialize RevenueCat with user
      await revenueCatService.identifyUser(user.id);
      
      // Don't sync immediately - just load current status from database
      // This prevents overwriting recent purchases that RevenueCat hasn't processed yet
      console.log('Loading subscription status from database...');
      
      // Load current status
      await refreshSubscription();
      
      // Sync with RevenueCat after a delay to allow purchases to process
      setTimeout(async () => {
        try {
          console.log('Delayed sync with RevenueCat...');
          await revenueCatService.syncSubscriptionStatus();
          // Refresh again after sync
          await refreshSubscription();
        } catch (error) {
          console.error('Error in delayed sync:', error);
        }
      }, 5000); // 5 second delay
      
    } catch (error) {
      console.error('Error initializing subscription:', error);
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (!user) {
      console.log('No user, skipping subscription refresh');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Refreshing subscription status for user:', user.id);
      const status = await subscriptionService.getUserSubscriptionStatus(user.id);
      console.log('Updated subscription status:', status);
      setSubscription(status);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      // If error occurs (e.g., user signed out), reset subscription
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      refreshSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
} 