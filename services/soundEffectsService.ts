import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';

export interface SoundEffect {
  id: string;
  word: string;
  sound_effect_url: string;
  category: string;
}

export interface SoundEffectMapping {
  id: string;
  story_id?: string;
  personalized_story_id?: string;
  word: string;
  sound_effect_url: string;
  position_in_text: number;
}

class SoundEffectsService {
  private soundCache = new Map<string, Audio.Sound>();
  private isInitialized = false;
  private maxCacheSize = 20;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('Sound effects service initialized');
    } catch (error) {
      console.error('Failed to initialize sound effects service:', error);
    }
  }

  async preloadCommonSounds(): Promise<void> {
    try {
      const { data: commonSounds, error } = await supabase
        .from('sound_effect_triggers')
        .select('*')
        .limit(10);

      if (error) {
        console.error('Failed to fetch common sounds:', error);
        return;
      }

      // Preload the most common sound effects
      const preloadPromises = commonSounds?.slice(0, 5).map(async (sound) => {
        try {
          await this.loadSound(sound.sound_effect_url);
        } catch (error) {
          console.error(`Failed to preload sound ${sound.word}:`, error);
        }
      }) || [];

      await Promise.allSettled(preloadPromises);
      console.log('Common sounds preloaded');
    } catch (error) {
      console.error('Failed to preload common sounds:', error);
    }
  }

  private async loadSound(url: string): Promise<Audio.Sound> {
    if (this.soundCache.has(url)) {
      return this.soundCache.get(url)!;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false, volume: 0.7 }
      );

      // Manage cache size
      if (this.soundCache.size >= this.maxCacheSize) {
        const firstKey = this.soundCache.keys().next().value;
        const oldSound = this.soundCache.get(firstKey);
        if (oldSound) {
          await oldSound.unloadAsync();
          this.soundCache.delete(firstKey);
        }
      }

      this.soundCache.set(url, sound);
      return sound;
    } catch (error) {
      console.error(`Failed to load sound from ${url}:`, error);
      throw error;
    }
  }

  async playSound(url: string, volume: number = 0.7): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const sound = await this.loadSound(url);
      
      // Reset position and play
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(volume);
      await sound.playAsync();

      return true;
    } catch (error) {
      console.error(`Failed to play sound ${url}:`, error);
      return false;
    }
  }

  async playSoundForWord(word: string, volume: number = 0.7): Promise<boolean> {
    try {
      const { data: soundEffect, error } = await supabase
        .from('sound_effect_triggers')
        .select('*')
        .ilike('word', word)
        .limit(1)
        .single();

      if (error || !soundEffect) {
        console.log(`No sound effect found for word: ${word}`);
        return false;
      }

      return await this.playSound(soundEffect.sound_effect_url, volume);
    } catch (error) {
      console.error(`Failed to play sound for word ${word}:`, error);
      return false;
    }
  }

  async getSoundEffectsForStory(storyId: string, isPersonalized: boolean = false): Promise<SoundEffectMapping[]> {
    try {
      const column = isPersonalized ? 'personalized_story_id' : 'story_id';
      
      const { data: mappings, error } = await supabase
        .from('story_sound_mappings')
        .select('*')
        .eq(column, storyId)
        .order('position_in_text');

      if (error) {
        console.error('Failed to fetch story sound mappings:', error);
        return [];
      }

      return mappings || [];
    } catch (error) {
      console.error('Failed to get sound effects for story:', error);
      return [];
    }
  }

  async getAllSoundEffects(): Promise<SoundEffect[]> {
    try {
      const { data: effects, error } = await supabase
        .from('sound_effect_triggers')
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        console.error('Failed to fetch sound effects:', error);
        return [];
      }

      return effects || [];
    } catch (error) {
      console.error('Failed to get all sound effects:', error);
      return [];
    }
  }

  async getSoundEffectsByCategory(category: string): Promise<SoundEffect[]> {
    try {
      const { data: effects, error } = await supabase
        .from('sound_effect_triggers')
        .select('*')
        .eq('category', category)
        .order('word');

      if (error) {
        console.error('Failed to fetch sound effects by category:', error);
        return [];
      }

      return effects || [];
    } catch (error) {
      console.error('Failed to get sound effects by category:', error);
      return [];
    }
  }

  findTriggerWords(text: string): Array<{ word: string; position: number }> {
    const words = text.toLowerCase().split(/\s+/);
    const triggerWords: Array<{ word: string; position: number }> = [];
    
    // Common trigger words that might have sound effects
    const commonTriggers = [
      'roar', 'meow', 'woof', 'chirp', 'splash', 'thunder', 'wind', 
      'magic', 'sparkle', 'footsteps', 'knock', 'bell', 'whistle',
      'crash', 'boom', 'pop', 'sizzle', 'crackle', 'whoosh'
    ];

    let currentPosition = 0;
    words.forEach((word) => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (commonTriggers.includes(cleanWord)) {
        triggerWords.push({
          word: cleanWord,
          position: currentPosition,
        });
      }
      currentPosition += word.length + 1; // +1 for space
    });

    return triggerWords;
  }

  async stopAllSounds(): Promise<void> {
    try {
      const stopPromises = Array.from(this.soundCache.values()).map(async (sound) => {
        try {
          await sound.stopAsync();
        } catch (error) {
          // Ignore errors when stopping sounds
        }
      });

      await Promise.allSettled(stopPromises);
    } catch (error) {
      console.error('Failed to stop all sounds:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopAllSounds();

      const unloadPromises = Array.from(this.soundCache.values()).map(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (error) {
          // Ignore errors when unloading sounds
        }
      });

      await Promise.allSettled(unloadPromises);
      this.soundCache.clear();
      this.isInitialized = false;

      console.log('Sound effects service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup sound effects service:', error);
    }
  }

  setVolume(volume: number): void {
    // Set global volume for all cached sounds
    this.soundCache.forEach(async (sound) => {
      try {
        await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      } catch (error) {
        // Ignore errors when setting volume
      }
    });
  }
}

export const soundEffectsService = new SoundEffectsService();