import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { subscriptionService, UsageLimits } from '@/services/subscriptionService';
import { supabase } from '@/lib/supabase';

interface UsageIndicatorProps {
  type: 'ai_stories' | 'audio_generation';
  compact?: boolean;
}

export function UsageIndicator({ type, compact = false }: UsageIndicatorProps) {
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const usageLimits = await subscriptionService.getUserUsageLimits(user.id);
      setUsage(usageLimits);
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return (
      <View style={compact ? styles.compactContainer : styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (type === 'ai_stories') {
    const { aiStories } = usage;
    const progress = aiStories.dailyLimit > 0 
      ? aiStories.todayUsed / aiStories.dailyLimit 
      : aiStories.lifetimeUsed / aiStories.lifetimeLimit;

    const progressPercentage = Math.min(progress * 100, 100);

    return (
      <View style={compact ? styles.compactContainer : styles.container}>
        <View style={styles.header}>
          <Text style={styles.label}>🤖 AI Stories</Text>
          {!aiStories.canGenerate && (
            <View style={styles.limitBadge}>
              <Text style={styles.limitText}>LIMIT</Text>
            </View>
          )}
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: aiStories.canGenerate ? '#4ade80' : '#ef4444'
              }
            ]} />
          </View>
          <Text style={styles.usageText}>
            {aiStories.dailyLimit > 0 
              ? `${aiStories.todayUsed}/${aiStories.dailyLimit} today`
              : `${aiStories.lifetimeUsed}/${aiStories.lifetimeLimit} lifetime`
            }
          </Text>
        </View>
        
        {aiStories.resetTime && (
          <Text style={styles.resetText}>
            Resets {formatResetTime(aiStories.resetTime)}
          </Text>
        )}
        
        {!aiStories.canGenerate && !compact && (
          <Text style={styles.upgradeHint}>
            {aiStories.dailyLimit > 0 
              ? 'Daily limit reached'
              : 'Upgrade to Premium for daily stories!'
            }
          </Text>
        )}
      </View>
    );
  }

  if (type === 'audio_generation') {
    const { audioGeneration } = usage;
    const progress = audioGeneration.monthlyLimit > 0 
      ? audioGeneration.monthlyUsed / audioGeneration.monthlyLimit 
      : 0;

    const progressPercentage = Math.min(progress * 100, 100);

    return (
      <View style={compact ? styles.compactContainer : styles.container}>
        <View style={styles.header}>
          <Text style={styles.label}>🎵 Audio Generation</Text>
          {!audioGeneration.canGenerate && (
            <View style={styles.limitBadge}>
              <Text style={styles.limitText}>
                {audioGeneration.monthlyLimit === 0 ? 'PREMIUM' : 'LIMIT'}
              </Text>
            </View>
          )}
        </View>
        
        {audioGeneration.monthlyLimit > 0 ? (
          <>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill, 
                  { 
                    width: `${progressPercentage}%`,
                    backgroundColor: audioGeneration.canGenerate ? '#4ade80' : '#ef4444'
                  }
                ]} />
              </View>
              <Text style={styles.usageText}>
                {audioGeneration.monthlyUsed}/{audioGeneration.monthlyLimit} this month
              </Text>
            </View>
            
            {audioGeneration.resetDate && (
              <Text style={styles.resetText}>
                Resets {formatResetTime(audioGeneration.resetDate)}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.premiumOnlyText}>
            Premium feature - Upgrade to access
          </Text>
        )}
      </View>
    );
  }

  return null;
}

function formatResetTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return 'soon';
  
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  
  if (hours <= 24) {
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.ceil(hours / 24);
  if (days <= 30) {
    return `in ${days} day${days !== 1 ? 's' : ''}`;
  }
  
  const months = Math.ceil(days / 30);
  return `in ${months} month${months !== 1 ? 's' : ''}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  limitBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  limitText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  resetText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  upgradeHint: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
    marginTop: 4,
  },
  premiumOnlyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
}); 