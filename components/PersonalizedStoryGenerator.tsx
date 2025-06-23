import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { X, Sparkles, Wand2 } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { useI18n } from '@/hooks/useI18n';
import { createPersonalizedStory, getUserStoryLimitInfo } from '@/services/personalizedStoryService';
import { getTranslatedInterests } from '@/constants/interests';
import { PersonalizedStory } from '@/services/personalizedStoryService';
import { PaywallTrigger } from '@/components/paywall/PaywallTrigger';

type PersonalizedStoryGeneratorProps = {
  visible: boolean;
  onClose: () => void;
  onStoryGenerated: (story: PersonalizedStory) => void;
};

export default function PersonalizedStoryGenerator({ 
  visible, 
  onClose, 
  onStoryGenerated 
}: PersonalizedStoryGeneratorProps) {
  const { user, profile } = useUser();
  const { t } = useI18n();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [limitInfo, setLimitInfo] = useState({ 
    currentCount: 0, 
    maxCount: 2, 
    canGenerate: true,
    todayUsed: 0,
    resetTime: undefined as Date | undefined
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState('');
  
  const translatedInterests = getTranslatedInterests(t);

  // Load limit info when modal opens
  useState(() => {
    if (visible && user?.id) {
      loadLimitInfo();
    }
  });

  const loadLimitInfo = async () => {
    if (!user?.id) return;
    
    try {
      const info = await getUserStoryLimitInfo(user.id);
      setLimitInfo({
        currentCount: info.currentCount,
        maxCount: info.maxCount,
        canGenerate: info.canGenerate,
        todayUsed: info.todayUsed || 0,
        resetTime: info.resetTime
      });
    } catch (error) {
      console.error('Error loading limit info:', error);
    }
  };

  const handleGenerateStory = async () => {
    if (!user?.id || !profile) {
      Alert.alert('Error', 'Please complete your profile first');
      return;
    }

    if (!limitInfo.canGenerate) {
      // Show paywall instead of alert
      setPaywallMessage(
        limitInfo.resetTime 
          ? `You've used your AI story limit. ${limitInfo.resetTime ? 'Resets tomorrow for Premium users!' : 'Upgrade to Premium for daily stories!'}`
          : 'You\'ve used your 2 lifetime AI stories. Upgrade to Premium for 2 new stories every day!'
      );
      setShowPaywall(true);
      return;
    }

    setIsGenerating(true);
    
    try {
      const story = await createPersonalizedStory(user.id, profile, selectedTheme || undefined);
      onStoryGenerated(story);
      onClose();
      setSelectedTheme(null);
      // Refresh limit info after generation
      await loadLimitInfo();
    } catch (error: any) {
      // Check if error is related to limits and show paywall
      if (error.message?.includes('limit') || error.message?.includes('Upgrade')) {
        setPaywallMessage(error.message);
        setShowPaywall(true);
      } else {
        Alert.alert('Error', error.message || 'Failed to generate story. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const renderLimitInfo = () => {
    if (limitInfo.resetTime) {
      // Premium user - daily limit
      return (
        <Text style={styles.limitText}>
          {t('generator.dailyStoriesRemaining', { 
            remaining: 2 - (limitInfo.todayUsed || 0),
            total: 2 
          })}
          {limitInfo.resetTime && (
            <Text style={styles.resetText}>
              {'\n'}Resets tomorrow
            </Text>
          )}
        </Text>
      );
    } else {
      // Free user - lifetime limit
      return (
        <Text style={styles.limitText}>
          {t('generator.storiesRemaining', { 
            remaining: limitInfo.maxCount - limitInfo.currentCount,
            total: limitInfo.maxCount 
          })}
          <Text style={styles.upgradeHint}>
            {'\n'}Upgrade to Premium for 2 daily stories!
          </Text>
        </Text>
      );
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkles size={24} color={colors.primary} />
              <Text style={styles.headerTitle}>{t('generator.createPersonalizedStory')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Story Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('generator.storyWillFeature')}</Text>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{profile.child_name}</Text>
                <Text style={styles.childDetails}>
                  {t('profile.yearsOld', { age: profile.age })} • {t(`onboarding.${profile.reading_level}`)}
                </Text>
              </View>
            </View>

            {/* Theme Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('generator.chooseTheme')}</Text>
              <Text style={styles.sectionSubtitle}>{t('generator.basedOnInterests')}</Text>
              
              <View style={styles.themesContainer}>
                {profile.interests.map((interestId) => {
                  const interest = translatedInterests.find(i => i.id === interestId);
                  if (!interest) return null;
                  
                  return (
                    <TouchableOpacity
                      key={interest.id}
                      style={[
                        styles.themeOption,
                        selectedTheme === interest.id && styles.selectedTheme
                      ]}
                      onPress={() => setSelectedTheme(
                        selectedTheme === interest.id ? null : interest.id
                      )}
                    >
                      <Text style={[
                        styles.themeText,
                        selectedTheme === interest.id && styles.selectedThemeText
                      ]}>
                        {interest.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Story Limit Info */}
            <View style={styles.section}>
              <View style={[
                styles.limitInfo,
                !limitInfo.canGenerate && styles.limitInfoWarning
              ]}>
                {renderLimitInfo()}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('generator.storyPreview')}</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewText}>
                  {selectedTheme 
                    ? t('generator.storyWillBeAbout', { 
                        name: profile.child_name, 
                        theme: translatedInterests.find(i => i.id === selectedTheme)?.name 
                      })
                    : t('generator.selectThemeToSeePreview')
                  }
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Generate Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                isGenerating && styles.generateButtonDisabled
              ]}
              onPress={handleGenerateStory}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Wand2 size={20} color={colors.white} />
              )}
              <Text style={styles.generateButtonText}>
                {isGenerating 
                  ? t('generator.generatingStory') 
                  : limitInfo.canGenerate 
                    ? t('generator.generateStory')
                    : 'Upgrade to Generate'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Paywall Trigger */}
      <PaywallTrigger
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="ai_story"
        customMessage={paywallMessage}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 24,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  childInfo: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  childName: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 24,
    color: colors.primary,
    marginBottom: 4,
  },
  childDetails: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeOption: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTheme: {
    backgroundColor: colors.primary,
    borderColor: colors.white,
  },
  themeText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedThemeText: {
    color: colors.white,
  },
  limitInfo: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  limitInfoWarning: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  limitText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resetText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  upgradeHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  previewText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: colors.border,
  },
  generateButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    marginLeft: 8,
  },
});