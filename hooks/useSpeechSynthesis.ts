import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { crashProtection } from '@/utils/crashProtection';
import { appReadinessManager } from '@/utils/appReadiness';
import { iOSCompatibilityManager } from '@/utils/iosCompatibility';

// Lazy import of expo-speech to prevent early iOS initialization
let Speech: any = null;

async function getSpeechModule() {
  if (!Speech) {
    try {
      Speech = await import('expo-speech');
    } catch (error) {
      console.error('Failed to load Speech module:', error);
      throw new Error('Speech module not available');
    }
  }
  return Speech;
}

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
        if (Platform.OS !== 'web' && Speech) {
          try {
            const SpeechModule = await getSpeechModule();
            const isSpeaking = await SpeechModule.isSpeakingAsync();
            if (isSpeaking) {
              await SpeechModule.stop();
            }
          } catch (error) {
            console.warn('Speech stop failed:', error);
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

    // Check app readiness first
    if (!appReadinessManager.isAppReady()) {
      console.log('App not ready, speech synthesis disabled');
      return;
    }

    // Check iOS compatibility and ensure audio session is ready
    if (Platform.OS === 'ios') {
      const isCompatible = await iOSCompatibilityManager.checkiOS18Compatibility();
      if (!isCompatible) {
        console.log('iOS compatibility check failed');
        return;
      }
      
      const audioReady = await iOSCompatibilityManager.ensureAudioSessionReady();
      if (!audioReady) {
        console.log('Audio session not ready');
        return;
      }
    }

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
        
        // Get Speech module lazily
        const SpeechModule = await getSpeechModule();
        
        // Add voice availability check for iOS
        if (Platform.OS === 'ios') {
          try {
            const voices = await SpeechModule.getAvailableVoicesAsync();
            if (!voices || voices.length === 0) {
              throw new Error('No voices available');
            }
          } catch (voiceError) {
            console.error('Voice availability check failed:', voiceError);
            throw new Error('Text-to-speech not available');
          }
        }

        // Get optimal config for current iOS version
        const speechConfig = Platform.OS === 'ios' 
          ? iOSCompatibilityManager.getOptimalSpeechConfig()
          : { rate: 0.75, pitch: 1.0, language: 'en-US' };

        // Use crash protection for the speak call
        await SpeechModule.speak(content, {
          language: speechConfig.language || 'en-US',
          pitch: speechConfig.pitch || 1.0,
          rate: speechConfig.rate || 0.75,
          ...(speechConfig.voice !== undefined && { voice: speechConfig.voice }),
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
          onError: (error: any) => {
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