import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { appReadinessManager } from '@/utils/appReadiness';

// Lazy import of Voice to prevent early iOS initialization
let Voice: any = null;

async function getVoiceModule() {
  if (!Voice && Platform.OS !== 'web') {
    try {
      const voiceModule = await import('@react-native-voice/voice');
      Voice = voiceModule.default;
    } catch (error) {
      console.error('Failed to load Voice module:', error);
      throw new Error('Voice module not available');
    }
  }
  return Voice;
}

export interface SpeechRecognitionResult {
  word: string;
  confidence: number;
  timestamp: number;
}

export interface SpeechRecognitionConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

class SpeechRecognitionService {
  private isListening = false;
  private isInitialized = false;
  private isDestroying = false;
  private onResultCallback?: (results: SpeechRecognitionResult[]) => void;
  private onErrorCallback?: (error: string) => void;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;

  constructor() {
    // Don't initialize immediately - defer until first use
    // This prevents crashes on app startup
  }

  private async ensureInitialized() {
    if (!this.isInitialized && !this.isDestroying) {
      await this.initializeVoice();
    }
  }

  private async initializeVoice() {
    if (Platform.OS === 'web') {
      // Web implementation using Web Speech API
      this.isInitialized = true;
      return;
    }

    try {
      // Only initialize if not already initialized
      if (!this.isInitialized && !this.isDestroying) {
        const VoiceModule = await getVoiceModule();
        if (VoiceModule) {
          VoiceModule.onSpeechStart = this.onSpeechStart;
          VoiceModule.onSpeechEnd = this.onSpeechEnd;
          VoiceModule.onSpeechError = this.onSpeechError;
          VoiceModule.onSpeechResults = this.onSpeechResults;
          VoiceModule.onSpeechPartialResults = this.onSpeechPartialResults;
          this.isInitialized = true;
        }
      }
    } catch (error) {
      console.error('Failed to initialize Voice library:', error);
      this.isInitialized = false;
    }
  }

  private onSpeechStart = () => {
    if (this.isDestroying) return;
    console.log('Speech recognition started');
    this.onStartCallback?.();
  };

  private onSpeechEnd = () => {
    if (this.isDestroying) return;
    console.log('Speech recognition ended');
    this.isListening = false;
    this.onEndCallback?.();
  };

  private onSpeechError = (error: any) => {
    if (this.isDestroying) return;
    console.error('Speech recognition error:', error);
    this.isListening = false;
    
    // Extract error message safely
    const errorMessage = error?.error?.message || error?.message || 'Speech recognition error';
    
    // Only report non-cancelled errors
    if (!errorMessage.includes('cancelled') && !errorMessage.includes('203')) {
      this.onErrorCallback?.(errorMessage);
    }
  };

  private onSpeechResults = (event: any) => {
    if (this.isDestroying) return;
    const results = event?.value || [];
    this.processResults(results, false);
  };

  private onSpeechPartialResults = (event: any) => {
    if (this.isDestroying) return;
    const results = event?.value || [];
    this.processResults(results, true);
  };

  private processResults(results: string[], isPartial: boolean) {
    if (!results || results.length === 0 || this.isDestroying) return;

    const processedResults: SpeechRecognitionResult[] = results.map((result, index) => ({
      word: result.toLowerCase().trim(),
      confidence: 1.0 - (index * 0.1), // Simulate confidence scores
      timestamp: Date.now(),
    }));

    this.onResultCallback?.(processedResults);
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Wait for app to be ready before initializing speech
      const isReady = await appReadinessManager.waitForReady(3000);
      if (!isReady) {
        console.warn('App not ready, speech functionality disabled');
        return false;
      }

      // Ensure initialized before checking permissions
      await this.ensureInitialized();

      if (Platform.OS === 'web') {
        // Check for Web Speech API support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          throw new Error('Speech recognition not supported in this browser');
        }
        return true;
      }

