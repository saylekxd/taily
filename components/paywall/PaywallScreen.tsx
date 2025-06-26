import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { revenueCatService } from '@/services/revenueCatService';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { X, Check, Crown } from 'lucide-react-native';
import { ParentalGate } from './ParentalGate';

export default function PaywallScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual'); // Default to annual for better value
  const [showParentalGate, setShowParentalGate] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const availableProducts = await revenueCatService.getProducts();
      setProducts(availableProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handlePurchase = async () => {
    // Show parental gate first
    setShowParentalGate(true);
  };

  const handleParentalGateSuccess = async () => {
    setShowParentalGate(false);
    
    const productId = selectedPlan === 'monthly' ? 'com.saylekxd.Tailyapp.Monthly' : 'com.saylekxd.Tailyapp.Annual';
    
    try {
      setLoading(true);
      await revenueCatService.purchaseProduct(productId);
      Alert.alert('Success!', 'Welcome to Premium! 🎉', [
        { text: 'Continue', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Purchase Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleParentalGateCancel = () => {
    setShowParentalGate(false);
  };

  const getPlanDetails = () => {
    if (selectedPlan === 'monthly') {
      return {
        price: '$4.99',
        period: 'month',
        totalYear: '$59.88',
        savings: null,
        title: 'Taily Premium Monthly',
        duration: '1 month',
        fullPrice: '$4.99 per month'
      };
    } else {
      return {
        price: '$39.99',
        period: 'year',
        totalYear: '$39.99',
        savings: '$19.89', // 33% discount compared to monthly
        title: 'Taily Premium Annual',
        duration: '1 year',
        fullPrice: '$39.99 per year'
      };
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      await revenueCatService.restorePurchases();
      Alert.alert('Restored!', 'Your purchases have been restored.');
    } catch (error) {
      Alert.alert('Restore Failed', 'No purchases found to restore.');
    } finally {
      setLoading(false);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.tailyapp.io/privacy');
  };

  const openTermsOfUse = () => {
    Linking.openURL('https://www.tailyapp.io/terms');
  };

  const openAppleEULA = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Crown size={48} color={colors.accent} />
          <Text style={styles.title}>✨ Unlock Premium</Text>
          <Text style={styles.subtitle}>Give your child the complete Taily experience</Text>
        </View>
      </View>

      {/* Plan Selection */}
      <View style={styles.pricingOverview}>
        <Text style={styles.pricingOverviewTitle}>Choose Your Plan</Text>
        <View style={styles.pricingComparison}>
          <TouchableOpacity 
            style={[
              styles.pricingOption,
              selectedPlan === 'monthly' && styles.selectedPricingOption
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={styles.pricingLabel}>Monthly</Text>
            <Text style={styles.pricingAmount}>$4.99</Text>
            <Text style={styles.pricingBilling}>per month</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.pricingOption, 
              styles.recommendedOption,
              selectedPlan === 'annual' && styles.selectedPricingOption
            ]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>BEST VALUE</Text>
            </View>
            <Text style={styles.pricingLabel}>Annual</Text>
            <Text style={styles.pricingAmount}>$39.99</Text>
            <Text style={styles.pricingBilling}>Only $3.33/month</Text>
            <Text style={styles.savingsHighlight}>Save $19.89/year</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <FeatureItem 
          icon="🤖" 
          title="2 AI Stories Daily" 
          description="Generate personalized stories every day featuring your child as the hero"
          highlight="vs. 2 lifetime stories"
        />
        <FeatureItem 
          icon="🎵" 
          title="Professional Voice Narration" 
          description="Listen to every non-personalized stories and generate 2 AI-narrated tales for your personalized stories monthly"
          highlight="Exclusive to Premium"
        />
        <FeatureItem 
          icon="📖" 
          title="Full Story Access" 
          description="Read complete stories without any limitations"
          highlight="vs. 20% preview only"
        />
        <FeatureItem 
          icon="🎯" 
          title="Daily Story Access" 
          description="Continue enjoying our curated daily stories"
          highlight="Always free"
        />
      </View>

      {/* Subscription Details */}
      <View style={styles.subscriptionInfo}>
        <Text style={styles.subscriptionInfoTitle}>Subscription Details</Text>
        <Text style={styles.subscriptionInfoText}>
          • Title: {getPlanDetails().title}{'\n'}
          • Length: {getPlanDetails().duration}{'\n'}
          • Price: {getPlanDetails().fullPrice}{'\n'}
          • Content: Unlimited AI-generated personalized stories, professional audio narration, and full story access
        </Text>
      </View>

      {/* Purchase Button */}
      <View style={styles.pricingContainer}>
        <TouchableOpacity 
          style={[styles.purchaseButton, loading && styles.disabledButton]}
          onPress={handlePurchase}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.primary, '#FF8E8E']}
            style={styles.purchaseButtonGradient}
          >
            <Text style={styles.purchaseButtonTitle}>
              Start Premium
            </Text>
            <Text style={styles.purchaseButtonPrice}>
              {selectedPlan === 'monthly' ? '$4.99 billed monthly' : '$39.99 billed annually'}
            </Text>
            <Text style={styles.purchaseButtonSubtext}>
              {getPlanDetails().savings ? `Save ${getPlanDetails().savings} vs monthly • ` : ''}Cancel anytime in Settings
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <View style={styles.subscriptionTerms}>
        <Text style={styles.termsText}>
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. 
          You can cancel anytime in your device's App Store settings. Payment will be charged to your iTunes Account at confirmation of purchase.
        </Text>
      </View>

      {/* Legal Links */}
      <View style={styles.legalSection}>
        <Text style={styles.legalSectionTitle}>Legal Information</Text>
        
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={openPrivacyPolicy} style={styles.legalLink}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={openTermsOfUse} style={styles.legalLink}>
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={openAppleEULA} style={styles.legalLink}>
            <Text style={styles.legalLinkText}>EULA</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleRestore} disabled={loading}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>

      {/* Parental Gate Modal */}
      <ParentalGate
        visible={showParentalGate}
        onSuccess={handleParentalGateSuccess}
        onCancel={handleParentalGateCancel}
        purpose="purchase"
        description={`You are about to purchase ${getPlanDetails().title} for ${getPlanDetails().fullPrice}. This subscription will automatically renew unless cancelled.`}
      />
    </ScrollView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  highlight: string;
}

function FeatureItem({ icon, title, description, highlight }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
        <View style={styles.featureHighlightContainer}>
          <Check size={14} color={colors.success} />
          <Text style={styles.featureHighlight}>{highlight}</Text>
        </View>
      </View>
    </View>
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
  pricingOverview: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  pricingOverviewTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  pricingComparison: {
    flexDirection: 'row',
    gap: 12,
  },
  pricingOption: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  recommendedOption: {
    backgroundColor: colors.cardLight,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedBadgeText: {
    fontFamily: 'Nunito-Bold',
    color: colors.white,
    fontSize: 10,
  },
  pricingLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    marginBottom: 8,
    marginTop: 12,
  },
  pricingAmount: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 4,
  },
  pricingBilling: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  savingsHighlight: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: colors.success,
  },
  selectedPricingOption: {
    borderColor: colors.primary,
    backgroundColor: colors.cardLight,
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
    marginBottom: 8,
  },
  featureHighlightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureHighlight: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: colors.success,
    marginLeft: 6,
  },
  subscriptionInfo: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  subscriptionInfoTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginBottom: 12,
  },
  subscriptionInfoText: {
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
  purchaseButtonPrice: {
    fontFamily: 'Nunito-Bold',
    color: colors.white,
    fontSize: 16,
    marginBottom: 4,
  },
  purchaseButtonSubtext: {
    fontFamily: 'Nunito-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  subscriptionTerms: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  termsText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  legalSectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  legalLink: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    alignItems: 'center',
  },
  legalLinkText: {
    fontFamily: 'Nunito-Regular',
    color: colors.primary,
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  restoreText: {
    fontFamily: 'Nunito-Regular',
    color: colors.primary,
    fontSize: 16,
    marginBottom: 16,
  },
  cancelText: {
    fontFamily: 'Nunito-Regular',
    color: colors.textSecondary,
    fontSize: 16,
  },
}); 