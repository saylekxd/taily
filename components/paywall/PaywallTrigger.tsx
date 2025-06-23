import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface PaywallTriggerProps {
  visible: boolean;
  onClose: () => void;
  feature: 'ai_story' | 'audio_generation' | 'full_reading';
  customMessage?: string;
}

export function PaywallTrigger({ visible, onClose, feature, customMessage }: PaywallTriggerProps) {
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
    onClose();
    router.push('/paywall');
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
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.header}
          >
            <Text style={styles.icon}>{details.icon}</Text>
            <Text style={styles.title}>{details.title}</Text>
          </LinearGradient>
          
          <View style={styles.content}>
            <Text style={styles.message}>{details.message}</Text>
            
            <View style={styles.benefitsList}>
              {details.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            <View style={styles.pricingPreview}>
              <Text style={styles.pricingText}>Starting at $3.99/month</Text>
              <Text style={styles.pricingSubtext}>Cancel anytime</Text>
            </View>
          </View>
          
          <View style={styles.buttons}>
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 16,
    color: '#4ade80',
    fontWeight: 'bold',
    marginRight: 12,
    width: 20,
  },
  benefitText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  pricingPreview: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  pricingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
  },
  pricingSubtext: {
    fontSize: 14,
    color: '#666',
  },
  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  upgradeButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
  },
}); 