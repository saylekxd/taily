import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import * as Sentry from '@sentry/react-native';

interface UseAppStateRefreshOptions {
  onRefresh: () => Promise<void>;
  dependencies?: any[];
  refreshOnNetworkReconnect?: boolean;
  refreshDelay?: number;
}

export function useAppStateRefresh({
  onRefresh,
  dependencies = [],
  refreshOnNetworkReconnect = true,
  refreshDelay = 1000
}: UseAppStateRefreshOptions) {
  const appStateRef = useRef(AppState.currentState);
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);

  const refreshSession = useCallback(async () => {
    try {
      console.log('[AppStateRefresh] Refreshing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AppStateRefresh] Session refresh error:', error);
        Sentry.captureException(error);
        
        // Try to refresh the session token
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('[AppStateRefresh] Token refresh error:', refreshError);
          throw refreshError;
        }
        console.log('[AppStateRefresh] Session refreshed successfully');
      } else if (!session) {
        console.log('[AppStateRefresh] No active session');
      } else {
        console.log('[AppStateRefresh] Session is valid');
      }
      
      return true;
    } catch (error) {
      console.error('[AppStateRefresh] Failed to refresh session:', error);
      return false;
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      console.log('[AppStateRefresh] Already refreshing, skipping...');
      return;
    }

    // Prevent too frequent refreshes (within 5 seconds)
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 5000) {
      console.log('[AppStateRefresh] Too soon since last refresh, skipping...');
      return;
    }

    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;

    try {
      // First refresh the session
      const sessionRefreshed = await refreshSession();
      
      if (sessionRefreshed) {
        // Add a small delay to ensure session is properly updated
        await new Promise(resolve => setTimeout(resolve, refreshDelay));
        
        // Then refresh the data
        console.log('[AppStateRefresh] Calling onRefresh callback...');
        await onRefresh();
      }
    } catch (error) {
      console.error('[AppStateRefresh] Error during refresh:', error);
      Sentry.captureException(error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onRefresh, refreshSession, refreshDelay]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[AppStateRefresh] App state changed: ${appStateRef.current} -> ${nextAppState}`);
      
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[AppStateRefresh] App became active, triggering refresh...');
        handleRefresh();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleRefresh]);

  // Handle network reconnection
  useEffect(() => {
    if (!refreshOnNetworkReconnect) return;

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('[AppStateRefresh] Network reconnected, triggering refresh...');
        handleRefresh();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleRefresh, refreshOnNetworkReconnect]);

  // Refresh when dependencies change
  useEffect(() => {
    if (dependencies.length > 0) {
      handleRefresh();
    }
  }, dependencies);

  return {
    refresh: handleRefresh,
    isRefreshing: isRefreshingRef.current
  };
} 