import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/colors';
import { Announcement } from '@/services/announcementService';

interface AnnouncementCardProps {
  announcement: Announcement;
  onPress: () => void;
}

export default function AnnouncementCard({ announcement, onPress }: AnnouncementCardProps) {
  const backgroundColor = announcement.background_color || colors.primary;
  const textColor = announcement.text_color || colors.white;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {announcement.image_url ? (
        <Image 
          source={{ uri: announcement.image_url }} 
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.backgroundFallback, { backgroundColor }]} />
      )}
      
      {/* Priority indicator for high priority announcements */}
      {announcement.priority > 3 && (
        <View style={styles.priorityBadge}>
          <Text style={styles.priorityText}>New</Text>
        </View>
      )}
      
      {/* Overlay gradient */}
      <View style={styles.overlay}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
          {announcement.title}
        </Text>
        <Text style={[styles.description, { color: textColor }]} numberOfLines={2}>
          {announcement.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundFallback: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 14,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 4,
    lineHeight: 24,
  },
  description: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 18,
  },
  priorityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff6b6b',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  priorityText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.5,
  },
}); 