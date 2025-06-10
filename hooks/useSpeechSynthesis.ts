import { useState, useEffect } from 'react';
import * as Speech from 'expo-speech';

interface UseSpeechSynthesisResult {
  isPlaying: boolean;
  toggleReadAloud: () => void;
}

export function useSpeechSynthesis(
  content: string | undefined,
  isMountedRef: React.MutableRefObject<boolean>
): UseSpeechSynthesisResult {
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (isPlaying) {
        Speech.stop();
      }
    };
  }, [isPlaying]);

  const toggleReadAloud = () => {
    if (!content) return;
    
    if (isPlaying) {
      Speech.stop();
      if (isMountedRef.current) {
        setIsPlaying(false);
      }
    } else {
      Speech.speak(content, {
        onStart: () => {
          if (isMountedRef.current) setIsPlaying(true);
        },
        onDone: () => {
          if (isMountedRef.current) setIsPlaying(false);
        },
        onStopped: () => {
          if (isMountedRef.current) setIsPlaying(false);
        },
        onError: () => {
          if (isMountedRef.current) setIsPlaying(false);
        },
      });
    }
  };

  return {
    isPlaying,
    toggleReadAloud,
  };
} 