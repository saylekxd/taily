import { soundEffectsService } from './soundEffectsService';
import { supabase } from '@/lib/supabase';

export interface WordPosition {
  word: string;
  startIndex: number;
  endIndex: number;
  hasSoundEffect: boolean;
}

export interface StoryAnalysis {
  triggerWords: WordPosition[];
  totalWords: number;
  estimatedReadingTime: number;
}

class StoryAnalysisService {
  private cachedTriggerWords: string[] = [];
  private lastCacheTime = 0;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  private async getTriggerWordsFromDatabase(): Promise<string[]> {
    try {
      // Check if we have cached data that's still valid
      const now = Date.now();
      if (this.cachedTriggerWords.length > 0 && (now - this.lastCacheTime) < this.cacheExpiry) {
        console.log('Using cached trigger words:', this.cachedTriggerWords);
        return this.cachedTriggerWords;
      }

      console.log('Fetching trigger words from database...');
      
      const { data: triggerWords, error } = await supabase
        .from('sound_effect_triggers')
        .select('word')
        .order('word');

      console.log('Database query result:', { 
        data: triggerWords, 
        error: error,
        dataLength: triggerWords?.length || 0 
      });

      if (error) {
        console.error('Failed to fetch trigger words from database:', error);
        console.log('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // Fallback to hardcoded words if database fails
        const fallbackWords = this.getHardcodedTriggerWords();
        console.log('Using fallback hardcoded words:', fallbackWords);
        return fallbackWords;
      }

      if (!triggerWords || triggerWords.length === 0) {
        console.warn('Database query returned no trigger words. Checking if table exists...');
        
        // Try to check if the table exists by querying its structure
        const { data: tableCheck, error: tableError } = await supabase
          .from('sound_effect_triggers')
          .select('count')
          .limit(1);
          
        console.log('Table existence check:', { tableCheck, tableError });
        
        const fallbackWords = this.getHardcodedTriggerWords();
        console.log('No trigger words found in database, using fallback:', fallbackWords);
        return fallbackWords;
      }

      this.cachedTriggerWords = triggerWords.map(item => item.word.toLowerCase());
      this.lastCacheTime = now;
      
      console.log('Successfully loaded trigger words from database:', this.cachedTriggerWords);
      return this.cachedTriggerWords;
    } catch (error) {
      console.error('Unexpected error fetching trigger words:', error);
      console.log('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      const fallbackWords = this.getHardcodedTriggerWords();
      console.log('Using fallback words due to error:', fallbackWords);
      return fallbackWords;
    }
  }

  private getHardcodedTriggerWords(): string[] {
    // Fallback list in case database is unavailable
    return [
      'roar', 'roared', 'roaring',
      'meow', 'meowed', 'meowing',
      'woof', 'woofed', 'barked', 'barking',
      'chirp', 'chirped', 'chirping', 'tweet', 'tweeted',
      'splash', 'splashed', 'splashing',
      'thunder', 'thundered', 'thundering',
      'wind', 'windy', 'whoosh', 'whooshed',
      'magic', 'magical', 'sparkle', 'sparkled', 'sparkling',
      'footsteps', 'steps', 'walked', 'running', 'ran',
      'knock', 'knocked', 'knocking',
      'bell', 'rang', 'ringing',
      'whistle', 'whistled', 'whistling',
      'crash', 'crashed', 'crashing',
      'boom', 'boomed', 'booming',
      'pop', 'popped', 'popping',
      'sizzle', 'sizzled', 'sizzling',
      'crackle', 'crackled', 'crackling',
      'giggle', 'giggled', 'giggling', 'laugh', 'laughed', 'laughing',
      'cry', 'cried', 'crying', 'sob', 'sobbed',
      'gasp', 'gasped', 'gasping',
      'sigh', 'sighed', 'sighing',
      'snore', 'snored', 'snoring',
      'yawn', 'yawned', 'yawning'
    ];
  }
  
  async analyzeStoryContent(content: string): Promise<StoryAnalysis> {
    const words = this.extractWords(content);
    const triggerWords = await this.findTriggerWordsWithPositions(content);
    
    return {
      triggerWords,
      totalWords: words.length,
      estimatedReadingTime: Math.ceil(words.length / 150), // 150 words per minute
    };
  }

  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private async findTriggerWordsWithPositions(text: string): Promise<WordPosition[]> {
    const triggerWords: WordPosition[] = [];
    const databaseTriggerWords = await this.getTriggerWordsFromDatabase();
    
    if (databaseTriggerWords.length === 0) {
      console.warn('No trigger words found in database or cache');
      return triggerWords;
    }

    // Create a regex pattern to find trigger words with proper word boundaries
    const escapedWords = databaseTriggerWords.map(word => 
      word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const pattern = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const word = match[0].toLowerCase().trim();
      const startIndex = match.index;
      const endIndex = startIndex + word.length;

      // Ensure the word is actually in our trigger list (exact match)
      if (databaseTriggerWords.includes(word)) {
        triggerWords.push({
          word,
          startIndex,
          endIndex,
          hasSoundEffect: true,
        });
      }
    }

    console.log(`Found ${triggerWords.length} trigger words in story:`, triggerWords.map(tw => tw.word));
    return triggerWords;
  }

  highlightTriggerWords(content: string, triggerWords: WordPosition[]): Array<{
    text: string;
    isHighlighted: boolean;
    word?: string;
  }> {
    if (triggerWords.length === 0) {
      return [{ text: content, isHighlighted: false }];
    }

    const segments: Array<{ text: string; isHighlighted: boolean; word?: string }> = [];
    let lastIndex = 0;

    // Sort trigger words by position
    const sortedTriggers = [...triggerWords].sort((a, b) => a.startIndex - b.startIndex);

    sortedTriggers.forEach((trigger) => {
      // Add text before the trigger word
      if (trigger.startIndex > lastIndex) {
        segments.push({
          text: content.substring(lastIndex, trigger.startIndex),
          isHighlighted: false,
        });
      }

      // Add the highlighted trigger word
      segments.push({
        text: content.substring(trigger.startIndex, trigger.endIndex),
        isHighlighted: true,
        word: trigger.word,
      });

      lastIndex = trigger.endIndex;
    });

    // Add remaining text after the last trigger word
    if (lastIndex < content.length) {
      segments.push({
        text: content.substring(lastIndex),
        isHighlighted: false,
      });
    }

    return segments;
  }

  async generateSoundMappingsForStory(
    storyId: string, 
    content: string, 
    isPersonalized: boolean = false
  ): Promise<void> {
    try {
      const analysis = await this.analyzeStoryContent(content);
      
      // This would typically save the mappings to the database
      // For now, we'll just log the analysis
      console.log(`Story analysis for ${storyId}:`, {
        triggerWordsCount: analysis.triggerWords.length,
        totalWords: analysis.totalWords,
        estimatedReadingTime: analysis.estimatedReadingTime,
        triggerWords: analysis.triggerWords.map(tw => tw.word),
      });

      // In a real implementation, you would save these mappings to the database
      // using the story_sound_mappings table
    } catch (error) {
      console.error('Failed to generate sound mappings for story:', error);
    }
  }

  getWordVariations(baseWord: string): string[] {
    const variations: Record<string, string[]> = {
      'roar': ['roar', 'roared', 'roaring', 'roars'],
      'meow': ['meow', 'meowed', 'meowing', 'meows'],
      'bark': ['bark', 'barked', 'barking', 'barks', 'woof', 'woofed'],
      'chirp': ['chirp', 'chirped', 'chirping', 'chirps', 'tweet', 'tweeted'],
      'splash': ['splash', 'splashed', 'splashing', 'splashes'],
      'thunder': ['thunder', 'thundered', 'thundering', 'thunders'],
      'magic': ['magic', 'magical', 'magically'],
      'sparkle': ['sparkle', 'sparkled', 'sparkling', 'sparkles'],
      'laugh': ['laugh', 'laughed', 'laughing', 'laughs', 'giggle', 'giggled'],
      'cry': ['cry', 'cried', 'crying', 'cries', 'sob', 'sobbed'],
    };

    return variations[baseWord] || [baseWord];
  }

  calculateReadingProgress(
    currentPosition: number, 
    totalLength: number, 
    triggerWords: WordPosition[]
  ): {
    progress: number;
    nextTriggerWord?: WordPosition;
    recentTriggerWords: WordPosition[];
  } {
    const progress = Math.min(currentPosition / totalLength, 1);
    
    // Find the next trigger word after current position
    const nextTriggerWord = triggerWords.find(tw => tw.startIndex > currentPosition);
    
    // Find recently passed trigger words (within last 100 characters)
    const recentTriggerWords = triggerWords.filter(tw => 
      tw.endIndex <= currentPosition && 
      tw.endIndex > currentPosition - 100
    );

    return {
      progress,
      nextTriggerWord,
      recentTriggerWords,
    };
  }
}

export const storyAnalysisService = new StoryAnalysisService();