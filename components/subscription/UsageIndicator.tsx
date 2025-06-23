import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { subscriptionService, UsageLimits } from '@/services/subscriptionService';
import { useUser } from '@/hooks/useUser';

interface UsageIndicatorProps {
  type: 'ai_stories' | 'audio_generation';
  compact?: boolean;
}

export function UsageIndicator({ type, compact = false }: UsageIndicatorProps) {
  const { user } = useUser();
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUsage();
    }
  }, [user]);

  const loadUsage = async () => {
    if (!user) return;
    
    try {
      const usageLimits = await subscriptionService.getUserUsageLimits(user.id);
      setUsage(usageLimits);
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return null;
  }

  if (type === 'ai_stories') {
    const { aiStories } = usage;
    const progress = aiStories.dailyLimit > 0 
      ? aiStories.todayUsed / aiStories.dailyLimit 
      : aiStories.lifetimeUsed / aiStories.lifetimeLimit;

    return (
      <View style={compact ? styles.compactContainer : styles.container}>
        <Text style={styles.label}>AI Stories</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
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
      </View>
    );
  }

  if (type === 'audio_generation') {
    const { audioGeneration } = usage;
    const progress = audioGeneration.monthlyLimit > 0 
      ? audioGeneration.monthlyUsed / audioGeneration.monthlyLimit 
      : 0;

    return (
      <View style={compact ? styles.compactContainer : styles.container}>
        <Text style={styles.label}>Audio Generation</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.usageText}>
            {audioGeneration.monthlyLimit > 0 
              ? `${audioGeneration.monthlyUsed}/${audioGeneration.monthlyLimit} this month`
              : 'Premium feature only'
            }
          </Text>
        </View>
        {audioGeneration.resetDate && (
          <Text style={styles.resetText}>
            Resets {formatResetTime(audioGeneration.resetDate)}
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
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  
  if (hours <= 24) {
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.ceil(hours / 24);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  compactContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    marginVertical: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  progressContainer: {
    marginBottom: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
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
    marginTop: 5,
  },
}); 