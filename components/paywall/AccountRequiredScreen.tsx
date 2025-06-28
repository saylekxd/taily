import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { X, UserPlus } from 'lucide-react-native';

interface AccountRequiredScreenProps {
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  customFeatures?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export default function AccountRequiredScreen({
  onClose,
  title = "Account Required",
  subtitle = "Create an account to access Premium features",
  showCloseButton = true,
  customFeatures
}: AccountRequiredScreenProps) {
  
  // Navigate to the actual sign-up screen in /auth tab
  const handleSignUp = () => {
    router.push('/auth/sign-up');
  };

  // Navigate to the actual sign-in screen in /auth tab
  const handleSignIn = () => {
    router.push('/auth/sign-in');
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const defaultFeatures = [
    {
      icon: "🔒",
      title: "Secure Purchases",
      description: "Your subscription is safely linked to your account"
    },
    {
      icon: "📱",
      title: "Sync Across Devices",
      description: "Access your Premium features on all your devices"
    },
    {
      icon: "📊",
      title: "Progress Tracking",
      description: "Save reading progress and personalized content"
    }
  ];

  const features = customFeatures || defaultFeatures;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        {showCloseButton && (
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleClose}
          >
            <X size={24} color={colors.white} />
          </TouchableOpacity>
        )}
        
        <View style={styles.headerContent}>
          <UserPlus size={48} color={colors.primary} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {/* Benefits of Creating Account */}
      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Account Creation Buttons - Navigate to actual auth screens */}
      <View style={styles.pricingContainer}>
        <TouchableOpacity 
          style={styles.purchaseButton}
          onPress={handleSignUp}
        >
          <LinearGradient
            colors={[colors.primary, '#FF8E8E']}
            style={styles.purchaseButtonGradient}
          >
            <Text style={styles.purchaseButtonTitle}>
              Create Account
            </Text>
            <Text style={styles.purchaseButtonSubtext}>
              Join thousands of families on Taily
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleSignIn}
        >
          <Text style={styles.secondaryButtonText}>
            Already have an account? Sign In
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.cancelText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 28,
    color: colors.white,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginBottom: 8,
  },
  featureDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  pricingContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  purchaseButton: {
    borderRadius: 16,
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
  purchaseButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  purchaseButtonTitle: {
    fontFamily: 'Nunito-Bold',
    color: colors.white,
    fontSize: 20,
    marginBottom: 4,
  },
  purchaseButtonSubtext: {
    fontFamily: 'Nunito-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Nunito-Regular',
    color: colors.textSecondary,
    fontSize: 16,
  },
}); 