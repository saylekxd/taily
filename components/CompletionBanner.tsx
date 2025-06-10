import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface CompletionBannerProps {
  isCompleted: boolean;
  completionText: string;
}

export default function CompletionBanner({ 
  isCompleted, 
  completionText 
}: CompletionBannerProps) {
  if (!isCompleted) return null;

  return (
    <View style={styles.completionBanner}>
      <Text style={styles.completionText}>{completionText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  completionBanner: {
    position: 'absolute',
    top: 100, // Adjust to not overlay navbar
    left: 0,
    right: 0,
    bottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1, // Lower z-index so navbar stays on top
  },
  completionText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 24,
    color: colors.white,
  },
}); 