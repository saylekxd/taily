import { View, StyleSheet, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { colors } from '@/constants/colors';

type ProgressBarProps = {
  progress: number;  // Value between 0 and 1
  color?: string;
  height?: number;
};

export default function ProgressBar({ 
  progress, 
  color = colors.primary,
  height = 4
}: ProgressBarProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={[styles.container, { height }]}>
      <Animated.View 
        style={[
          styles.progressFill, 
          { 
            backgroundColor: color,
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.border,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressFill: {
    height: '100%',
  },
});