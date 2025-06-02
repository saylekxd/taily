import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/colors';
import { Interest } from '@/types';

type InterestSelectorProps = {
  interests: Interest[];
  selectedInterests: string[];
  onSelectInterest: (interestId: string) => void;
};

export default function InterestSelector({
  interests,
  selectedInterests,
  onSelectInterest,
}: InterestSelectorProps) {
  return (
    <View style={styles.container}>
      {interests.map((interest) => (
        <TouchableOpacity
          key={interest.id}
          style={[
            styles.interestItem,
            selectedInterests.includes(interest.id) && styles.selectedInterest,
          ]}
          onPress={() => onSelectInterest(interest.id)}
        >
          <Text
            style={[
              styles.interestText,
              selectedInterests.includes(interest.id) && styles.selectedInterestText,
            ]}
          >
            {interest.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  interestItem: {
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 6,
  },
  selectedInterest: {
    backgroundColor: colors.primary,
  },
  interestText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedInterestText: {
    color: colors.white,
  },
});