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
        if (firstKey) {
          const oldSound = this.soundCache.get(firstKey);
          if (oldSound) {
            await oldSound.unloadAsync();
            this.soundCache.delete(firstKey);
          }
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
    console.log('🔊 SoundEffectsService.playSound called with URL:', url, 'volume:', volume);
    
    try {
      if (!this.isInitialized) {
        console.log('🔊 Service not initialized, initializing now...');
        await this.initialize();
      }

      console.log('🔊 Loading sound from URL:', url);
      const sound = await this.loadSound(url);
      
      console.log('🔊 Sound loaded, resetting position and playing...');
      // Reset position and play
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(volume);
      await sound.playAsync();

      console.log('🔊 Sound played successfully');
      return true;
    } catch (error) {
      console.error(`🔊 Failed to play sound ${url}:`, error);
      return false;
    }
  }

  async playSoundForWord(word: string, volume: number = 0.7): Promise<boolean> {
    console.log('🔊 SoundEffectsService.playSoundForWord called with word:', word, 'volume:', volume);
    
    try {
      console.log('🔊 Querying database for sound effect...');
      const { data: soundEffect, error } = await supabase
        .from('sound_effect_triggers')
        .select('*')
        .ilike('word', word)
        .limit(1)
        .single();

      console.log('🔊 Database query result:', { soundEffect, error });

      if (error || !soundEffect) {
        console.log(`🔊 No sound effect found for word: ${word}`);
        return false;
      }

      if (!soundEffect.sound_effect_url) {
        console.log(`🔊 Sound effect found but no URL for word: ${word}`);
        return false;
      }

      console.log('🔊 Found sound effect, calling playSound with URL:', soundEffect.sound_effect_url);
      return await this.playSound(soundEffect.sound_effect_url, volume);
    } catch (error) {
      console.error(`🔊 Failed to play sound for word ${word}:`, error);
      return false;
    }
  }

  async playSoundForWordInStory(
    word: string, 
    storyId?: string, 
    personalizedStoryId?: string, 
    volume: number = 0.7
  ): Promise<boolean> {
    console.log('🔊 SoundEffectsService.playSoundForWordInStory called with:', {
      word, storyId, personalizedStoryId, volume
    });
    
    try {
      let soundEffectUrl: string | null = null;
      
      // First, check for story-specific mappings if we have a story ID
      if (storyId || personalizedStoryId) {
        console.log('🔊 Checking story-specific mappings...');
        const storyMappings = await this.getSoundEffectsForStory(
          storyId || personalizedStoryId!, 
          !!personalizedStoryId
        );
        
        // Find matching word in story mappings
        const storyMapping = storyMappings.find(mapping => 
          mapping.word.toLowerCase() === word.toLowerCase()
        );
        
        if (storyMapping?.sound_effect_url) {
          soundEffectUrl = storyMapping.sound_effect_url;
          console.log('🔊 Found story-specific sound effect:', soundEffectUrl);
        }
      }
      
      // If no story-specific mapping found, fall back to general sound effects
      if (!soundEffectUrl) {
        console.log('🔊 No story-specific mapping found, checking general sound effects...');
        const { data: soundEffect, error } = await supabase
          .from('sound_effect_triggers')
          .select('*')
          .ilike('word', word)
          .limit(1)
          .single();

        if (!error && soundEffect?.sound_effect_url) {
          soundEffectUrl = soundEffect.sound_effect_url;
          console.log('🔊 Found general sound effect:', soundEffectUrl);
        }
      }

      // Play the sound if we found a URL
      if (soundEffectUrl) {
        console.log('🔊 Playing sound from URL:', soundEffectUrl);
        return await this.playSound(soundEffectUrl, volume);
      } else {
        console.log(`🔊 No sound effect found for word: ${word}`);
        return false;
      }
    } catch (error) {
      console.error(`🔊 Failed to play sound for word ${word} in story:`, error);
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

  async getSoundEffectForWord(word: string): Promise<SoundEffect | null> {
    try {
      const { data: soundEffect, error } = await supabase
        .from('sound_effect_triggers')
        .select('*')
        .ilike('word', word)
        .limit(1)
        .single();

      if (error || !soundEffect) {
        return null;
      }

      return soundEffect;
    } catch (error) {
      console.error(`Failed to get sound effect for word ${word}:`, error);
      return null;
    }
  }

  async preloadSound(url: string): Promise<boolean> {
    try {
      await this.loadSound(url);
      return true;
    } catch (error) {
      console.error(`Failed to preload sound from ${url}:`, error);
      return false;
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