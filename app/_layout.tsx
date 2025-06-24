import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import { 
  Nunito_400Regular, 
  Nunito_700Bold,
  Nunito_800ExtraBold 
} from '@expo-google-fonts/nunito';
import { 
  Quicksand_500Medium,
  Quicksand_700Bold 
} from '@expo-google-fonts/quicksand';
import { SplashScreen } from 'expo-router';
import { AppProvider } from '@/context/AppContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import { revenueCatService } from '@/services/revenueCatService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { appReadinessManager } from '@/utils/appReadiness';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://4d9815c1684b31ba7afbaf3f7c81ddad@o4508910073348096.ingest.de.sentry.io/4509524948156496',

  // Enhanced debugging configuration
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production',
  
  // Adds more context data to events (IP address, cookies, user, etc.)
  sendDefaultPii: true,

  // Session Replay disabled to prevent crashes in production
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: [Sentry.feedbackIntegration()],
  
  // Enhanced error capture for better stack traces
  beforeSend(event) {
    // Add more context to help with debugging
    if (event.exception) {
      console.log('Sentry capturing exception:', event.exception);
    }
    return event;
  },
  
  // Better error boundaries
  enableNativeCrashHandling: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Safe navigation helper with better error handling
const safeNavigate = (router: any, path: string) => {
  try {
    console.log('Attempting to navigate to:', path);
    router.replace(path);
  } catch (error) {
    console.warn('Navigation error, attempting fallback:', error);
    // Fallback to default route if navigation fails
    try {
      router.replace('/auth/sign-in');
    } catch (fallbackError) {
      console.error('Fallback navigation also failed:', fallbackError);
      // Last resort - try to navigate to root
      try {
        router.replace('/');
      } catch (lastError) {
        console.error('All navigation attempts failed:', lastError);
      }
    }
  }
};

export default Sentry.wrap(function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const [appError, setAppError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-Bold': Nunito_700Bold,
    'Nunito-ExtraBold': Nunito_800ExtraBold,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-Bold': Quicksand_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
      setAppError('Failed to load fonts');
      SplashScreen.hideAsync();
    }
  }, [fontError]);

  useEffect(() => {
    console.log('Fonts loaded:', fontsLoaded);
    if (fontsLoaded) {
      const checkAuthState = async () => {
        try {
          console.log('Starting auth state check...');
          
          // Initialize RevenueCat on app startup with crash protection
          try {
            await revenueCatService.initialize();
            console.log('RevenueCat initialized successfully');
          } catch (error) {
            console.error('Failed to initialize RevenueCat during startup:', error);
            // Continue app startup even if RevenueCat fails
          }

          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Error getting session:', sessionError);
            safeNavigate(router, '/auth/sign-in');
            return;
          }
          
          console.log('Session check result:', !!session);
          
          if (session) {
            // Check if user has completed onboarding
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', session.user.id)
                .single();
              
              if (profileError) {
                console.error('Error fetching profile:', profileError);
                safeNavigate(router, '/onboarding');
                return;
              }
              
              console.log('Profile data:', profile);
              
              if (profile?.onboarding_completed) {
                console.log('Navigating to tabs...');
                safeNavigate(router, '/(tabs)');
              } else {
                console.log('Navigating to onboarding...');
                safeNavigate(router, '/onboarding');
              }
            } catch (error) {
              console.error('Error in profile check:', error);
              safeNavigate(router, '/onboarding');
            }
          } else {
            console.log('No session, navigating to auth...');
            safeNavigate(router, '/auth/sign-in');
          }
        } catch (error) {
          console.error('Error checking auth state:', error);
          safeNavigate(router, '/auth/sign-in');
        } finally {
          // Set app as ready for speech functionality after initialization is complete
          setTimeout(() => {
            appReadinessManager.setReady();
            console.log('App ready set, hiding splash screen...');
            SplashScreen.hideAsync();
          }, 1000); // Small delay to ensure everything is settled
        }
      };

      checkAuthState();

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state change:', event, !!session);
          if (event === 'SIGNED_IN' && session) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', session.user.id)
                .single();
              
              if (profile?.onboarding_completed) {
                safeNavigate(router, '/(tabs)');
              } else {
                safeNavigate(router, '/onboarding');
              }
            } catch (error) {
              console.error('Error checking profile after sign in:', error);
              safeNavigate(router, '/onboarding');
            }
          } else if (event === 'SIGNED_OUT') {
            safeNavigate(router, '/auth/sign-in');
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fontsLoaded, router]);

  console.log('RootLayout render - fontsLoaded:', fontsLoaded, 'fontError:', fontError, 'appError:', appError);

  // Show error screen if there's an app error
  if (appError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: colors.white, fontSize: 18, textAlign: 'center' }}>
          Error: {appError}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 10 }}>
          Please restart the app
        </Text>
      </View>
    );
  }

  if (!fontsLoaded && !fontError) {
    console.log('Fonts not loaded yet, showing nothing...');
    return null;
  }

  console.log('Rendering app with Stack...');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <SubscriptionProvider>
          <StatusBar style="light" />
          <Stack 
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="paywall" options={{ 
              presentation: 'modal',
              headerShown: true,
              headerTitle: 'Upgrade to Premium',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.white,
            }} />
            <Stack.Screen name="story/[id]" options={{ 
              headerShown: true, 
              headerTitle: '',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.white,
              presentation: 'modal'
            }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </SubscriptionProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
});