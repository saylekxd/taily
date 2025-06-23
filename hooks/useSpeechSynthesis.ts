import { useState, useEffect, useCallback, useRef } from 'react';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { crashProtection } from '@/utils/crashProtection';

interface UseSpeechSynthesisResult {
  isPlaying: boolean;
  toggleReadAloud: () => void;
}

export function useSpeechSynthesis(
  content: string | undefined,
  isMountedRef: React.MutableRefObject<boolean>
): UseSpeechSynthesisResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const speakingRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Cleanup function with safety checks
  const cleanup = useCallback(async () => {
    await crashProtection.wrapAsync(async () => {
      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = undefined;
      }

      // Only stop if we're actually speaking
      if (speakingRef.current) {
        speakingRef.current = false;
        
        // Check if Speech is available before calling stop
        if (Platform.OS !== 'web') {
          const isSpeaking = await Speech.isSpeakingAsync();
          if (isSpeaking) {
            await Speech.stop();
          }
        }
      }

      if (isMountedRef.current) {
        setIsPlaying(false);
      }
    }, (error) => {
      console.warn('Speech cleanup error:', error);
      // Continue cleanup even if Speech.stop() fails
      speakingRef.current = false;
      if (isMountedRef.current) {
        setIsPlaying(false);
      }
    });
  }, [isMountedRef]);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const toggleReadAloud = useCallback(async () => {
    if (!content) return;

    await crashProtection.wrapAsync(async () => {
      if (isPlaying) {
        await cleanup();
      } else {
        // Clear any previous state
        await cleanup();

        // Small delay to ensure cleanup is complete
        await crashProtection.delay(100);

        if (!isMountedRef.current) return;

        speakingRef.current = true;
        
        // Add voice availability check for iOS
        if (Platform.OS === 'ios') {
          try {
            const voices = await Speech.getAvailableVoicesAsync();
            if (!voices || voices.length === 0) {
              throw new Error('No voices available');
            }
          } catch (voiceError) {
            console.error('Voice availability check failed:', voiceError);
            throw new Error('Text-to-speech not available');
          }
        }

        // Use crash protection for the speak call
        await Speech.speak(content, {
          language: 'en-US',
          pitch: 1.0,
          rate: Platform.OS === 'ios' ? 0.5 : 0.75, // iOS needs slower rate
          voice: Platform.OS === 'ios' ? undefined : undefined, // Let system choose voice
          onStart: () => {
            crashProtection.wrap(() => {
              if (isMountedRef.current && speakingRef.current) {
                setIsPlaying(true);
              }
            });
          },
          onDone: () => {
            crashProtection.wrap(() => {
              speakingRef.current = false;
              if (isMountedRef.current) {
                setIsPlaying(false);
              }
            });
          },
          onStopped: () => {
            crashProtection.wrap(() => {
              speakingRef.current = false;
              if (isMountedRef.current) {
                setIsPlaying(false);
              }
            });
          },
          onError: (error) => {
            console.warn('Speech synthesis error:', error);
            crashProtection.wrap(() => {
              speakingRef.current = false;
              if (isMountedRef.current) {
                setIsPlaying(false);
              }
            });
          },
        });
      }
    }, (error) => {
      console.error('Toggle read aloud error:', error);
      speakingRef.current = false;
      if (isMountedRef.current) {
        setIsPlaying(false);
      }
    });
  }, [content, isPlaying, cleanup, isMountedRef]);

  return {
    isPlaying,
    toggleReadAloud,
  };
} 