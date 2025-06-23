import React, { createContext, useContext, useState, useEffect } from 'react';
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
      const status = await subscriptionService.getUserSubscriptionStatus(user.id);
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

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}; 