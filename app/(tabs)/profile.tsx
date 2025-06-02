import { useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import ReadingStats from '@/components/ReadingStats';
import AchievementsList from '@/components/AchievementsList';
import ReadingInsights from '@/components/ReadingInsights';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, refreshProfile } = useUser();
  const [polishLanguage, setPolishLanguage] = useState(profile?.language === 'pl');
  const [showInsights, setShowInsights] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/sign-in');
  };

  const handleEditProfile = () => {
    router.push('/onboarding?edit=true');
  };

  const toggleLanguage = async () => {
    if (!user?.id) return;
    
    const newLanguage = !polishLanguage ? 'pl' : 'en';
    setPolishLanguage(!polishLanguage);
    
    // Update language preference in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ language: newLanguage })
      .eq('id', user.id);
      
    if (error) {
      console.error('Error updating language preference:', error);
      setPolishLanguage(polishLanguage); // Revert UI state if update fails
    } else {
      refreshProfile(); // Refresh profile data
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
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.insightsTitle}>Reading Insights</Text>
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
        <Text style={styles.title}>Profile</Text>
        <View style={styles.childInfoContainer}>
          <Text style={styles.childName}>{profile?.child_name || 'Explorer'}</Text>
          <Text style={styles.childAge}>
            {profile?.age ? `${profile.age} years old` : ''}
          </Text>
        </View>
      </View>
      
      {/* Reading Stats */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reading Stats</Text>
          <TouchableOpacity 
            style={styles.insightsButton}
            onPress={() => setShowInsights(true)}
          >
            <BarChart3 size={20} color={colors.primary} />
            <Text style={styles.insightsButtonText}>Insights</Text>
          </TouchableOpacity>
        </View>
        <ReadingStats userId={user?.id} />
      </View>
      
      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <AchievementsList userId={user?.id} />
      </View>
      
      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
          <View style={styles.settingLeft}>
            <Edit3 size={24} color={colors.textSecondary} />
            <Text style={styles.settingText}>Edit Profile</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Globe size={24} color={colors.textSecondary} />
            <Text style={styles.settingText}>Polish Language</Text>
          </View>
          <Switch
            value={polishLanguage}
            onValueChange={toggleLanguage}
            trackColor={{ false: colors.background, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
          <View style={styles.settingLeft}>
            <LogOut size={24} color={colors.error} />
            <Text style={[styles.settingText, { color: colors.error }]}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>
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