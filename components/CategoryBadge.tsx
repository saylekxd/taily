import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { Category } from '@/types';

type CategoryBadgeProps = {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
};

export default function CategoryBadge({ 
  category, 
  isSelected, 
  onPress 
}: CategoryBadgeProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
        { backgroundColor: isSelected ? category.color : colors.card }
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.text,
        isSelected && styles.selectedText
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedContainer: {
    borderColor: colors.white,
  },
  text: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedText: {
    color: colors.white,
  },
});