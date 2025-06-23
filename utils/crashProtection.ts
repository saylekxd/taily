import { Platform } from 'react-native';

export const crashProtection = {
  /**
   * Wraps async functions to catch and handle native crashes
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    onError?: (error: Error) => void,
    fallbackValue?: T
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      console.error('Crash protection caught error:', error);
      
      if (onError) {
        onError(error as Error);
      }
      
      // On iOS, certain TextToSpeech errors can cause crashes
      // We handle them gracefully
      if (Platform.OS === 'ios' && error instanceof Error) {
        const errorMessage = error.message || error.toString();
        
        // Common iOS TTS errors that can cause crashes
        if (
          errorMessage.includes('TextToSpeech') ||
          errorMessage.includes('AVSpeechSynthesizer') ||
          errorMessage.includes('Speech') ||
          errorMessage.includes('voice')
        ) {
          console.warn('iOS TextToSpeech error handled gracefully:', errorMessage);
        }
      }
      
      return fallbackValue;
    }
  },

  /**
   * Wraps sync functions to catch and handle native crashes
   */
  wrap<T>(
    fn: () => T,
    onError?: (error: Error) => void,
    fallbackValue?: T
  ): T | undefined {
    try {
      return fn();
    } catch (error) {
      console.error('Crash protection caught error:', error);
      
      if (onError) {
        onError(error as Error);
      }
      
      return fallbackValue;
    }
  },

  /**
   * Delays execution to avoid race conditions
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Ensures cleanup happens even if errors occur
   */
  async ensureCleanup(
    mainFn: () => Promise<void>,
    cleanupFn: () => Promise<void>
  ): Promise<void> {
    try {
      await mainFn();
    } finally {
      try {
        await cleanupFn();
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }
}; 