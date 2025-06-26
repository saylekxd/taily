import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { revenueCatService } from '@/services/revenueCatService';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaywallScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual'); // Default to annual for better value

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
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.title}>✨ Unlock Premium Features</Text>
        <Text style={styles.subtitle}>Give your child the complete Taily experience</Text>
      </LinearGradient>

      <View style={styles.featuresContainer}>
        <FeatureItem 
          icon="🤖" 
          title="2 AI Stories Daily" 
          description="Generate personalized stories every day featuring your child as the hero"
          highlight="vs. 2 lifetime stories"
        />
        <FeatureItem 
          icon="🎵" 
          title="2 Audio Stories Monthly" 
          description="Listen to AI-generated stories with professional voice narration"
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

      <View style={styles.pricingContainer}>
        {/* Plan Selection */}
        <View style={styles.planSelector}>
          <TouchableOpacity 
            style={[
              styles.planOption, 
              selectedPlan === 'annual' && styles.selectedPlan
            ]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.planHeader}>
              <Text style={[
                styles.planTitle,
                selectedPlan === 'annual' && styles.selectedPlanText
              ]}>
                Annual Plan
              </Text>
              {selectedPlan === 'annual' && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>Save 33%</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.planPrice,
              selectedPlan === 'annual' && styles.selectedPlanText
            ]}>
              $39.99/year
            </Text>
            <Text style={[
              styles.planSubtext,
              selectedPlan === 'annual' && styles.selectedPlanSubtext
            ]}>
              $3.33/month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.planOption, 
              selectedPlan === 'monthly' && styles.selectedPlan
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <Text style={[
                styles.planTitle,
                selectedPlan === 'monthly' && styles.selectedPlanText
              ]}>
                Monthly Plan
              </Text>
            </View>
            <Text style={[
              styles.planPrice,
              selectedPlan === 'monthly' && styles.selectedPlanText
            ]}>
              $4.99/month
            </Text>
            <Text style={[
              styles.planSubtext,
              selectedPlan === 'monthly' && styles.selectedPlanSubtext
            ]}>
              Billed monthly
            </Text>
          </TouchableOpacity>
        </View>

        {/* Required Subscription Information */}
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
        <TouchableOpacity 
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={loading}
        >
          <Text style={styles.purchaseButtonText}>
            Start Premium - {getPlanDetails().price}/{getPlanDetails().period}
          </Text>
          <Text style={styles.purchaseButtonSubtext}>
            {getPlanDetails().savings ? `Save ${getPlanDetails().savings} per year • ` : ''}Cancel anytime in Settings
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subscriptionTerms}>
        <Text style={styles.termsText}>
          Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. 
          You can cancel anytime in your device's App Store settings. Payment will be charged to your iTunes Account at confirmation of purchase.
        </Text>
      </View>

      {/* Required Legal Links */}
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
            <Text style={styles.legalLinkText}>End User License Agreement (EULA)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleRestore} disabled={loading}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
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
        <Text style={styles.featureHighlight}>{highlight}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 40,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  featuresContainer: {
    padding: 20,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
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
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 5,
  },
  featureHighlight: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: 'bold',
  },
  pricingContainer: {
    padding: 20,
  },
  planSelector: {
    marginBottom: 20,
  },
  planOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  selectedPlan: {
    borderColor: '#667eea',
    backgroundColor: '#F8F9FF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedPlanText: {
    color: '#667eea',
  },
  savingsBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planSubtext: {
    fontSize: 14,
    color: '#666',
  },
  selectedPlanSubtext: {
    color: '#667eea',
  },
  purchaseButton: {
    backgroundColor: '#667eea',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  purchaseButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  restoreText: {
    color: '#667eea',
    fontSize: 16,
    marginBottom: 15,
  },
  cancelText: {
    color: '#999',
    fontSize: 16,
  },
  subscriptionTerms: {
    padding: 20,
    paddingTop: 0,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  subscriptionInfo: {
    padding: 20,
    paddingTop: 0,
  },
  subscriptionInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subscriptionInfoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left',
  },
  legalSection: {
    padding: 20,
    paddingTop: 0,
  },
  legalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legalLink: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 5,
  },
  legalLinkText: {
    color: '#667eea',
    fontSize: 14,
  },
}); 