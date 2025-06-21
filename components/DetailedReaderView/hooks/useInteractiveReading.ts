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
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearWordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlayedWordRef = useRef<string | null>(null);
  
  // Add tracking for processed content to prevent re-processing
  const processedContentRef = useRef<string>('');
  const lastProcessedTimestampRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(0);

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
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (clearWordTimeoutRef.current) {
        clearTimeout(clearWordTimeoutRef.current);
      }
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

    console.log('🔍 Raw speech results:', results);

    results.forEach((result) => {
      // Clean and normalize the result
      const normalizedSentence = result.word.toLowerCase().trim();
      console.log('🔍 Processing sentence:', normalizedSentence);
      console.log('🔍 Previous processed content:', processedContentRef.current);
      
      // Skip if this is the same content we just processed (common with interim results)
      if (normalizedSentence === processedContentRef.current) {
        console.log('🔍 Skipping duplicate content');
        return;
      }

      // Determine what content to process
      let newContent = normalizedSentence;
      
      if (processedContentRef.current) {
        if (normalizedSentence.startsWith(processedContentRef.current)) {
          // Normal cumulative case - extract only new content
          newContent = normalizedSentence.substring(processedContentRef.current.length).trim();
          console.log('🔍 Detected cumulative content, extracted new part:', newContent);
          console.log('🔍 Previous length:', processedContentRef.current.length, 'New length:', normalizedSentence.length);
        } else {
          // Check if this might be a correction (substantial overlap but not exact prefix)
          const previousWords = processedContentRef.current.split(/\s+/);
          const currentWords = normalizedSentence.split(/\s+/);
          
          // Calculate overlap - how many words from the start are the same
          let overlapCount = 0;
          const minLength = Math.min(previousWords.length, currentWords.length);
          
          for (let i = 0; i < minLength; i++) {
            if (previousWords[i] === currentWords[i]) {
              overlapCount++;
            } else {
              break;
            }
          }
          
          const overlapPercentage = overlapCount / previousWords.length;
          console.log('🔍 Overlap analysis:', {
            overlapCount,
            previousLength: previousWords.length,
            overlapPercentage: overlapPercentage.toFixed(2)
          });
          
          if (overlapPercentage >= 0.7) {
            // This looks like a correction - only process words after the overlap
            const overlappingContent = previousWords.slice(0, overlapCount).join(' ');
            newContent = normalizedSentence.substring(overlappingContent.length).trim();
            console.log('🔍 Detected correction, processing only new/changed part:', newContent);
            console.log('🔍 Overlapping content (skipped):', overlappingContent);
          } else {
            // Low overlap - process only the non-overlapping new content
            const overlappingContent = previousWords.slice(0, overlapCount).join(' ');
            newContent = normalizedSentence.substring(overlappingContent.length).trim();
            console.log('🔍 Low overlap detected, processing non-overlapping part:', newContent);
            console.log('🔍 Overlapping content (skipped):', overlappingContent);
          }
        }
      }
      
      // Skip if no new content
      if (!newContent || newContent.length === 0) {
        console.log('🔍 No new content to process');
        return;
      }

      console.log('🔍 Content to process:', newContent);

      // Split into individual words and clean them
      const words = newContent
        .split(/\s+/)
        .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
        .filter(word => word.length > 2); // Only consider words with 3+ characters
      
      console.log('🔍 Extracted NEW words to check:', words);

      // Process each word
      words.forEach((word) => {
        // Create exact match list from trigger words
        const triggerWordsList = triggerWords.map(tw => tw.word.toLowerCase());
        
        console.log('🔍 Checking word:', word, 'against triggers:', triggerWordsList);
        
        // Check for exact match first
        let matchedTriggerWord = null;
        if (triggerWordsList.includes(word)) {
          matchedTriggerWord = word;
        } else {
          // Check word variations only if no exact match
          const matchingTrigger = triggerWords.find(tw => {
            const variations = storyAnalysisService.getWordVariations(tw.word);
            return variations.some(variation => variation.toLowerCase() === word);
          });
          
          if (matchingTrigger) {
            matchedTriggerWord = matchingTrigger.word;
          }
        }

        if (matchedTriggerWord) {
          console.log('🔍 Found matching trigger word:', matchedTriggerWord, 'for spoken word:', word);
          
          // Check if this word was recently played to prevent spam
          if (lastPlayedWordRef.current === matchedTriggerWord) {
            console.log('🔍 Skipping recently played word:', matchedTriggerWord);
            return;
          }

          // Play sound immediately
          console.log('🔍 Playing sound immediately for trigger word:', matchedTriggerWord);
          playTriggerWordSound(matchedTriggerWord);
          lastPlayedWordRef.current = matchedTriggerWord;
          
          // Clear any existing clear timeout
          if (clearWordTimeoutRef.current) {
            clearTimeout(clearWordTimeoutRef.current);
            clearWordTimeoutRef.current = null;
            console.log('🔍 Cleared existing word clear timeout');
          }
          
          // Set timeout to clear the last played word after 3 seconds 
          clearWordTimeoutRef.current = setTimeout(() => {
            if (lastPlayedWordRef.current === matchedTriggerWord) {
              lastPlayedWordRef.current = null;
              clearWordTimeoutRef.current = null;
              console.log('🔍 Cleared last played word:', matchedTriggerWord);
            }
          }, 3000);
        } else {
          console.log('🔍 No trigger word found for:', word);
        }
      });

      // Update processed content reference AFTER processing
      processedContentRef.current = normalizedSentence;
      console.log('🔍 Updated processed content to:', processedContentRef.current);

      // Update current word and recognized words (for display purposes)
      // Only show the new content, not the entire accumulated sentence
      setInteractiveState(prev => ({
        ...prev,
        currentWord: newContent,
        recognizedWords: [...prev.recognizedWords.slice(-5), newContent], // Keep last 5 new phrases
      }));
    });
  };

  const handleSpeechError = (error: string) => {
    console.error('🔍 Speech recognition error:', error);
    
    // Reset processed content on error
    processedContentRef.current = '';
    
    // Clear any pending timeouts on error
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      console.log('🔍 Cleared timeout due to speech error');
    }
    
    if (clearWordTimeoutRef.current) {
      clearTimeout(clearWordTimeoutRef.current);
      clearWordTimeoutRef.current = null;
      console.log('🔍 Cleared word clear timeout due to speech error');
    }
    
    setError(error);
    setInteractiveState(prev => ({
      ...prev,
      isListening: false,
    }));
  };

  const handleSpeechStart = () => {
    console.log('🔍 Speech recognition started - resetting session');
    
    // Reset session tracking
    sessionStartTimeRef.current = Date.now();
    processedContentRef.current = '';
    
    // Clear any pending timeouts when starting new speech session
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      console.log('🔍 Cleared existing timeout on speech start');
    }
    
    if (clearWordTimeoutRef.current) {
      clearTimeout(clearWordTimeoutRef.current);
      clearWordTimeoutRef.current = null;
      console.log('🔍 Cleared word clear timeout on speech start');
    }
    
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
    
    // Clear any pending timeouts when speech session ends
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      console.log('🔍 Cleared timeout on speech end');
    }
    
    if (clearWordTimeoutRef.current) {
      clearTimeout(clearWordTimeoutRef.current);
      clearWordTimeoutRef.current = null;
      console.log('🔍 Cleared word clear timeout on speech end');
    }
    
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
        sessionStartTimeRef.current = Date.now();

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
      sessionStartTimeRef.current = 0;

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