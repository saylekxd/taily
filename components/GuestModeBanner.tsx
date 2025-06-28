import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserPlus, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';

interface GuestModeBannerProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export default function GuestModeBanner({ onDismiss, showDismiss = true }: GuestModeBannerProps) {
  const router = useRouter();
  const { t } = useI18n();

  const handleSignUp = () => {
    router.push('/auth/sign-up');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <UserPlus size={20} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t('guest.createAccountTitle')}</Text>
          <Text style={styles.description}>{t('guest.createAccountDescription')}</Text>
        </View>
        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>{t('auth.signUp')}</Text>
        </TouchableOpacity>
      </View>
      {showDismiss && onDismiss && (
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.white,
    marginBottom: 2,
  },
  description: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  signUpButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  signUpButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: colors.white,
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
}); 