import { Platform } from 'react-native';
import Voice from '@react-native-voice/voice';
import { Audio } from 'expo-av';

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
  private onResultCallback?: (results: SpeechRecognitionResult[]) => void;
  private onErrorCallback?: (error: string) => void;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;

  constructor() {
    this.initializeVoice();
  }

  private initializeVoice() {
    if (Platform.OS === 'web') {
      // Web implementation using Web Speech API
      return;
    }

    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechError = this.onSpeechError;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechPartialResults = this.onSpeechPartialResults;
  }

  private onSpeechStart = () => {
    console.log('Speech recognition started');
    this.onStartCallback?.();
  };

  private onSpeechEnd = () => {
    console.log('Speech recognition ended');
    this.isListening = false;
    this.onEndCallback?.();
  };

  private onSpeechError = (error: any) => {
    console.error('Speech recognition error:', error);
    this.isListening = false;
    this.onErrorCallback?.(error.error?.message || 'Speech recognition error');
  };

  private onSpeechResults = (event: any) => {
    const results = event.value || [];
    this.processResults(results, false);
  };

  private onSpeechPartialResults = (event: any) => {
    const results = event.value || [];
    this.processResults(results, true);
  };

  private processResults(results: string[], isPartial: boolean) {
    if (!results || results.length === 0) return;

    const processedResults: SpeechRecognitionResult[] = results.map((result, index) => ({
      word: result.toLowerCase().trim(),
      confidence: 1.0 - (index * 0.1), // Simulate confidence scores
      timestamp: Date.now(),
    }));

    this.onResultCallback?.(processedResults);
  }

  async requestPermissions(): Promise<boolean> {
    try {
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

      // Check if Voice is available
      const available = await Voice.isAvailable();
      if (!available) {
        throw new Error('Speech recognition not available on this device');
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

      await Voice.start(defaultConfig.language, {
        RECOGNIZER_ENGINE: 'GOOGLE',
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_CALLING_PACKAGE: 'com.example.app',
        EXTRA_PARTIAL_RESULTS: defaultConfig.interimResults,
        REQUEST_PERMISSIONS_AUTO: true,
      });

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
      if (!this.isListening) {
        return;
      }

      if (Platform.OS === 'web') {
        // Web implementation would stop the recognition here
        this.isListening = false;
        this.onEndCallback?.();
        return;
      }

      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Failed to stop listening:', error);
      this.isListening = false;
    }
  }

  setCallbacks(callbacks: {
    onResult?: (results: SpeechRecognitionResult[]) => void;
    onError?: (error: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
  }) {
    this.onResultCallback = callbacks.onResult;
    this.onErrorCallback = callbacks.onError;
    this.onStartCallback = callbacks.onStart;
    this.onEndCallback = callbacks.onEnd;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  async destroy(): Promise<void> {
    try {
      if (this.isListening) {
        await this.stopListening();
      }

      if (Platform.OS !== 'web') {
        await Voice.destroy();
      }

      // Clear callbacks
      this.onResultCallback = undefined;
      this.onErrorCallback = undefined;
      this.onStartCallback = undefined;
      this.onEndCallback = undefined;
    } catch (error) {
      console.error('Failed to destroy speech recognition:', error);
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();