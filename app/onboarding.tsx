import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Animated,
  Dimensions 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ChevronRight, 
  ArrowLeft, 
  BookOpen, 
  Cake, 
  Sparkles 
} from 'lucide-react-native';
import { useUser } from '@/hooks/useUser';
import { useI18n } from '@/hooks/useI18n';
import InterestSelector from '@/components/InterestSelector';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { getTranslatedInterests } from '@/constants/interests';

const { width } = Dimensions.get('window');

type OnboardingStep = 'welcome' | 'name' | 'age' | 'interests' | 'reading_level';

export default function OnboardingScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { user, profile, refreshProfile } = useUser();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<number | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [readingLevel, setReadingLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Get translated interests
  const translatedInterests = getTranslatedInterests(t);

  // Set initial values if editing profile
  useEffect(() => {
    if (edit === 'true' && profile) {
      setChildName(profile.child_name || '');
      setChildAge(profile.age || null);
      setSelectedInterests(profile.interests || []);
      setReadingLevel(profile.reading_level || 'beginner');
    }
  }, [edit, profile]);

  const steps: OnboardingStep[] = ['welcome', 'name', 'age', 'interests', 'reading_level'];
  
  const goToStep = (step: OnboardingStep) => {
    const index = steps.indexOf(step);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentStep(step);
  };
  
  const goToNextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      goToStep(steps[currentIndex + 1]);
    }
  };
  
  const goToPreviousStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      goToStep(steps[currentIndex - 1]);
    }
  };

  const handleCompleteOnboarding = async () => {
    // Create profile object
    const profileData = {
      child_name: childName,
      age: childAge,
      interests: selectedInterests,
      reading_level: readingLevel,
      onboarding_completed: true,
      language: 'en',
      streak: 0,
      total_stories_read: 0,
      total_reading_time: 0,
    };
    
    if (edit === 'true') {
      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user?.id);
      
      if (error) {
        console.error('Error updating profile:', error);
      } else {
        refreshProfile();
        router.replace('/(tabs)');
      }
    } else {
      // Create new profile or update if exists
      const { error } = await supabase
        .from('profiles')
        .upsert([{ 
          id: user?.id,
          ...profileData
        }]);
      
      if (error) {
        console.error('Error creating profile:', error);
      } else {
        refreshProfile();
        router.replace('/(tabs)');
      }
    }
  };

  const renderBackButton = () => {
    if (currentStep === 'welcome') return null;
    
    return (
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={goToPreviousStep}
      >
        <ArrowLeft size={24} color={colors.white} />
      </TouchableOpacity>
    );
  };

  const isNextButtonDisabled = () => {
    switch (currentStep) {
      case 'name':
        return childName.trim().length === 0;
      case 'age':
        return childAge === null;
      case 'interests':
        return selectedInterests.length === 0;
      default:
        return false;
    }
  };

  const renderNextButton = () => {
    const isLastStep = currentStep === 'reading_level';
    const disabled = isNextButtonDisabled();
    
    return (
      <TouchableOpacity
        style={[
          styles.nextButton,
          disabled && styles.disabledButton
        ]}
        onPress={isLastStep ? handleCompleteOnboarding : goToNextStep}
        disabled={disabled}
      >
        <Text style={styles.nextButtonText}>
          {isLastStep ? t('common.finish') : t('common.next')}
        </Text>
        {!isLastStep && <ChevronRight size={20} color={colors.white} />}
      </TouchableOpacity>
    );
  };

  const ageOptions = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <View style={styles.container}>
      {/* Header with progress indicator */}
      <View style={styles.header}>
        {renderBackButton()}
        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <View 
              key={step}
              style={[
                styles.progressDot,
                currentStep === step ? styles.activeDot : null
              ]}
            />
          ))}
        </View>
      </View>
      
      {/* Scrollable steps */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Welcome Step */}
        <View style={styles.stepContainer}>
          <View style={styles.stepContent}>
            <BookOpen size={64} color={colors.primary} />
            <Text style={styles.stepTitle}>{t('common.welcomeToStoryTime')}</Text>
            <Text style={styles.stepDescription}>
              {t('onboarding.welcomeSubtitle')}
            </Text>
          </View>
          {renderNextButton()}
        </View>
        
        {/* Name Step */}
        <View style={styles.stepContainer}>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('onboarding.childName')}</Text>
            <Text style={styles.stepDescription}>
              {t('onboarding.interestsSubtitle')}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('common.enterName')}
              placeholderTextColor={colors.textSecondary}
              value={childName}
              onChangeText={setChildName}
              autoFocus
            />
          </View>
          {renderNextButton()}
        </View>
        
        {/* Age Step */}
        <View style={styles.stepContainer}>
          <View style={styles.stepContent}>
            <Cake size={48} color={colors.primary} />
            <Text style={styles.stepTitle}>
              {childName ? t('onboarding.howOldIsChild', { name: childName }) : t('onboarding.howOldIsYourChild')}
            </Text>
            <Text style={styles.stepDescription}>
              {t('onboarding.ageAppropriateStories')}
            </Text>
            <View style={styles.ageOptionsContainer}>
              {ageOptions.map(age => (
                <TouchableOpacity
                  key={age}
                  style={[
                    styles.ageOption,
                    childAge === age ? styles.selectedAgeOption : null
                  ]}
                  onPress={() => setChildAge(age)}
                >
                  <Text 
                    style={[
                      styles.ageOptionText,
                      childAge === age ? styles.selectedAgeOptionText : null
                    ]}
                  >
                    {age}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {renderNextButton()}
        </View>
        
        {/* Interests Step */}
        <View style={styles.stepContainer}>
          <View style={styles.stepContent}>
            <Sparkles size={48} color={colors.primary} />
            <Text style={styles.stepTitle}>
              {childName ? t('onboarding.whatInterestsChild', { name: childName }) : t('onboarding.whatInterestsYourChild')}
            </Text>
            <Text style={styles.stepDescription}>
              {t('onboarding.selectAtLeastOneInterest')}
            </Text>
            <InterestSelector
              interests={translatedInterests}
              selectedInterests={selectedInterests}
              onSelectInterest={(interest) => {
                if (selectedInterests.includes(interest)) {
                  setSelectedInterests(selectedInterests.filter(i => i !== interest));
                } else {
                  setSelectedInterests([...selectedInterests, interest]);
                }
              }}
            />
          </View>
          {renderNextButton()}
        </View>
        
        {/* Reading Level Step */}
        <View style={styles.stepContainer}>
          <View style={styles.stepContent}>
            <BookOpen size={48} color={colors.primary} />
            <Text style={styles.stepTitle}>{t('onboarding.readingLevelTitle')}</Text>
            <Text style={styles.stepDescription}>
              {childName ? t('onboarding.selectChildReadingLevel', { name: childName }) : t('onboarding.selectYourChildReadingLevel')}
            </Text>
            <View style={styles.readingLevelsContainer}>
              <TouchableOpacity
                style={[
                  styles.readingLevelOption,
                  readingLevel === 'beginner' ? styles.selectedReadingLevel : null
                ]}
                onPress={() => setReadingLevel('beginner')}
              >
                <Text style={styles.readingLevelTitle}>{t('onboarding.beginner')}</Text>
                <Text style={styles.readingLevelDescription}>
                  {t('onboarding.beginnerDesc2')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.readingLevelOption,
                  readingLevel === 'intermediate' ? styles.selectedReadingLevel : null
                ]}
                onPress={() => setReadingLevel('intermediate')}
              >
                <Text style={styles.readingLevelTitle}>{t('onboarding.intermediate')}</Text>
                <Text style={styles.readingLevelDescription}>
                  {t('onboarding.intermediateDesc2')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.readingLevelOption,
                  readingLevel === 'advanced' ? styles.selectedReadingLevel : null
                ]}
                onPress={() => setReadingLevel('advanced')}
              >
                <Text style={styles.readingLevelTitle}>{t('onboarding.advanced')}</Text>
                <Text style={styles.readingLevelDescription}>
                  {t('onboarding.advancedDesc2')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderNextButton()}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 48,
    zIndex: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 24,
  },
  stepContainer: {
    width: width,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 28,
    color: colors.white,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  stepDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  textInput: {
    width: '100%',
    height: 56,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: colors.white,
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    marginBottom: 16,
  },
  ageOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ageOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  selectedAgeOption: {
    backgroundColor: colors.primary,
  },
  ageOptionText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.textSecondary,
  },
  selectedAgeOptionText: {
    color: colors.white,
  },
  readingLevelsContainer: {
    width: '100%',
  },
  readingLevelOption: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedReadingLevel: {
    borderColor: colors.primary,
  },
  readingLevelTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginBottom: 8,
  },
  readingLevelDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  disabledButton: {
    backgroundColor: colors.border,
  },
  nextButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    marginRight: 8,
  },
});