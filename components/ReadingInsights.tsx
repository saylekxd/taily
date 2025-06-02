import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TrendingUp, Clock, Calendar, Book, Target, Award } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { ReadingSessionStats } from '@/types';
import { getReadingSessionStats, getTodayReadingSessions } from '@/services/readingSessionService';
import { getUserStreakData } from '@/services/streakService';

type ReadingInsightsProps = {
  userId?: string;
};

export default function ReadingInsights({ userId }: ReadingInsightsProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState<ReadingSessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayGoalMet, setTodayGoalMet] = useState(false);
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 });
  
  const DAILY_READING_GOAL = 15 * 60; // 15 minutes in seconds

  useEffect(() => {
    async function loadInsights() {
      if (!userId) return;
      
      setLoading(true);
      try {
        const [sessionStats, todaySessions, streakInfo] = await Promise.all([
          getReadingSessionStats(userId),
          getTodayReadingSessions(userId),
          getUserStreakData(userId)
        ]);
        
        setStats(sessionStats);
        setStreakData({
          currentStreak: streakInfo.currentStreak,
          longestStreak: streakInfo.longestStreak
        });
        setTodayGoalMet(sessionStats.dailyReadingTime >= DAILY_READING_GOAL);
      } catch (error) {
        console.error('Error loading reading insights:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadInsights();
  }, [userId]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours} ${t('stats.hours')} ${minutes % 60} ${t('stats.minutes')}`;
    }
    return `${minutes} ${t('stats.minutes')}`;
  };

  const formatTimeGoal = (seconds: number, goal: number): string => {
    const minutes = Math.floor(seconds / 60);
    const goalMinutes = Math.floor(goal / 60);
    return `${minutes}/${goalMinutes} min`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('insights.loadingInsights')}</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t('insights.noDataAvailable')}</Text>
        <Text style={styles.emptySubtext}>{t('insights.startReadingToSeeInsights')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Today's Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('insights.todayReading')}</Text>
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Target size={24} color={todayGoalMet ? colors.success : colors.primary} />
            <Text style={styles.goalTitle}>{t('insights.dailyGoal')}</Text>
            {todayGoalMet && <Award size={20} color={colors.success} />}
          </View>
          <Text style={styles.goalProgress}>
            {formatTimeGoal(stats.dailyReadingTime, DAILY_READING_GOAL)}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min((stats.dailyReadingTime / DAILY_READING_GOAL) * 100, 100)}%` }
              ]} 
            />
          </View>
          {todayGoalMet && (
            <Text style={styles.goalAchieved}>🎉 {t('insights.goalAchieved')}</Text>
          )}
        </View>
      </View>

      {/* Reading Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('insights.readingStatistics')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Book size={28} color={colors.primary} />
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>{t('insights.totalSessions')}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Clock size={28} color={colors.secondary} />
            <Text style={styles.statValue}>{formatTime(stats.totalReadingTime)}</Text>
            <Text style={styles.statLabel}>{t('insights.totalTime')}</Text>
          </View>
          
          <View style={styles.statCard}>
            <TrendingUp size={28} color={colors.accent} />
            <Text style={styles.statValue}>{formatTime(stats.averageSessionTime)}</Text>
            <Text style={styles.statLabel}>{t('insights.avgSession')}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Calendar size={28} color={colors.success} />
            <Text style={styles.statValue}>{streakData.currentStreak}</Text>
            <Text style={styles.statLabel}>{t('insights.dayStreak')}</Text>
          </View>
        </View>
      </View>

      {/* Weekly Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('insights.thisWeek')}</Text>
        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyTime}>{formatTime(stats.weeklyReadingTime)}</Text>
          <Text style={styles.weeklyLabel}>{t('insights.readingTime')}</Text>
          <Text style={styles.weeklySubtext}>
            {stats.completedSessions} stories completed this week
          </Text>
        </View>
      </View>

      {/* Favorite Story */}
      {stats.mostReadStory && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('insights.mostReadStory')}</Text>
          <View style={styles.favoriteStoryCard}>
            <Text style={styles.favoriteStoryTitle}>{stats.mostReadStory.story.title}</Text>
            <Text style={styles.favoriteStoryStats}>
              Read {stats.mostReadStory.sessionCount} times • {formatTime(stats.mostReadStory.totalTime)}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  emptyText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    marginTop: 32,
  },
  emptySubtext: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 18,
    color: colors.white,
    marginLeft: 12,
    flex: 1,
  },
  goalProgress: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 32,
    color: colors.white,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  goalAchieved: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: colors.success,
    marginTop: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
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
  weeklyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  weeklyTime: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 36,
    color: colors.white,
  },
  weeklyLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  weeklySubtext: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  favoriteStoryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  favoriteStoryTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginBottom: 8,
  },
  favoriteStoryStats: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: 32,
  },
}); 