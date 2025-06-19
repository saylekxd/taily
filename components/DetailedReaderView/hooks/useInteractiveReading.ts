import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { InteractiveReadingState } from '../types';
import { speechRecognitionService, SpeechRecognitionResult } from '@/services/speechRecognitionService';
import { soundEffectsService } from '@/services/soundEffectsService';
import { storyAnalysisService, WordPosition } from '@/services/storyAnalysisService';

export function useInteractiveReading(storyContent?: string) {
  const [interactiveState, setInteractiveState] = useState<InteractiveReadingState>({
    isListening: false,
    isEnabled: false,
    recognizedWords: [],
    currentWord: null,
    soundEffectsEnabled: true,
  });

  const [triggerWords, setTriggerWords] = useState<WordPosition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayedWordRef = useRef<string | null>(null);

  // Initialize services and analyze story content
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await soundEffectsService.initialize();
        await soundEffectsService.preloadCommonSounds();

        if (storyContent) {
          const analysis = storyAnalysisService.analyzeStoryContent(storyContent);
          setTriggerWords(analysis.triggerWords);
        }
      } catch (error) {
        console.error('Failed to initialize interactive reading services:', error);
        setError(error instanceof Error ? error.message : 'Initialization failed');
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      speechRecognitionService.destroy();
      soundEffectsService.cleanup();
    };
  }, [storyContent]);

  // Set up speech recognition callbacks
  useEffect(() => {
    speechRecognitionService.setCallbacks({
      onResult: handleSpeechResults,
      onError: handleSpeechError,
      onStart: handleSpeechStart,
      onEnd: handleSpeechEnd,
    });
  }, [interactiveState.soundEffectsEnabled, triggerWords]);

  const handleSpeechResults = (results: SpeechRecognitionResult[]) => {
    if (!interactiveState.soundEffectsEnabled || results.length === 0) return;

    results.forEach((result) => {
      const words = result.word.split(' ').filter(w => w.length > 0);
      
      words.forEach((word) => {
        // Check if this word is a trigger word
        const triggerWord = triggerWords.find(tw => 
          tw.word === word || 
          storyAnalysisService.getWordVariations(tw.word).includes(word)
        );

        if (triggerWord && lastPlayedWordRef.current !== word) {
          // Debounce to prevent rapid repeated sounds
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }

          debounceTimeoutRef.current = setTimeout(() => {
            playTriggerWordSound(word);
            lastPlayedWordRef.current = word;
            
            // Clear the last played word after 2 seconds
            setTimeout(() => {
              lastPlayedWordRef.current = null;
            }, 2000);
          }, 300);
        }
      });

      // Update current word and recognized words
      setInteractiveState(prev => ({
        ...prev,
        currentWord: result.word,
        recognizedWords: [...prev.recognizedWords.slice(-10), result.word], // Keep last 10 words
      }));
    });
  };

  const handleSpeechError = (error: string) => {
    console.error('Speech recognition error:', error);
    setError(error);
    setInteractiveState(prev => ({
      ...prev,
      isListening: false,
    }));
  };

  const handleSpeechStart = () => {
    setError(null);
    setInteractiveState(prev => ({
      ...prev,
      isListening: true,
    }));
  };

  const handleSpeechEnd = () => {
    setInteractiveState(prev => ({
      ...prev,
      isListening: false,
    }));
  };

  const playTriggerWordSound = async (word: string) => {
    try {
      const success = await soundEffectsService.playSoundForWord(word, 0.6);
      if (success) {
        console.log(`Played sound for word: ${word}`);
      }
    } catch (error) {
      console.error(`Failed to play sound for word ${word}:`, error);
    }
  };

  const toggleListening = async () => {
    try {
      if (interactiveState.isListening) {
        await speechRecognitionService.stopListening();
      } else {
        if (!interactiveState.isEnabled) {
          setError('Please enable interactive mode first');
          return;
        }

        const success = await speechRecognitionService.startListening({
          language: 'en-US',
          continuous: true,
          interimResults: true,
        });

        if (!success) {
          setError('Failed to start speech recognition');
        }
      }
    } catch (error) {
      console.error('Error toggling listening:', error);
      setError(error instanceof Error ? error.message : 'Failed to toggle listening');
    }
  };

  const toggleInteractiveMode = async () => {
    try {
      const newEnabled = !interactiveState.isEnabled;
      
      if (!newEnabled && interactiveState.isListening) {
        // Stop listening when disabling interactive mode
        await speechRecognitionService.stopListening();
      }

      setInteractiveState(prev => ({ 
        ...prev, 
        isEnabled: newEnabled,
        isListening: newEnabled ? prev.isListening : false,
        currentWord: newEnabled ? prev.currentWord : null,
      }));

      if (newEnabled) {
        setError(null);
      }
    } catch (error) {
      console.error('Error toggling interactive mode:', error);
      setError(error instanceof Error ? error.message : 'Failed to toggle interactive mode');
    }
  };

  const toggleSoundEffects = () => {
    setInteractiveState(prev => ({ 
      ...prev, 
      soundEffectsEnabled: !prev.soundEffectsEnabled 
    }));

    if (!interactiveState.soundEffectsEnabled) {
      // Stop all currently playing sounds when disabling
      soundEffectsService.stopAllSounds();
    }
  };

  const onWordRecognized = (word: string) => {
    // Manual word recognition trigger (for testing or manual activation)
    if (interactiveState.soundEffectsEnabled) {
      playTriggerWordSound(word);
    }
    
    setInteractiveState(prev => ({
      ...prev,
      currentWord: word,
      recognizedWords: [...prev.recognizedWords.slice(-10), word],
    }));
  };

  const clearError = () => {
    setError(null);
  };

  // Platform-specific availability check
  const isAvailable = Platform.OS !== 'web' || 
    (typeof window !== 'undefined' && 
     ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window));

  return {
    interactiveState,
    triggerWords,
    error,
    isAvailable,
    toggleListening,
    toggleInteractiveMode,
    toggleSoundEffects,
    onWordRecognized,
    clearError,
  };
}