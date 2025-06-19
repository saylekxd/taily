import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://4d9815c1684b31ba7afbaf3f7c81ddad@o4508910073348096.ingest.de.sentry.io/4509524948156496',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-Bold': Nunito_700Bold,
    'Nunito-ExtraBold': Nunito_800ExtraBold,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-Bold': Quicksand_700Bold,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      const checkAuthState = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Check if user has completed onboarding
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', session.user.id)
              .single();
            
            if (profile?.onboarding_completed) {
              router.replace('/(tabs)');
            } else {
              router.replace('/onboarding');
            }
          } else {
            router.replace('/auth/sign-in');
          }
        } catch (error) {
          console.error('Error checking auth state:', error);
          router.replace('/auth/sign-in');
        } finally {
          SplashScreen.hideAsync();
        }
      };

      checkAuthState();

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', session.user.id)
                .single();
              
              if (profile?.onboarding_completed) {
                router.replace('/(tabs)');
              } else {
                router.replace('/onboarding');
              }
            } catch (error) {
              console.error('Error checking profile after sign in:', error);
              router.replace('/onboarding');
            }
          } else if (event === 'SIGNED_OUT') {
            router.replace('/auth/sign-in');
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fontsLoaded, router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="story/[id]" options={{ 
            headerShown: true, 
            headerTitle: '',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.white,
            presentation: 'modal'
          }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
});