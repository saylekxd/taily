import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { colors } from '@/constants/colors';

type StreakCounterProps = {
  streak: number;
};

export default function StreakCounter({ streak }: StreakCounterProps) {
  // Determine streak color based on streak count
  const getStreakColor = () => {
    if (streak >= 30) return '#FF4500'; // Orange-red for 30+ days
    if (streak >= 14) return '#FFA500'; // Orange for 14+ days
    if (streak >= 7) return '#FFD700';  // Gold for 7+ days
    return colors.accent;               // Default color
  };

  return (
    <View style={styles.container}>
      <Flame size={20} color={getStreakColor()} />
      <Text style={[styles.streakText, { color: getStreakColor() }]}>
        {streak} {streak === 1 ? 'day' : 'days'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  streakText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    marginLeft: 4,
  },
});