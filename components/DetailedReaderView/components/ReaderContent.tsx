import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ReaderContentProps } from '../types';
import { fontSizes, lineHeights } from '../constants';
import { storyAnalysisService } from '@/services/storyAnalysisService';
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
}: ReaderContentProps) {
  
  // Enhanced content rendering with word highlighting for Feature 3
  const renderContent = () => {
    if (isInteractiveMode && content) {
      // Use a simple approach for now - we'll enhance this when the story analysis is ready
      // Since analyzeStoryContent is now async, we can't call it directly in render
      // The trigger words are already available from the parent component
      
      // For now, let's use a simpler highlighting approach based on common trigger words
      const commonTriggerWords = [
        'roar', 'roared', 'roaring',
        'meow', 'meowed', 'meowing', 
        'woof', 'woofed', 'bark', 'barked', 'barking',
        'chirp', 'chirped', 'chirping', 'tweet', 'tweeted',
        'splash', 'splashed', 'splashing',
        'thunder', 'thundered', 'thundering',
        'wind', 'windy', 'whoosh', 'whooshed',
        'magic', 'magical', 'sparkle', 'sparkled', 'sparkling'
      ];

      // Create a regex to find and highlight trigger words
      const pattern = new RegExp(`\\b(${commonTriggerWords.join('|')})\\b`, 'gi');
      const parts = content.split(pattern);
      
      return (
        <Text style={[styles.content, {
          color: colorTheme.text,
          fontSize: fontSizes[settings.fontSize],
          lineHeight: lineHeights[settings.fontSize],
        }]}>
          {parts.map((part, index) => {
            const isHighlighted = commonTriggerWords.some(word => 
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
            🎤 Interactive reading mode active - speak highlighted words for sound effects!
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