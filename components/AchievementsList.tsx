import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Image 
} from 'react-native';
import { getUserAchievements } from '@/services/achievementService';
import { useI18n } from '@/hooks/useI18n';
import { colors } from '@/constants/colors';
import { Lock } from 'lucide-react-native';
import { Achievement } from '@/types';

type AchievementsListProps = {
  userId?: string;
};

export default function AchievementsList({ userId }: AchievementsListProps) {
  const { t } = useI18n();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadAchievements() {
      if (!userId) return;
      
      setLoading(true);
      const userAchievements = await getUserAchievements(userId);
      
      // Translate achievement names and descriptions
      const translatedAchievements = userAchievements.map(achievement => ({
        ...achievement,
        name: t(`achievementNames.${achievement.id}`) || achievement.name,
        description: t(`achievementDescriptions.${achievement.id}`) || achievement.description,
      }));
      
      setAchievements(translatedAchievements);
      setLoading(false);
    }
    
    loadAchievements();
  }, [userId, t]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('achievements.loadingAchievements')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={achievements}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
              styles.achievementCard,
              !item.unlocked && styles.lockedAchievement
            ]}
          >
            <View style={styles.iconContainer}>
              {item.unlocked ? (
                <Image
                  source={{ uri: item.icon_url }}
                  style={styles.achievementIcon}
                />
              ) : (
                <View style={styles.lockedIconContainer}>
                  <Lock size={24} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <Text 
              style={[
                styles.achievementName,
                !item.unlocked && styles.lockedText
              ]}
            >
              {item.name}
            </Text>
            <Text 
              style={[
                styles.achievementDescription,
                !item.unlocked && styles.lockedText
              ]}
            >
              {item.description}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {t('achievements.noAchievements')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    paddingVertical: 8,
  },
  achievementCard: {
    width: 140,
    height: 180,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedAchievement: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: colors.cardLight,
  },
  achievementIcon: {
    width: 40,
    height: 40,
  },
  lockedIconContainer: {
    backgroundColor: colors.border,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementName: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  lockedText: {
    color: colors.textSecondary,
  },
  emptyContainer: {
    width: 300,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});