      // Request microphone permission for mobile
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      // Check if Voice is available with timeout
      try {
        const VoiceModule = await getVoiceModule();
        
        const checkAvailability = new Promise<boolean>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Voice availability check timeout'));
          }, 3000);

          VoiceModule.isAvailable()
            .then((available: any) => {
              clearTimeout(timeout);
              resolve(Boolean(available));
            })
            .catch((error: any) => {
              clearTimeout(timeout);
              reject(error);
            });
        });

        const available = await checkAvailability;
        if (!available) {
          throw new Error('Speech recognition not available on this device');
        }
      } catch (error) {
        console.error('Voice.isAvailable() failed:', error);
        throw new Error('Speech recognition service unavailable');
      }

      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Permission denied');
      return false;
    }
  }

  async startListening(config: Partial<SpeechRecognitionConfig> = {}): Promise<boolean> {
    try {
      // Check app readiness first
      if (!appReadinessManager.isAppReady()) {
        console.log('App not ready, deferring speech recognition');
        return false;
      }

      // Ensure initialized before starting
      await this.ensureInitialized();

      if (this.isDestroying) {
        console.log('Service is being destroyed, cannot start listening');
        return false;
      }

      if (this.isListening) {
        console.log('Already listening');
        return true;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      if (Platform.OS === 'web') {
        return this.startWebSpeechRecognition(config);
      }

      const defaultConfig = {
        language: 'en-US',
        continuous: true,
        interimResults: true,
        maxAlternatives: 3,
        ...config,
      };

      const VoiceModule = await getVoiceModule();

      // Ensure previous session is stopped
      try {
        await VoiceModule.stop();
      } catch (stopError) {
        // Ignore stop errors, just continue
        console.log('Cleared previous session');
      }

      // Small delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 100));

      await VoiceModule.start(defaultConfig.language);

      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start listening:', error);
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Failed to start listening');
      return false;
    }
  }

  private startWebSpeechRecognition(config: Partial<SpeechRecognitionConfig>): boolean {
    try {
      // @ts-ignore - Web Speech API types
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = config.continuous ?? true;
      recognition.interimResults = config.interimResults ?? true;
      recognition.lang = config.language ?? 'en-US';
      recognition.maxAlternatives = config.maxAlternatives ?? 3;

      recognition.onstart = () => {
        this.isListening = true;
        this.onStartCallback?.();
      };

      recognition.onend = () => {
        this.isListening = false;
        this.onEndCallback?.();
      };

      recognition.onerror = (event: any) => {
        this.isListening = false;
        this.onErrorCallback?.(event.error || 'Speech recognition error');
      };

      recognition.onresult = (event: any) => {
        const results: SpeechRecognitionResult[] = [];
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.length > 0) {
            results.push({
              word: result[0].transcript.toLowerCase().trim(),
              confidence: result[0].confidence || 0.5,
              timestamp: Date.now(),
            });
          }
        }

        this.onResultCallback?.(results);
      };

      recognition.start();
      return true;
    } catch (error) {
      console.error('Web speech recognition error:', error);
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Web speech recognition failed');
      return false;
    }
  }

  async stopListening(): Promise<void> {
    try {
      if (!this.isListening || this.isDestroying) {
        return;
      }

      this.isListening = false;

      if (Platform.OS === 'web') {
        // Web implementation would stop the recognition here
        this.onEndCallback?.();
        return;
      }

      try {
        const VoiceModule = await getVoiceModule();
        await VoiceModule.stop();
      } catch (error) {
        console.error('Failed to stop listening:', error);
        // Continue even if stop fails
      }
    } catch (error) {
      console.error('Failed to stop listening:', error);
    } finally {
      this.isListening = false;
    }
  }

  setCallbacks(callbacks: {
    onResult?: (results: SpeechRecognitionResult[]) => void;
    onError?: (error: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
  }) {
    // Ensure initialized when setting callbacks
    this.ensureInitialized();
    
    this.onResultCallback = callbacks.onResult;
    this.onErrorCallback = callbacks.onError;
    this.onStartCallback = callbacks.onStart;
    this.onEndCallback = callbacks.onEnd;
  }

  getIsListening(): boolean {
    return this.isListening && !this.isDestroying;
  }

  async destroy(): Promise<void> {
    try {
      this.isDestroying = true;

      if (this.isListening) {
        await this.stopListening();
      }

      if (Platform.OS !== 'web' && this.isInitialized && Voice) {
        try {
          await Voice.destroy();
        } catch (error) {
          console.error('Voice.destroy() failed:', error);
          // Continue with cleanup even if Voice.destroy() fails
        }
      }

      // Clear callbacks
      this.onResultCallback = undefined;
      this.onErrorCallback = undefined;
      this.onStartCallback = undefined;
      this.onEndCallback = undefined;

      this.isInitialized = false;
    } catch (error) {
      console.error('Failed to destroy speech recognition:', error);
    } finally {
      this.isDestroying = false;
    }
  }
}

// Create a lazy singleton that only initializes when first accessed
let _instance: SpeechRecognitionService | null = null;

export const speechRecognitionService = {
  get instance(): SpeechRecognitionService {
    if (!_instance) {
      _instance = new SpeechRecognitionService();
    }
    return _instance;
  },

  // Proxy all methods to the instance
  async requestPermissions(): Promise<boolean> {
    return this.instance.requestPermissions();
  },

  async startListening(config?: Partial<SpeechRecognitionConfig>): Promise<boolean> {
    return this.instance.startListening(config);
  },

  async stopListening(): Promise<void> {
    return this.instance.stopListening();
  },

  setCallbacks(callbacks: {
    onResult?: (results: SpeechRecognitionResult[]) => void;
    onError?: (error: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
  }) {
    return this.instance.setCallbacks(callbacks);
  },

  getIsListening(): boolean {
    return this.instance.getIsListening();
  },

  async destroy(): Promise<void> {
    const result = await this.instance.destroy();
    _instance = null; // Clear the instance after destruction
    return result;
  }
};