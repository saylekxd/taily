import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ImageSourcePropType } from 'react-native';

interface RotatingLogoDecoratorProps {
  source: ImageSourcePropType;
  style?: any;
  duration?: number;
}

export default function RotatingLogoDecorator({ 
  source, 
  style, 
  duration = 3000 
}: RotatingLogoDecoratorProps) {
  const rotationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startRotation = () => {
      rotationValue.setValue(0);
      Animated.timing(rotationValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(() => startRotation());
    };
    startRotation();
  }, [duration]);

  return (
    <Animated.Image
      source={source}
      style={[
        style,
        {
          transform: [{
            rotate: rotationValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            })
          }]
        }
      ]}
    />
  );
}