import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/hooks/useI18n';
import { colors } from '@/constants/colors';
import RotatingLogoDecorator from '@/components/RotatingLogoDecorator';

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }
    // Always reset loading state - navigation is handled by auth state change
    setLoading(false);
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.tailyapp.io/privacy');
  };

  const openTermsOfUse = () => {
    Linking.openURL('https://www.tailyapp.io/terms');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://jiqflpvashecttmtyelw.supabase.co/storage/v1/object/public/marketing//App-Icon-1024x1024@1x.png' }}
              style={styles.logo}
            />
            <RotatingLogoDecorator
              source={require('@/assets/images/black_circle_360x360.png')}
              style={styles.logoDecorator}
            />
          </View>
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('auth.signInSubtitle')}</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('common.email')}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder={t('common.password')}
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common.loading') : t('auth.signIn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => router.push('/auth/forgot-password')}
          >
            <Text style={styles.linkText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.dontHaveAccount')}</Text>
          <TouchableOpacity 
            onPress={() => router.push('/auth/sign-up')}
          >
            <Text style={styles.linkText}>{t('auth.signUp')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legalLinks}>
          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={openPrivacyPolicy}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}> • </Text>
            <TouchableOpacity onPress={openTermsOfUse}>
              <Text style={styles.legalLinkText}>Terms of Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  logoDecorator: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 50,
    height: 50,
    borderRadius: 16,
  },
  title: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 32,
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    color: colors.white,
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
  },
  linkButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  linkText: {
    color: colors.primary,
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textSecondary,
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  legalLinks: {
    marginTop: 32,
    alignItems: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLinkText: {
    color: colors.textSecondary,
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: colors.textSecondary,
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
  },
});