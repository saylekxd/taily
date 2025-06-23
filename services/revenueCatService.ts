import Purchases, { CustomerInfo, PurchaserInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

class RevenueCatService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    
    if (Platform.OS === 'ios') {
      await Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUE_CAT_IOS_API_KEY! });
    } else {
      await Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUE_CAT_ANDROID_API_KEY! });
    }
    
    this.initialized = true;
  }

  async identifyUser(userId: string) {
    await this.initialize();
    await Purchases.logIn(userId);
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    await this.initialize();
    return await Purchases.getCustomerInfo();
  }

  async getProducts() {
    await this.initialize();
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  }

  async purchaseProduct(productId: string) {
    await this.initialize();
    const { customerInfo } = await Purchases.purchaseProduct(productId);
    await this.syncSubscriptionStatus(customerInfo);
    return customerInfo;
  }

  async restorePurchases() {
    await this.initialize();
    const customerInfo = await Purchases.restorePurchases();
    await this.syncSubscriptionStatus(customerInfo);
    return customerInfo;
  }

  async syncSubscriptionStatus(customerInfo?: CustomerInfo, retryCount = 0): Promise<void> {
    try {
      if (!customerInfo) {
        customerInfo = await this.getCustomerInfo();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      const expiryDate = premiumEntitlement?.expirationDate;
      const productId = premiumEntitlement?.productIdentifier;

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
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (subscriptionError) {
        throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
      }

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
  }
}

export const revenueCatService = new RevenueCatService(); 