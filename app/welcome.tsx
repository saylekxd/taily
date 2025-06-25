import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/hooks/useI18n';
import { colors } from '@/constants/colors';
import { BookOpen, Sparkles } from 'lucide-react-native';
import FloatingStars from '@/components/FloatingStars';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [buttonsAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Start animations
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const markWelcomeSeen = async () => {
    await AsyncStorage.setItem('hasSeenWelcome', 'true');
  };

  const handleSignUp = async () => {
    await markWelcomeSeen();
    router.push('/auth/sign-up');
  };

  const handleSignIn = async () => {
    await markWelcomeSeen();
    router.push('/auth/sign-in');
  };

  return (
    <View style={styles.container}>
      <FloatingStars />
      
      {/* Logo and Title Section */}
      <Animated.View 
        style={[
          styles.headerSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing//App-Icon-1024x1024@1x.png' }}
            style={styles.logo}
          />
          <View style={styles.logoOverlay}>
            <BookOpen size={32} color={colors.white} />
          </View>
        </View>
        
        <Text style={styles.appName}>Taily</Text>
        <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Sparkles size={20} color={colors.primary} />
            <Text style={styles.featureText}>{t('welcome.personalizedStories')}</Text>
          </View>
          <View style={styles.feature}>
            <BookOpen size={20} color={colors.primary} />
            <Text style={styles.featureText}>{t('welcome.ageAppropriate')}</Text>
          </View>
          <View style={styles.feature}>
            <Sparkles size={20} color={colors.primary} />
            <Text style={styles.featureText}>{t('welcome.interactiveReading')}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Buttons Section */}
      <Animated.View 
        style={[
          styles.buttonsSection,
          {
            opacity: buttonsAnim,
            transform: [{ 
              translateY: buttonsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleSignUp}
        >
          <Text style={styles.primaryButtonText}>{t('welcome.getStarted')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleSignIn}
        >
          <Text style={styles.secondaryButtonText}>{t('welcome.signInToAccount')}</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>{t('welcome.joinThousands')}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  appName: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 48,
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Nunito-Regular',
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 280,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  buttonsSection: {
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
  },
  footerText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 