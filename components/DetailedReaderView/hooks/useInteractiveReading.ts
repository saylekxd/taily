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
  
  // Add tracking for processed content to prevent re-processing
  const processedContentRef = useRef<string>('');
  const recentlyPlayedWordsRef = useRef<Map<string, number>>(new Map());
  const isActiveSessionRef = useRef<boolean>(false);
  const triggerWordSoundsRef = useRef<Map<string, string>>(new Map()); // word -> sound_url mapping

  // Preload sounds for trigger words to enable immediate playback
  const preloadTriggerWordSounds = async (triggerWords: WordPosition[]) => {
    console.log('🔊 Preloading sounds for trigger words...');
    
    try {
      // Get sound effects for all trigger words
      const results = await Promise.allSettled(
        triggerWords.map(async (tw) => {
          const soundEffect = await soundEffectsService.getSoundEffectForWord(tw.word.toLowerCase());
          if (soundEffect?.sound_effect_url) {
            // Store the mapping for instant lookup
            triggerWordSoundsRef.current.set(tw.word.toLowerCase(), soundEffect.sound_effect_url);
            
            // Preload the sound into cache
            await soundEffectsService.preloadSound(soundEffect.sound_effect_url);
            
            console.log(`🔊 Preloaded sound for word: ${tw.word}`);
            return { word: tw.word, success: true };
          }
          return { word: tw.word, success: false };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const total = triggerWords.length;
      console.log(`🔊 Preloaded ${successful}/${total} trigger word sounds`);
    } catch (error) {
      console.error('🔊 Failed to preload trigger word sounds:', error);
    }
  };

  // Initialize services and analyze story content
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await soundEffectsService.initialize();
        await soundEffectsService.preloadCommonSounds();

        if (storyContent) {
          const analysis = await storyAnalysisService.analyzeStoryContent(storyContent);
          setTriggerWords(analysis.triggerWords);
          console.log('Initialized trigger words:', analysis.triggerWords.map(tw => tw.word));

          // Preload sounds for all trigger words for immediate playback
          await preloadTriggerWordSounds(analysis.triggerWords);
        }
      } catch (error) {
        console.error('Failed to initialize interactive reading services:', error);
        setError(error instanceof Error ? error.message : 'Initialization failed');
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      isActiveSessionRef.current = false;
      triggerWordSoundsRef.current.clear();
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
      const triggerWordsList = triggerWords.map(tw => tw.word.toLowerCase());
      
      if (triggerWordsList.includes(lastWord)) {
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
      // First check if we have a preloaded sound for immediate playback
      const preloadedSoundUrl = triggerWordSoundsRef.current.get(word.toLowerCase());
      
      if (preloadedSoundUrl) {
        console.log('🔊 Using preloaded sound for immediate playback:', preloadedSoundUrl);
        const success = await soundEffectsService.playSound(preloadedSoundUrl, 0.6);
        
        // Check again after async operation in case session ended while waiting
        if (!isActiveSessionRef.current) {
          console.log('🔊 Session ended during sound operation, stopping any playback for word:', word);
          return;
        }
        
        if (success) {
          console.log(`🔊 Successfully played preloaded sound for word: ${word}`);
        } else {
          console.log(`🔊 Failed to play preloaded sound for word: ${word}`);
        }
      } else {
        // Fallback to database query (slower but more comprehensive)
        console.log('🔊 No preloaded sound found, querying database...');
        const success = await soundEffectsService.playSoundForWord(word, 0.6);
        
        // Check again after async operation in case session ended while waiting
        if (!isActiveSessionRef.current) {
          console.log('🔊 Session ended during sound operation, stopping any playback for word:', word);
          return;
        }
        
        if (success) {
          console.log(`🔊 Successfully played sound for word: ${word}`);
        } else {
          console.log(`🔊 Failed to play sound for word: ${word}`);
        }
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
      console.log('🔊 onWordRecognized triggering playTriggerWordSound');
      playTriggerWordSound(word);
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