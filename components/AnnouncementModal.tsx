import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ExternalLink, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { Announcement, announcementService } from '@/services/announcementService';

interface AnnouncementModalProps {
  visible: boolean;
  announcement: Announcement | null;
  onClose: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

export default function AnnouncementModal({ visible, announcement, onClose }: AnnouncementModalProps) {
  const router = useRouter();

  if (!announcement) {
    return null;
  }

  const handleAction = async () => {
    if (announcementService.shouldOpenInBrowser(announcement)) {
      const url = announcementService.getActionUrl(announcement);
      if (url) {
        try {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
            onClose();
          } else {
            Alert.alert('Error', 'Cannot open this link');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to open link');
        }
      }
    } else if (announcementService.shouldOpenInApp(announcement)) {
      const targetScreen = announcementService.getTargetScreen(announcement);
      if (targetScreen) {
        onClose();
        router.push(targetScreen as any);
      }
    }
  };

  const backgroundColor = announcement.background_color || colors.primary;
  const textColor = announcement.text_color || colors.white;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header with close button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero image section */}
          <View style={[styles.heroContainer, { backgroundColor }]}>
            {announcement.image_url ? (
              <Image 
                source={{ uri: announcement.image_url }} 
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : null}
            
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
              style={styles.heroOverlay}
            />
            
            <View style={styles.heroContent}>
              {/* Priority badge */}
              {announcement.priority > 3 && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              )}
              
              {/* Title */}
              <Text style={[styles.heroTitle, { color: textColor }]}>
                {announcement.title}
              </Text>
            </View>
          </View>

          {/* Content section */}
          <View style={styles.contentSection}>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>
                {announcement.description}
              </Text>
            </View>

            {/* Action button */}
            {(announcement.action_url || announcement.target_screen) && (
              <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
                <LinearGradient
                  colors={['#ff6b6b', '#ff5252']}
                  style={styles.actionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.actionButtonContent}>
                    <Text style={styles.actionButtonText}>
                      {announcementService.shouldOpenInBrowser(announcement) 
                        ? 'Open Link' 
                        : 'Continue'}
                    </Text>
                    {announcementService.shouldOpenInBrowser(announcement) ? (
                      <ExternalLink size={20} color={colors.white} />
                    ) : (
                      <ArrowRight size={20} color={colors.white} />
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flex: 1,
  },
  heroContainer: {
    height: screenHeight * 0.5,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    padding: 24,
    paddingBottom: 32,
    zIndex: 1,
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff6b6b',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#ff6b6b',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  newBadgeText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: colors.white,
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 32,
    lineHeight: 38,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  contentSection: {
    padding: 24,
    paddingTop: 32,
  },
  descriptionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  descriptionText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    lineHeight: 26,
    color: colors.white,
  },
  actionButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#ff6b6b',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  actionButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginRight: 12,
    letterSpacing: 0.5,
  },
}); 