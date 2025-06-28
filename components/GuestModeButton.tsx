import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Eye } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';

interface GuestModeButtonProps {
  onPress: () => void;
}

export default function GuestModeButton({ onPress }: GuestModeButtonProps) {
  const { t } = useI18n();

  return (
    <TouchableOpacity style={styles.guestButton} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Eye size={20} color={colors.textSecondary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.guestButtonText}>{t('welcome.browseAsGuest')}</Text>
        <Text style={styles.guestButtonSubtext}>{t('welcome.guestModeDescription')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  guestButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    marginBottom: 2,
  },
  guestButtonSubtext: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
}); 