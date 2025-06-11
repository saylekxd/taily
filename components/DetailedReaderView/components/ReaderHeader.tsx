import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X, Settings } from 'lucide-react-native';
import { ReaderHeaderProps } from '../types';

export default function ReaderHeader({
  title,
  onClose,
  onSettingsToggle,
  colorTheme,
  isFullscreen,
}: ReaderHeaderProps) {
  if (isFullscreen) return null;

  return (
    <View style={[styles.header, { 
      backgroundColor: colorTheme.background,
      borderBottomColor: colorTheme.text + '20'
    }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
          <X size={24} color={colorTheme.text} />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.headerTitle, { color: colorTheme.text }]} numberOfLines={1}>
        {title}
      </Text>
      
      <View style={styles.headerRight}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={onSettingsToggle}
        >
          <Settings size={24} color={colorTheme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 44,
  },
  headerRight: {
    width: 44,
    alignItems: 'flex-end',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    textAlign: 'center',
  },
}); 