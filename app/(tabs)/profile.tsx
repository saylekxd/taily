import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, LogOut, ChevronRight } from 'lucide-react-native';
import { useUser } from '@/hooks/useUser';
import AchievementsList from '@/components/AchievementsList';
import ReadingStats from '@/components/ReadingStats';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, logout, refreshProfile } = useUser();
  const [darkMode, setDarkMode] = useState(true);
  const [polishLanguage, setPolishLanguage] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  useEffect(() => {
    if (profile) {
      setPolishLanguage(profile.language === 'pl');
    }
  }, [profile]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              router.replace('/auth/sign-in');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
              console.error('Logout error:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
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
        <Text style={styles.sectionTitle}>Reading Stats</Text>
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
        <View style={styles.settingsContainer}>
          {/* Dark Mode Toggle (Always on for this app) */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={() => {}}
              disabled={true}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          
          {/* Polish Language Toggle */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              {polishLanguage ? 'Polski' : 'English'}
            </Text>
            <Switch
              value={polishLanguage}
              onValueChange={toggleLanguage}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          
          {/* Edit Child Profile */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => router.push('/onboarding?edit=true')}
          >
            <Text style={styles.settingLabel}>Edit Child Profile</Text>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          {/* Logout Button */}
          <TouchableOpacity 
            style={[styles.settingRow, styles.logoutRow]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <Text style={styles.logoutText}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Text>
            <LogOut size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
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
  settingsContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.white,
  },
  logoutRow: {
    borderBottomWidth: 0,
  },
  logoutText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.error,
  },
});