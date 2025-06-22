import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';

interface FloatingStarProps {
  size: number;
  color: string;
  delay: number;
  startPosition: {
    bottom: number;
    left: number; // Changed to number for percentage
  };
}

const FloatingStar: React.FC<FloatingStarProps> = ({
  size,
  color,
  delay,
  startPosition
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Soft, gentle upward movement
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 100 }), // Start position
          withTiming(-150, {
            duration: 3500, // Slower, more gentle
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Soft easing
          })
        ),
        -1,
        false
      )
    );

    // Gentle fade in and out
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 100 }),
          withTiming(0.8, {
            duration: 800,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0.8, { duration: 1500 }),
          withTiming(0, {
            duration: 1200,
            easing: Easing.in(Easing.cubic),
          })
        ),
        -1,
        false
      )
    );

    // Gentle scale animation
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 100 }),
          withTiming(1, {
            duration: 1000,
            easing: Easing.out(Easing.back(1.2)),
          }),
          withTiming(0.7, {
            duration: 1400,
            easing: Easing.inOut(Easing.cubic),
          }),
          withTiming(0.3, {
            duration: 1000,
            easing: Easing.in(Easing.cubic),
          })
        ),
        -1,
        false
      )
    );

    // Gentle rotation
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          zIndex: 10,
          bottom: startPosition.bottom,
          left: `${startPosition.left}%`,
        },
        animatedStyle,
      ]}
    >
      <Sparkles size={size} color={color} />
    </Animated.View>
  );
};

interface FloatingStarsProps {
  isVisible?: boolean;
}

export default function FloatingStars({ isVisible = true }: FloatingStarsProps) {
  if (!isVisible) return null;

  const stars = [
    {
      size: 16,
      color: colors.accent,
      delay: 0,
      startPosition: { bottom: 85, left: 47 },
    },
    {
      size: 12,
      color: colors.accent + 'DD',
      delay: 600,
      startPosition: { bottom: 80, left: 38 },
    },
    {
      size: 14,
      color: colors.accent + 'BB',
      delay: 1200,
      startPosition: { bottom: 90, left: 56 },
    },
    {
      size: 10,
      color: colors.accent + '99',
      delay: 1800,
      startPosition: { bottom: 75, left: 28 },
    },
    {
      size: 18,
      color: colors.accent + 'EE',
      delay: 2400,
      startPosition: { bottom: 95, left: 62 },
    },
    {
      size: 11,
      color: colors.accent + 'CC',
      delay: 3000,
      startPosition: { bottom: 88, left: 43 },
    },
  ];

  return (
    <View style={{ position: 'absolute', width: '100%', height: '100%' }}>
      {stars.map((star, index) => (
        <FloatingStar
          key={index}
          size={star.size}
          color={star.color}
          delay={star.delay}
          startPosition={star.startPosition}
        />
      ))}
    </View>
  );
} 