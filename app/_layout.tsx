import { useEffect, useState } from 'react';
import { Redirect, Stack } from 'expo-router';
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
import { View, ActivityIndicator } from 'react-native';
import { AppProvider } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/colors';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-Bold': Nunito_700Bold,
    'Nunito-ExtraBold': Nunito_800ExtraBold,
    'Quicksand-Medium': Quicksand_500Medium,
    'Quicksand-Bold': Quicksand_700Bold,
  });

  useEffect(() => {
    async function checkAuthState() {
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
            setInitialRoute('/(tabs)');
          } else {
            setInitialRoute('/onboarding');
          }
        } else {
          setInitialRoute('/auth/sign-in');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        setInitialRoute('/auth/sign-in');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthState();
  }, []);

  // Hide splash screen once fonts are loaded and authentication is checked
  useEffect(() => {
    if ((fontsLoaded || fontError) && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isLoading]);

  // Return loading indicator until everything is ready
  if (!fontsLoaded || isLoading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
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
  );
}