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
      
      // Sync subscription status
      await revenueCatService.syncSubscriptionStatus();
      
      // Load current status
      await refreshSubscription();
    } catch (error) {
      console.error('Error initializing subscription:', error);
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Refreshing subscription status for user:', user.id);
      const status = await subscriptionService.getUserSubscriptionStatus(user.id);
      console.log('Updated subscription status:', status);
      setSubscription(status);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
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