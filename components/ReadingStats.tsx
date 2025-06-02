import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Book, Clock, Calendar } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type ReadingStatsProps = {
  userId?: string;
};

export default function ReadingStats({ userId }: ReadingStatsProps) {
  const [stats, setStats] = useState({
    totalStories: 0,
    readingTime: 0,  // in minutes
    streak: 0,
  });
  
  useEffect(() => {
    async function loadStats() {
      if (!userId) return;
      
      // Fetch user profile for streak and total stories
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak, total_stories_read, total_reading_time')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setStats({
          totalStories: profile.total_stories_read || 0,
          readingTime: Math.floor((profile.total_reading_time || 0) / 60),
          streak: profile.streak || 0,
        });
      }
    }
    
    loadStats();
  }, [userId]);

  const formatReadingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMinutes} min`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.statCard}>
        <Book size={24} color={colors.primary} />
        <Text style={styles.statValue}>{stats.totalStories}</Text>
        <Text style={styles.statLabel}>Stories Read</Text>
      </View>
      
      <View style={styles.statCard}>
        <Clock size={24} color={colors.secondary} />
        <Text style={styles.statValue}>{formatReadingTime(stats.readingTime)}</Text>
        <Text style={styles.statLabel}>Reading Time</Text>
      </View>
      
      <View style={styles.statCard}>
        <Calendar size={24} color={colors.accent} />
        <Text style={styles.statValue}>{stats.streak}</Text>
        <Text style={styles.statLabel}>Day Streak</Text>
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