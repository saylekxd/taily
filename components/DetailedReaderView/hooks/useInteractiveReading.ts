import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { InteractiveReadingState } from '../types';
import { speechRecognitionService, SpeechRecognitionResult } from '@/services/speechRecognitionService';
import { soundEffectsService } from '@/services/soundEffectsService';

export function useInteractiveReading(
  storyContent?: string, 
  storyId?: string, 
  personalizedStoryId?: string
) {
  const [interactiveState, setInteractiveState] = useState<InteractiveReadingState>({
    isListening: false,
    isEnabled: false,
    recognizedWords: [],
    currentWord: null,
    soundEffectsEnabled: true,
  });

  const [triggerWords, setTriggerWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Add tracking for processed content to prevent re-processing
  const processedContentRef = useRef<string>('');
  const recentlyPlayedWordsRef = useRef<Map<string, number>>(new Map());
  const isActiveSessionRef = useRef<boolean>(false);

  // Load trigger words from database (same logic as ReaderContent)
  const loadTriggerWords = async () => {
    try {
      console.log('🔊 Hook: Loading trigger words for story:', { storyId, personalizedStoryId });
      
      const words = new Set<string>();
      
      // First, get general trigger words from sound_effect_triggers table
      const generalEffects = await soundEffectsService.getAllSoundEffects();
      generalEffects.forEach(effect => {
        words.add(effect.word.toLowerCase());
      });
      
      console.log('🔊 Hook: Loaded general trigger words:', generalEffects.length, 'words');
      
      // Then, get story-specific mappings if we have a story ID
      if (storyId || personalizedStoryId) {
        const storyMappings = await soundEffectsService.getSoundEffectsForStory(
          storyId || personalizedStoryId!,
          !!personalizedStoryId
        );
        
        storyMappings.forEach(mapping => {
          words.add(mapping.word.toLowerCase());
        });
        
        console.log('🔊 Hook: Loaded story-specific mappings:', storyMappings.length, 'mappings');
      }
      
      const finalTriggerWords = Array.from(words);
      setTriggerWords(finalTriggerWords);
      
      console.log('🔊 Hook: Final trigger words loaded:', finalTriggerWords.length, 'total words:', finalTriggerWords);
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
      const lastWord = words[words.length - 1].replace(/[^\w]/g, '');
      
      // Skip if it's too short or we've already processed this exact sentence
      if (lastWord.length < 3 || normalizedSentence === processedContentRef.current) {
        return;
      }
      
      // Check if this is genuinely a new word (not already in our processed content)
      const processedWords = processedContentRef.current.split(/\s+/);
      const isNewWord = words.length > processedWords.length;
      
      if (!isNewWord) {
        console.log('🔍 No new word detected');
        return;
      }

      console.log('🔍 New word detected:', lastWord);

      // Update what we've processed
      processedContentRef.current = normalizedSentence;

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
    
    // Mark session as inactive and reset processed content on error
    isActiveSessionRef.current = false;
    processedContentRef.current = '';
    
    setError(error);
    setInteractiveState(prev => ({
      ...prev,
      isListening: false,
    }));
  };

  const handleSpeechStart = () => {
    console.log('🔍 Speech recognition started - resetting session');
    
    // Reset session tracking
    processedContentRef.current = '';
    isActiveSessionRef.current = true;
    
    setError(null);
    setInteractiveState(prev => ({
      ...prev,
      isListening: true,
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
    console.log('🔊 Stack trace:', new Error().stack);
    
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
    console.log('🔊 onWordRecognized stack trace:', new Error().stack);
    
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