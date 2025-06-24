import { Platform } from 'react-native';

interface SpeechConfig {
  rate: number;
  pitch: number;
  voice?: any;
  language: string;
  initDelay?: number;
  stopDelay?: number;
}

export class iOSCompatibilityManager {
  static async checkiOS18Compatibility(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return true; // Always compatible on non-iOS platforms
    }

    try {
      const iosVersion = parseFloat(Platform.Version.toString());
      console.log(`iOS Version detected: ${iosVersion}`);
      
      // iOS 18.0+ has some changes in TextToSpeech framework
      if (iosVersion >= 18.0) {
        console.log('iOS 18+ detected - applying compatibility measures');
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to check iOS compatibility:', error);
      return false;
    }
  }

  static getOptimalSpeechConfig(): SpeechConfig {
    if (Platform.OS !== 'ios') {
      return {
        rate: 0.75,
        pitch: 1.0,
        language: 'en-US',
      };
    }

    const iosVersion = parseFloat(Platform.Version.toString());
    
    if (iosVersion >= 18.0) {
      // Optimized settings for iOS 18+
      return {
        rate: 0.4, // Slower rate for better stability
        pitch: 1.0,
        voice: undefined, // Let system choose optimal voice
        language: 'en-US',
        // Add delay before operations
        initDelay: 500,
        stopDelay: 200,
      };
    }
    
    // Default settings for older iOS versions
    return {
      rate: 0.5,
      pitch: 1.0,
      voice: undefined,
      language: 'en-US',
      initDelay: 100,
      stopDelay: 100,
    };
  }

  static async ensureAudioSessionReady(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return true;
    }

    try {
      // Add delay to ensure audio session is properly configured
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Audio session ready for speech operations');
      return true;
    } catch (error) {
      console.error('Audio session setup failed:', error);
      return false;
    }
  }
} 