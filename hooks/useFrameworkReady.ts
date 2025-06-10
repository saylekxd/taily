import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    // Only call frameworkReady in web environment with proper error handling
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        // Add additional checks to prevent Metro bundler issues in cloud environments
        if (typeof window.frameworkReady === 'function') {
          window.frameworkReady();
        }
      } catch (error) {
        // Silently handle any errors to prevent Metro bundler issues
        // This is especially important in cloud environments like Bolt.new
        console.debug('frameworkReady call failed:', error);
      }
    }
  }, []);
}
