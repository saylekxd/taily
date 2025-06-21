import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { InteractiveReadingState } from '../types';
import { speechRecognitionService, SpeechRecognitionResult } from '@/services/speechRecognitionService';
import { soundEffectsService } from '@/services/soundEffectsService';

interface EnhancedInteractiveReadingState extends InteractiveReadingState {
  hasRetriableError: boolean;
  autoRetryCount: number;
}

export function useInteractiveReadingWithErrorHandling(
  storyContent?: string, 
  storyId?: string, 
  personalizedStoryId?: string
) {
  const [interactiveState, setInteractiveState] = useState<EnhancedInteractiveReadingState>({
    isListening: false,
    isEnabled: false,
    recognizedWords: [],
    currentWord: null,
    soundEffectsEnabled: true,
    hasRetriableError: false,
    autoRetryCount: 0,
  });

  const [triggerWords, setTriggerWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Add tracking for processed content to prevent re-processing
  const processedContentRef = useRef<string>('');
  const recentlyPlayedWordsRef = useRef<Map<string, number>>(new Map());
  const isActiveSessionRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if error is retriable (203/Retry errors)
  const isRetriableError = useCallback((errorMessage: string) => {
    return errorMessage?.includes('203') || 
           errorMessage?.includes('Retry') || 
           errorMessage?.includes('recognition_fail');
  }, []);

  // Auto-retry logic for retriable errors
  const performAutoRetry = useCallback(async () => {
    if (interactiveState.autoRetryCount >= 3) return; // Max 3 retries

    console.log(`🔍 Auto-retry attempt ${interactiveState.autoRetryCount + 1}/3`);
    
    setInteractiveState(prev => ({
      ...prev,
      autoRetryCount: prev.autoRetryCount + 1,
      hasRetriableError: false,
    }));

    // Wait a moment then try to restart speech recognition
    setTimeout(async () => {
      if (interactiveState.isEnabled && !interactiveState.isListening) {
        const success = await speechRecognitionService.startListening({
          language: 'en-US',
          continuous: true,
          interimResults: true,
        });

        if (success) {
          setError(null);
          console.log('🔍 Auto-retry successful');
        } else {
          console.log('🔍 Auto-retry failed');
        }
      }
    }, 1000);
  }, [interactiveState.autoRetryCount, interactiveState.isEnabled, interactiveState.isListening]);

  const loadTriggerWords = async () => {
    try {
      console.log('🔊 Hook: Loading trigger words for story:', { personalizedStoryId, storyId });
      
      // Load story-specific trigger words and mappings
      const storyMappings = await soundEffectsService.getSoundEffectsForStory(
        storyId || personalizedStoryId || '', 
        !!personalizedStoryId
      );
      const storySpecificWords = storyMappings.map(mapping => mapping.word);
      console.log('🔊 Hook: Loaded story-specific trigger words:', storySpecificWords.length, 'words');
      
      // Load general trigger words as fallback
      const generalEffects = await soundEffectsService.getAllSoundEffects();
      const generalWords = generalEffects.map(effect => effect.word);
      console.log('🔊 Hook: Loaded general trigger words:', generalWords.length, 'words');
      
      const allWords = [...new Set([...storySpecificWords, ...generalWords])];
      setTriggerWords(allWords);
      console.log('🔊 Hook: Final trigger words loaded:', allWords.length, 'total words:', allWords);
      
    } catch (error) {
      console.error('🔊 Hook: Error loading trigger words:', error);
      // Fallback to hardcoded words if database fails
      const fallbackWords = [
        'roar', 'roared', 'roaring',
        'meow', 'meowed', 'meowing', 
        'woof', 'woofed', 'bark', 'barked', 'barking',
        'chirp', 'chirped', 'chirping', 'tweet', 'tweeted',
        'splash', 'splashed', 'splashing',
        'thunder', 'thundered', 'thundering',
        'wind', 'windy', 'whoosh', 'whooshed',
        'magic', 'magical', 'sparkle', 'sparkled', 'sparkling'
      ];
      setTriggerWords(fallbackWords);
      console.log('🔊 Hook: Using fallback trigger words:', fallbackWords.length, 'words');
    }
  };

  // Initialize services and load trigger words
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await soundEffectsService.initialize();
        await soundEffectsService.preloadCommonSounds();
        
        // Load trigger words from database
        await loadTriggerWords();
      } catch (error) {
        console.error('Failed to initialize interactive reading services:', error);
        setError(error instanceof Error ? error.message : 'Initialization failed');
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      isActiveSessionRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      speechRecognitionService.destroy();
      soundEffectsService.cleanup();
    };
  }, [storyContent, storyId, personalizedStoryId]);

  // Set up speech recognition callbacks
  useEffect(() => {
    speechRecognitionService.setCallbacks({
      onResult: handleSpeechResults,
      onError: handleSpeechError,
      onStart: handleSpeechStart,
      onEnd: handleSpeechEnd,
    });
  }, [interactiveState.soundEffectsEnabled, triggerWords]);

  // Clean up old played words periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const oldEntries: string[] = [];
      
      recentlyPlayedWordsRef.current.forEach((timestamp, word) => {
        if (now - timestamp > 3000) { // Remove entries older than 3 seconds
          oldEntries.push(word);
        }
      });
      
      oldEntries.forEach(word => recentlyPlayedWordsRef.current.delete(word));
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  const handleSpeechResults = (results: SpeechRecognitionResult[]) => {
    if (!interactiveState.soundEffectsEnabled || results.length === 0) return;

    console.log('🔍 Raw speech results:', results);

    results.forEach((result) => {
      // Clean and normalize the result
      const normalizedSentence = result.word.toLowerCase().trim();
      console.log('🔍 Current recognition:', normalizedSentence);
      
      // Extract the last word from the current recognition
      const words = normalizedSentence.split(/\s+/);
      const lastWord = words[words.length - 1];
      
      console.log('🔍 Extracted last word:', lastWord, 'from words array:', words.slice(-3)); // Show last 3 words for debugging
      
      // Skip if it's too short
      if (lastWord.length < 3) {
        console.log('🔍 Skipping word too short:', lastWord);
        return;
      }
      
      // Simple check: if this exact word was processed recently, skip it
      const lastProcessedWord = processedContentRef.current;
      if (lastWord === lastProcessedWord) {
        console.log('🔍 Skipping already processed word:', lastWord);
        return;
      }

      console.log('🔍 New word detected:', lastWord);

      // Update what we've processed with just the last word
      processedContentRef.current = lastWord;

      // Check if it's a trigger word
      if (triggerWords.includes(lastWord)) {
        // Check if this word was played recently
        const lastPlayed = recentlyPlayedWordsRef.current.get(lastWord);
        if (lastPlayed && Date.now() - lastPlayed < 2000) {
          console.log('🔍 Skipping recently played word:', lastWord);
          return;
        }

        console.log('🔍 Playing sound for trigger word:', lastWord);
        playTriggerWordSound(lastWord);
        recentlyPlayedWordsRef.current.set(lastWord, Date.now());
      }

      // Update UI state with just the last word
      setInteractiveState(prev => ({
        ...prev,
        currentWord: lastWord,
        recognizedWords: [...prev.recognizedWords.slice(-10), lastWord],
      }));
    });
  };

  const handleSpeechError = (error: string) => {
    console.error('🔍 Speech recognition error:', error);
    
    // Mark session as inactive
    isActiveSessionRef.current = false;
    processedContentRef.current = '';
    
    const isRetriable = isRetriableError(error);
    
    setError(error);
    setInteractiveState(prev => ({
      ...prev,
      isListening: false,
      hasRetriableError: isRetriable,
    }));

    // Auto-retry for retriable errors if enabled and under retry limit
    if (isRetriable && interactiveState.isEnabled && interactiveState.autoRetryCount < 3) {
      retryTimeoutRef.current = setTimeout(() => {
        performAutoRetry();
      }, 5000); // Wait 5 seconds before retry
    }
  };

  const handleSpeechStart = () => {
    console.log('🔍 Speech recognition started - resetting session');
    
    // Reset session tracking and error state
    processedContentRef.current = '';
    isActiveSessionRef.current = true;
    
    setError(null);
    setInteractiveState(prev => ({
      ...prev,
      isListening: true,
      hasRetriableError: false,
      autoRetryCount: 0, // Reset retry count on successful start
    }));
  };

  const handleSpeechEnd = () => {
    console.log('🔍 Speech recognition ended - clearing session data');
    
    // Mark session as inactive to prevent any pending sound operations
    isActiveSessionRef.current = false;
    
    // Reset processed content when speech ends
    processedContentRef.current = '';
    
    setInteractiveState(prev => ({
      ...prev,
      isListening: false,
    }));
  };

  const playTriggerWordSound = async (word: string) => {
    console.log('🔊 playTriggerWordSound called with word:', word);
    
    // Check if session is still active before proceeding
    if (!isActiveSessionRef.current) {
      console.log('🔊 Session no longer active, aborting sound playback for word:', word);
      return;
    }
    
    try {
      // Use story-specific sound mapping with fallback to general sounds
      console.log('🔊 Using story-specific sound mapping for word:', word);
      const success = await soundEffectsService.playSoundForWordInStory(
        word, 
        storyId, 
        personalizedStoryId, 
        0.6
      );
    
      // Check again after async operation in case session ended while waiting
      if (!isActiveSessionRef.current) {
        console.log('🔊 Session ended during sound operation, stopping any playback for word:', word);
        return;
      }
      
      if (success) {
        console.log(`🔊 Successfully played story-specific sound for word: ${word}`);
      } else {
        console.log(`🔊 Failed to play story-specific sound for word: ${word}`);
      }
    } catch (error) {
      console.error(`🔊 Error playing sound for word ${word}:`, error);
    }
  };

  const toggleListening = async () => {
    try {
      if (interactiveState.isListening) {
        // Mark session as inactive when stopping
        isActiveSessionRef.current = false;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        await speechRecognitionService.stopListening();
      } else {
        if (!interactiveState.isEnabled) {
          setError('Please enable interactive mode first');
          return;
        }

        // Reset tracking when starting to listen
        processedContentRef.current = '';
        isActiveSessionRef.current = true;

        const success = await speechRecognitionService.startListening({
          language: 'en-US',
          continuous: true,
          interimResults: true,
        });

        if (!success) {
          isActiveSessionRef.current = false;
          setError('Failed to start speech recognition');
        }
      }
    } catch (error) {
      console.error('Error toggling listening:', error);
      isActiveSessionRef.current = false;
      setError(error instanceof Error ? error.message : 'Failed to toggle listening');
    }
  };

  const toggleInteractiveMode = async () => {
    try {
      const newEnabled = !interactiveState.isEnabled;
      
      if (!newEnabled && interactiveState.isListening) {
        // Mark session as inactive and stop listening when disabling interactive mode
        isActiveSessionRef.current = false;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        await speechRecognitionService.stopListening();
      }

      // Reset tracking when toggling mode
      processedContentRef.current = '';
      if (!newEnabled) {
        isActiveSessionRef.current = false;
      }

      setInteractiveState(prev => ({ 
        ...prev, 
        isEnabled: newEnabled,
        isListening: newEnabled ? prev.isListening : false,
        currentWord: newEnabled ? prev.currentWord : null,
        hasRetriableError: false,
        autoRetryCount: 0,
      }));

      if (newEnabled) {
        setError(null);
      }
    } catch (error) {
      console.error('Error toggling interactive mode:', error);
      isActiveSessionRef.current = false;
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
    console.log('🔊 onWordRecognized called with word:', word);
    
    // Check if session is active before processing manual word recognition
    if (!isActiveSessionRef.current) {
      console.log('🔊 onWordRecognized skipped - session not active');
      return;
    }
    
    // Manual word recognition trigger (for testing or manual activation)
    if (interactiveState.soundEffectsEnabled) {
      console.log('🔊 onWordRecognized triggering story-specific sound');
      // Use story-specific sound mapping directly for manual activation
      soundEffectsService.playSoundForWordInStory(
        word, 
        storyId, 
        personalizedStoryId, 
        0.6
      ).then(success => {
        if (success) {
          console.log(`🔊 Successfully played story-specific sound for manually recognized word: ${word}`);
        } else {
          console.log(`🔊 Failed to play story-specific sound for manually recognized word: ${word}`);
        }
      }).catch(error => {
        console.error(`🔊 Error playing story-specific sound for manually recognized word ${word}:`, error);
      });
    } else {
      console.log('🔊 onWordRecognized skipped - sound effects disabled');
    }
    
    setInteractiveState(prev => ({
      ...prev,
      currentWord: word,
      recognizedWords: [...prev.recognizedWords.slice(-10), word],
    }));
  };

  const clearError = () => {
    setError(null);
    setInteractiveState(prev => ({
      ...prev,
      hasRetriableError: false,
      autoRetryCount: 0,
    }));
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  };

  const manualRetry = async () => {
    setInteractiveState(prev => ({
      ...prev,
      autoRetryCount: 0,
      hasRetriableError: false,
    }));
    
    await performAutoRetry();
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
    manualRetry,
  };
} 