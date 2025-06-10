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
  const [limitInfo, setLimitInfo] = useState({ currentCount: 0, maxCount: 2, canGenerate: true });
  
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
      setLimitInfo(info);
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
      Alert.alert(
        'Limit Reached', 
        `You have reached the maximum of ${limitInfo.maxCount} personalized stories.`
      );
      return;
    }

    setIsGenerating(true);
    
    try {
      const story = await createPersonalizedStory(user.id, profile, selectedTheme || undefined);
      onStoryGenerated(story);
      onClose();
      setSelectedTheme(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate story. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!profile) {
    return null;
  }

  return (
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
            <View style={styles.limitInfo}>
              <Text style={styles.limitText}>
                {t('generator.storiesRemaining', { 
                  remaining: limitInfo.maxCount - limitInfo.currentCount,
                  total: limitInfo.maxCount 
                })}
              </Text>
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
              (!limitInfo.canGenerate || isGenerating) && styles.generateButtonDisabled
            ]}
            onPress={handleGenerateStory}
            disabled={!limitInfo.canGenerate || isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Wand2 size={20} color={colors.white} />
            )}
            <Text style={styles.generateButtonText}>
              {isGenerating 
                ? t('generator.generatingStory') 
                : t('generator.generateStory')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  limitText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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