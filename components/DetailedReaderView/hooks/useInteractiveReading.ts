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
    
    // Reset processed content on error
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
    
    setError(null);
    setInteractiveState(prev => ({
      ...prev,
      isListening: true,
    }));
  };

  const handleSpeechEnd = () => {
    console.log('🔍 Speech recognition ended - clearing session data');
    
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
    
    try {
      console.log('🔊 About to call soundEffectsService.playSoundForWord');
      const success = await soundEffectsService.playSoundForWord(word, 0.6);
      if (success) {
        console.log(`🔊 Successfully played sound for word: ${word}`);
      } else {
        console.log(`🔊 Failed to play sound for word: ${word}`);
      }
    } catch (error) {
      console.error(`🔊 Error playing sound for word ${word}:`, error);
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

        // Reset tracking when starting to listen
        processedContentRef.current = '';

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

      // Reset tracking when toggling mode
      processedContentRef.current = '';

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
    console.log('🔊 onWordRecognized called with word:', word);
    console.log('🔊 onWordRecognized stack trace:', new Error().stack);
    
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