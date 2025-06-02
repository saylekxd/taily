import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Book, Clock, Calendar } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/lib/supabase';
import { getReadingSessionStats } from '@/services/readingSessionService';
import { getUserStreakData } from '@/services/streakService';

type ReadingStatsProps = {
  userId?: string;
};

export default function ReadingStats({ userId }: ReadingStatsProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    totalStories: 0,
    readingTime: 0,  // in minutes
    streak: 0,
  });
  
  useEffect(() => {
    async function loadStats() {
      if (!userId) return;
      
      try {
        // Fetch user profile for total stories read
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_stories_read')
          .eq('id', userId)
          .single();
        
        // Get reading session stats and streak data
        const [sessionStats, streakData] = await Promise.all([
          getReadingSessionStats(userId),
          getUserStreakData(userId)
        ]);
        
        setStats({
          totalStories: profile?.total_stories_read || 0,
          readingTime: Math.floor((sessionStats.totalReadingTime || 0) / 60), // Convert to minutes
          streak: streakData.currentStreak,
        });
      } catch (error) {
        console.error('Error loading reading stats:', error);
        setStats({
          totalStories: 0,
          readingTime: 0,
          streak: 0,
        });
      }
    }
    
    loadStats();
  }, [userId]);

  const formatReadingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} ${t('stats.minutes')}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} ${t('stats.hours')}`;
    }
    
    return `${hours} ${t('stats.hours')} ${remainingMinutes} ${t('stats.minutes')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.statCard}>
        <Book size={24} color={colors.primary} />
        <Text style={styles.statValue}>{stats.totalStories}</Text>
        <Text style={styles.statLabel}>{t('stats.storiesRead')}</Text>
      </View>
      
      <View style={styles.statCard}>
        <Clock size={24} color={colors.secondary} />
        <Text style={styles.statValue}>{formatReadingTime(stats.readingTime)}</Text>
        <Text style={styles.statLabel}>{t('stats.timeSpent')}</Text>
      </View>
      
      <View style={styles.statCard}>
        <Calendar size={24} color={colors.accent} />
        <Text style={styles.statValue}>{stats.streak}</Text>
        <Text style={styles.statLabel}>{t('stats.currentStreak')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 24,
    color: colors.white,
    marginVertical: 8,
  },
  statLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});