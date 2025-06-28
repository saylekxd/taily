import Purchases, { CustomerInfo, PRODUCT_CATEGORY } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

class RevenueCatService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      
      let apiKey: string | undefined;
      
      if (Platform.OS === 'ios') {
        apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUE_CAT_IOS_API_KEY;
      } else {
        apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUE_CAT_ANDROID_API_KEY;
      }
      
      if (!apiKey) {
        console.warn(`RevenueCat API key not found for ${Platform.OS}. Subscription features will be disabled.`);
        // Mark as initialized to prevent repeated attempts
        this.initialized = true;
        return;
      }
      
      await Purchases.configure({ apiKey });
      this.initialized = true;
      console.log('RevenueCat initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      // Mark as initialized to prevent repeated attempts even on failure
      this.initialized = true;
      // Don't throw error to prevent app crash
    }
  }

  private isRevenueCatConfigured(): boolean {
    try {
      // Simple check to see if RevenueCat is actually configured
      return this.initialized && !!Purchases;
    } catch {
      return false;
    }
  }

  async identifyUser(userId: string) {
    await this.initialize();
    if (!this.isRevenueCatConfigured()) {
      console.warn('RevenueCat not configured, skipping user identification');
      return;
    }
    
    try {
      await Purchases.logIn(userId);
    } catch (error) {
      console.error('Failed to identify user with RevenueCat:', error);
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | undefined> {
    await this.initialize();
    if (!this.isRevenueCatConfigured()) {
      console.warn('RevenueCat not configured, returning undefined customer info');
      return undefined;
    }
    
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return undefined;
    }
  }

  async getProducts() {
    await this.initialize();
    if (!this.isRevenueCatConfigured()) {
      console.warn('RevenueCat not configured, returning empty products array');
      return [];
    }
    
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages || [];
    } catch (error) {
      console.error('Failed to get products:', error);
      return [];
    }
  }

  async purchaseProduct(productId: string, retryCount = 0): Promise<CustomerInfo> {
    await this.initialize();
    if (!this.isRevenueCatConfigured()) {
      throw new Error('RevenueCat not configured. Cannot process purchases.');
    }
    
    try {
      console.log(`Attempting to purchase product: ${productId} (attempt ${retryCount + 1})`);
      
      // First, ensure we have the latest customer info
      const currentCustomerInfo = await this.getCustomerInfo();
      
      // Check if already subscribed to avoid duplicate purchases
      if (currentCustomerInfo?.entitlements.active['premium']) {
        console.log('User already has active premium subscription');
        await this.syncSubscriptionStatus(currentCustomerInfo);
        return currentCustomerInfo;
      }
      
      const { customerInfo } = await Purchases.purchaseProduct(productId);
      console.log('Purchase successful, syncing subscription status');
      
      await this.syncSubscriptionStatus(customerInfo);
      return customerInfo;
      
    } catch (error: any) {
      console.error('Failed to purchase product:', error);
      
      // Handle specific RevenueCat error codes
      if (error.code) {
        switch (error.code) {
          case 'PURCHASE_CANCELLED':
            throw new Error('Purchase was cancelled by user');
          case 'STORE_PROBLEM':
            if (retryCount < 2) {
              console.log(`Store problem, retrying purchase (attempt ${retryCount + 2}/3)`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              return this.purchaseProduct(productId, retryCount + 1);
            }
            throw new Error('App Store is currently unavailable. Please try again later.');
          case 'PURCHASE_NOT_ALLOWED':
            throw new Error('Purchases are not allowed on this device');
          case 'PURCHASE_INVALID':
            throw new Error('This product is not available for purchase');
          case 'PRODUCT_NOT_AVAILABLE':
            throw new Error('This subscription is not currently available');
          case 'NETWORK_ERROR':
            if (retryCount < 2) {
              console.log(`Network error, retrying purchase (attempt ${retryCount + 2}/3)`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              return this.purchaseProduct(productId, retryCount + 1);
            }
            throw new Error('Network connection failed. Please check your internet connection and try again.');
          default:
            console.error('Unknown purchase error:', error);
        }
      }
      
      // Generic retry for unknown errors
      if (retryCount < 1) {
        console.log(`Unknown error, retrying purchase (attempt ${retryCount + 2}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.purchaseProduct(productId, retryCount + 1);
      }
      
      throw new Error(error.message || 'Purchase failed. Please try again.');
    }
  }

  async restorePurchases() {
    await this.initialize();
    if (!this.isRevenueCatConfigured()) {
      throw new Error('RevenueCat not configured. Cannot restore purchases.');
    }
    
    try {
      const customerInfo = await Purchases.restorePurchases();
      await this.syncSubscriptionStatus(customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  async syncSubscriptionStatus(customerInfo?: CustomerInfo, retryCount = 0): Promise<void> {
    try {
      if (!customerInfo) {
        customerInfo = await this.getCustomerInfo();
        if (!customerInfo) {
          console.warn('Cannot sync subscription status: customer info unavailable');
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check current status in database before syncing
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .single();

      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      const expiryDate = premiumEntitlement?.expirationDate;
      const productId = premiumEntitlement?.productIdentifier;

      // In sandbox environment, be more lenient with subscription status
      const isSandbox = customerInfo.entitlements.active['premium']?.isSandbox || false;
      
      console.log('Syncing subscription status:', {
        isPremium,
        expiryDate,
        productId,
        isSandbox,
        currentTier: currentProfile?.subscription_tier,
        revenueCatUserId: customerInfo.originalAppUserId
      });

      // Prevent downgrading a premium user to free if:
      // 1. They currently have premium in the database
      // 2. Their expiry date hasn't passed
      // 3. We're in sandbox mode (which can be unreliable)
      if (currentProfile?.subscription_tier === 'premium' && !isPremium) {
        const currentExpiry = currentProfile.subscription_expires_at ? new Date(currentProfile.subscription_expires_at) : null;
        const now = new Date();
        
        // If subscription hasn't expired yet, or we're in sandbox, don't downgrade
        if ((currentExpiry && currentExpiry > now) || isSandbox) {
          console.log('Skipping downgrade - user has active premium subscription or in sandbox mode');
          return;
        }
      }

      // Update profiles table for quick access
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: isPremium ? 'premium' : 'free',
          subscription_expires_at: expiryDate,
          revenue_cat_customer_id: customerInfo.originalAppUserId
        })
        .eq('id', user.id);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      // Update or insert subscription record
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          subscription_status: isPremium ? 'premium' : 'free',
          revenue_cat_customer_id: customerInfo.originalAppUserId,
          product_id: productId,
          expiry_date: expiryDate,
          is_active: isPremium,
          platform: Platform.OS,
          environment: isSandbox ? 'SANDBOX' : 'PRODUCTION',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (subscriptionError) {
        throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
      }

      console.log('Subscription sync completed successfully');

    } catch (error) {
      console.error('Error syncing subscription status:', error);
      
      // Retry logic for transient failures
      if (retryCount < 3) {
        console.log(`Retrying subscription sync (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.syncSubscriptionStatus(customerInfo, retryCount + 1);
      }
      
      // Log error for monitoring but don't throw to avoid breaking user flow
      console.error('Failed to sync subscription after 3 attempts:', error);
    }
  }

  async checkSubscriptionStatus(userId: string): Promise<{
    isPremium: boolean;
    expiresAt?: Date;
    status: string;
  }> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', userId)
        .single();

      return {
        isPremium: data?.subscription_tier === 'premium',
        expiresAt: data?.subscription_expires_at ? new Date(data.subscription_expires_at) : undefined,
        status: data?.subscription_tier || 'free'
      };
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return {
        isPremium: false,
        status: 'free'
      };
    }
  }
}

export const revenueCatService = new RevenueCatService(); 