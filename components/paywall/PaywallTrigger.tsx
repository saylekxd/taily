import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { X, Check, Crown } from 'lucide-react-native';
import { ParentalGate } from './ParentalGate';

interface PaywallTriggerProps {
  visible: boolean;
  onClose: () => void;
  feature: 'ai_story' | 'audio_generation' | 'full_reading';
  customMessage?: string;
}

export function PaywallTrigger({ visible, onClose, feature, customMessage }: PaywallTriggerProps) {
  const [showParentalGate, setShowParentalGate] = useState(false);

  const getFeatureDetails = () => {
    switch (feature) {
      case 'ai_story':
        return {
          icon: '🤖',
          title: 'More AI Stories Available',
          message: customMessage || 'You\'ve used your 2 lifetime AI stories. Upgrade to Premium for 2 new stories every day!',
          benefits: ['2 AI stories daily', 'Unlimited story reading', '2 monthly audio generations']
        };
      case 'audio_generation':
        return {
          icon: '🎵',
          title: 'Audio Generation',
          message: customMessage || 'Audio generation is a Premium feature. Upgrade to bring your stories to life!',
          benefits: ['2 audio stories monthly', '2 AI stories daily', 'Unlimited story reading']
        };
      case 'full_reading':
        return {
          icon: '📖',
          title: 'Read the Full Story',
          message: customMessage || 'Upgrade to Premium to read the complete story without limitations!',
          benefits: ['Full story access', '2 AI stories daily', '2 monthly audio generations']
        };
      default:
        return {
          icon: '✨',
          title: 'Premium Feature',
          message: 'This feature requires Premium subscription.',
          benefits: ['All premium features']
        };
    }
  };

  const details = getFeatureDetails();

  const handleUpgrade = () => {
    // Show parental gate first before navigating to paywall
    setShowParentalGate(true);
  };

  const handleParentalGateSuccess = () => {
    setShowParentalGate(false);
    onClose();
    router.push('/paywall');
  };

  const handleParentalGateCancel = () => {
    setShowParentalGate(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={20} color={colors.white} />
            </TouchableOpacity>
            
            <Crown size={40} color={colors.accent} />
            <Text style={styles.icon}>{details.icon}</Text>
            <Text style={styles.title}>{details.title}</Text>
          </View>
          
          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.message}>{details.message}</Text>
            
            <View style={styles.benefitsList}>
              {details.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Check size={16} color={colors.success} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={handleUpgrade}
            >
              <LinearGradient
                colors={[colors.primary, '#FF8E8E']}
                style={styles.upgradeButtonGradient}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                <Text style={styles.upgradeButtonSubtext}>View Plans & Pricing</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Parental Gate Modal */}
      <ParentalGate
        visible={showParentalGate}
        onSuccess={handleParentalGateSuccess}
        onCancel={handleParentalGateCancel}
        purpose="purchase"
        description={`You are about to access premium subscription options for ${details.title}. This will allow your child to purchase premium features.`}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  message: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  benefitsList: {
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  benefitText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.white,
    flex: 1,
    marginLeft: 12,
  },
  buttons: {
    padding: 24,
    paddingTop: 16,
  },
  upgradeButton: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  upgradeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontFamily: 'Nunito-Bold',
    color: colors.white,
    fontSize: 18,
  },
  upgradeButtonSubtext: {
    fontFamily: 'Nunito-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Nunito-Regular',
    color: colors.textSecondary,
    fontSize: 16,
  },
}); 