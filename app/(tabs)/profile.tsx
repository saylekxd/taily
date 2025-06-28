import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Switch
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Settings, 
  Edit3, 
  LogOut, 
  Globe,
  BarChart3
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useUser } from '@/hooks/useUser';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/lib/supabase';
import ReadingStats from '@/components/ReadingStats';
import AchievementsList from '@/components/AchievementsList';
import ReadingInsights from '@/components/ReadingInsights';
import AccountDeletion from '@/components/AccountDeletion';
import GuestModeBanner from '@/components/GuestModeBanner';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, refreshProfile, isGuestMode, exitGuestMode } = useUser();
  const { t } = useI18n();
  const [polishLanguage, setPolishLanguage] = useState(profile?.language === 'pl');
  const [showInsights, setShowInsights] = useState(false);

  // Update toggle state when profile changes
  useEffect(() => {
    setPolishLanguage(profile?.language === 'pl');
  }, [profile?.language]);

  const handleSignOut = async () => {
    if (isGuestMode) {
      await exitGuestMode();
      router.replace('/welcome');
    } else {
    await supabase.auth.signOut();
    router.replace('/auth/sign-in');
    }
  };

  const handleEditProfile = () => {
    router.push('/onboarding?edit=true');
  };

  const toggleLanguage = async () => {
    if (!user?.id) return;
    
    const newLanguage = !polishLanguage ? 'pl' : 'en';
    
    // Optimistically update UI
    setPolishLanguage(!polishLanguage);
    
    // Update language preference in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ language: newLanguage })
      .eq('id', user.id);
      
    if (error) {
      console.error('Error updating language preference:', error);
      // Revert UI state if update fails
      setPolishLanguage(polishLanguage); 
    } else {
      // Refresh profile data to trigger i18n updates
      await refreshProfile();
    }
  };

  if (showInsights) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.insightsHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowInsights(false)}
          >
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.insightsTitle}>{t('profile.readingInsights')}</Text>
        </View>
        <ReadingInsights userId={user?.id} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <View style={styles.childInfoContainer}>
          <Text style={styles.childName}>
            {isGuestMode ? t('guest.guestModeActive') : (profile?.child_name || t('profile.explorer'))}
          </Text>
          <Text style={styles.childAge}>
            {isGuestMode ? t('guest.limitedFeatures') : 
             (profile?.age ? t('profile.yearsOld', { age: profile.age }) : '')}
          </Text>
        </View>
      </View>
      
      {/* Guest Mode Banner */}
      {isGuestMode && (
        <GuestModeBanner showDismiss={false} />
      )}
      
      {/* Reading Stats - Hidden in guest mode */}
      {!isGuestMode && (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('profile.readingStats')}</Text>
          <TouchableOpacity 
            style={styles.insightsButton}
            onPress={() => setShowInsights(true)}
          >
            <BarChart3 size={20} color={colors.primary} />
            <Text style={styles.insightsButtonText}>{t('profile.insights')}</Text>
          </TouchableOpacity>
        </View>
        <ReadingStats userId={user?.id} />
      </View>
      )}
      
      {/* Achievements - Hidden in guest mode */}
      {!isGuestMode && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.achievements')}</Text>
        <AchievementsList userId={user?.id} />
      </View>
      )}
      
      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
        
        {/* Edit Profile - Hidden in guest mode */}
        {!isGuestMode && (
        <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
          <View style={styles.settingLeft}>
            <Edit3 size={24} color={colors.textSecondary} />
            <Text style={styles.settingText}>{t('profile.editProfile')}</Text>
          </View>
        </TouchableOpacity>
        )}
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Globe size={24} color={colors.textSecondary} />
            <Text style={styles.settingText}>{t('profile.polishLanguage')}</Text>
          </View>
          <Switch
            value={polishLanguage}
            onValueChange={isGuestMode ? undefined : toggleLanguage}
            disabled={isGuestMode}
            trackColor={{ false: colors.background, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
          <View style={styles.settingLeft}>
            <LogOut size={24} color={colors.error} />
            <Text style={[styles.settingText, { color: colors.error }]}>
              {isGuestMode ? t('guest.signUpToUnlock') : t('profile.signOut')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Account Deletion - Only show for authenticated users */}
      {!isGuestMode && <AccountDeletion />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginVertical: 24,
  },
  title: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 28,
    color: colors.white,
    marginBottom: 8,
  },
  childInfoContainer: {
    marginTop: 8,
  },
  childName: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
  },
  childAge: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightsButtonText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.primary,
    marginLeft: 8,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.primary,
  },
  insightsTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.white,
    marginLeft: 16,
  },
});