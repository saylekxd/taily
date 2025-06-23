import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { revenueCatService } from '@/services/revenueCatService';

export default function PaywallScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handlePurchase = async (productId: string) => {
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
        <TouchableOpacity 
          style={styles.purchaseButton}
          onPress={() => handlePurchase('premium_yearly')}
          disabled={loading}
        >
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>BEST VALUE</Text>
          </View>
          <Text style={styles.purchaseButtonText}>
            Start Premium - $37.99/year
          </Text>
          <Text style={styles.purchaseButtonSubtext}>
            Save $9.89 yearly • Cancel anytime
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.purchaseButton, styles.monthlyButton]}
          onPress={() => handlePurchase('premium_monthly')}
          disabled={loading}
        >
          <Text style={styles.purchaseButtonText}>
            Start Premium - $3.99/month
          </Text>
          <Text style={styles.purchaseButtonSubtext}>
            Cancel anytime
          </Text>
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
    marginTop: 4,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  featureHighlight: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  pricingContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  purchaseButton: {
    backgroundColor: '#667eea',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  monthlyButton: {
    backgroundColor: '#8b9dc3',
    shadowColor: '#8b9dc3',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  purchaseButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  restoreText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  cancelText: {
    color: '#999',
    fontSize: 16,
  },
}); 