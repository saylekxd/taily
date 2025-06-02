import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
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
  const { t } = useI18n();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
        { backgroundColor: isSelected ? category.color : colors.card }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.text,
        isSelected && styles.selectedText
      ]}>
        {t(`categories.${category.id}`) || category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginVertical: 4,
  },
  selectedContainer: {
    borderColor: colors.white,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedText: {
    color: colors.white,
  },
});