import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ReaderContentProps } from '../types';
import { fontSizes, lineHeights } from '../constants';
import { storyAnalysisService } from '@/services/storyAnalysisService';
import { soundEffectsService } from '@/services/soundEffectsService';
import { colors } from '@/constants/colors';

export default function ReaderContent({
  content,
  settings,
  colorTheme,
  progress,
  onProgressChange,
  scrollState,
  onScrollStateChange,
  isFullscreen,
  scrollViewRef,
  // Feature 3 props
  isInteractiveMode = false,
  highlightedWords = [],
  onWordSpoken,
  // Story identification props
  storyId,
  personalizedStoryId,
}: ReaderContentProps) {
  
  const [triggerWords, setTriggerWords] = useState<string[]>([]);
  const [isLoadingTriggerWords, setIsLoadingTriggerWords] = useState(false);

  // Load trigger words when component mounts or story changes
  useEffect(() => {
    if (isInteractiveMode) {
      loadTriggerWords();
    }
  }, [isInteractiveMode, storyId, personalizedStoryId]);

  const loadTriggerWords = async () => {
    setIsLoadingTriggerWords(true);
    try {
      console.log('🔊 Loading trigger words for story:', { storyId, personalizedStoryId });
      
      const words = new Set<string>();
      
      // First, get general trigger words from sound_effect_triggers table
      const generalEffects = await soundEffectsService.getAllSoundEffects();
      generalEffects.forEach(effect => {
        words.add(effect.word.toLowerCase());
      });
      
      console.log('🔊 Loaded general trigger words:', generalEffects.length, 'words');
      
      // Then, get story-specific mappings if we have a story ID
      if (storyId || personalizedStoryId) {
        const storyMappings = await soundEffectsService.getSoundEffectsForStory(
          storyId || personalizedStoryId!,
          !!personalizedStoryId
        );
        
        storyMappings.forEach(mapping => {
          words.add(mapping.word.toLowerCase());
        });
        
        console.log('🔊 Loaded story-specific mappings:', storyMappings.length, 'mappings');
      }
      
      const finalTriggerWords = Array.from(words);
      setTriggerWords(finalTriggerWords);
      
      console.log('🔊 Final trigger words loaded:', finalTriggerWords.length, 'total words:', finalTriggerWords);
    } catch (error) {
      console.error('🔊 Error loading trigger words:', error);
      // Fallback to hardcoded words if database fails
      const fallbackWords = [
        'roar', 'roared', 'roaring',
        'meow', 'meowed', 'meowing', 
        'woof', 'woofed', 'bark', 'barked', 'barking',
        'chirp', 'chirped', 'chirping', 'tweet', 'tweeted',
        'splash', 'splashed', 'splashing',
        'thunder', 'thundered', 'thundering',
        'wind', 'windy', 'whoosh', 'whooshed',
        'magic', 'magical', 'sparkle', 'sparkled', 'sparkling'
      ];
      setTriggerWords(fallbackWords);
      console.log('🔊 Using fallback trigger words:', fallbackWords.length, 'words');
    } finally {
      setIsLoadingTriggerWords(false);
    }
  };
  
  // Enhanced content rendering with word highlighting for Feature 3
  const renderContent = () => {
    if (isInteractiveMode && content && triggerWords.length > 0) {
      // Create a regex to find and highlight trigger words
      const pattern = new RegExp(`\\b(${triggerWords.join('|')})\\b`, 'gi');
      const parts = content.split(pattern);
      
      return (
        <Text style={[styles.content, {
          color: colorTheme.text,
          fontSize: fontSizes[settings.fontSize],
          lineHeight: lineHeights[settings.fontSize],
        }]}>
          {parts.map((part, index) => {
            const isHighlighted = triggerWords.some(word => 
              word.toLowerCase() === part.toLowerCase()
            );
            
            if (isHighlighted) {
              return (
                <Text
                  key={index}
                  style={[
                    styles.content,
                    styles.highlightedWord,
                    {
                      color: colorTheme.text,
                      fontSize: fontSizes[settings.fontSize],
                      lineHeight: lineHeights[settings.fontSize],
                    }
                  ]}
                  onPress={() => onWordSpoken?.(part.toLowerCase())}
                >
                  {part}
                </Text>
              );
            } else {
              return (
                <Text
                  key={index}
                  style={[
                    styles.content,
                    {
                      color: colorTheme.text,
                      fontSize: fontSizes[settings.fontSize],
                      lineHeight: lineHeights[settings.fontSize],
                    }
                  ]}
                >
                  {part}
                </Text>
              );
            }
          })}
        </Text>
      );
    }

    // Default rendering without highlighting
    return (
      <Text style={[styles.content, {
        color: colorTheme.text,
        fontSize: fontSizes[settings.fontSize],
        lineHeight: lineHeights[settings.fontSize],
      }]}>
        {content}
      </Text>
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.contentScrollView}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: isFullscreen ? 60 : 20 }
      ]}
      onScroll={(event) => {
        if (!scrollState.isUserScrolling || scrollState.contentHeight <= scrollState.scrollViewHeight) return;
        
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const maxScrollY = contentSize.height - layoutMeasurement.height;
        
        if (maxScrollY > 0) {
          const newProgress = Math.max(0, Math.min(1, contentOffset.y / maxScrollY));
          onProgressChange?.(newProgress);
        }
      }}
      onScrollBeginDrag={() => {
        onScrollStateChange({ isUserScrolling: true });
      }}
      onScrollEndDrag={() => {
        // Will be handled by parent timeout logic
      }}
      onMomentumScrollEnd={() => {
        // Will be handled by parent timeout logic
      }}
      onLayout={(event) => {
        onScrollStateChange({ 
          scrollViewHeight: event.nativeEvent.layout.height 
        });
      }}
      onContentSizeChange={(contentWidth, newContentHeight) => {
        onScrollStateChange({ 
          contentHeight: newContentHeight 
        });
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={true}
    >
      {renderContent()}
      
      {/* Interactive mode indicator */}
      {isInteractiveMode && (
        <View style={[styles.interactiveModeIndicator, { backgroundColor: colorTheme.card }]}>
          <Text style={[styles.interactiveModeText, { color: colorTheme.text }]}>
            {isLoadingTriggerWords 
              ? '🔄 Loading sound effects...'
              : triggerWords.length > 0 
                ? `🎤 Interactive reading mode active - ${triggerWords.length} sound effects available!`
                : '🎤 Interactive reading mode active - no sound effects available.'
            }
          </Text>
        </View>
      )}
      
      {/* Spacer to allow full scroll */}
      <View style={styles.endSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  content: {
    fontFamily: 'Quicksand-Medium',
    textAlign: 'left',
  },
  highlightedWord: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)', // Golden highlight
    borderRadius: 2,
    paddingHorizontal: 2,
    // Removed paddingVertical to maintain text baseline alignment
  },
  activeWord: {
    backgroundColor: 'rgba(255, 69, 0, 0.5)', // Orange for currently spoken word
    borderRadius: 2,
    paddingHorizontal: 2,
    // Removed paddingVertical to maintain text baseline alignment
  },
  interactiveModeIndicator: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  interactiveModeText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  endSpacer: {
    height: 60,
  },
});