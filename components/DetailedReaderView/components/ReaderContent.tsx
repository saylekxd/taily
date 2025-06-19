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
      // Analyze the story content to find trigger words
      const analysis = storyAnalysisService.analyzeStoryContent(content);
      const segments = storyAnalysisService.highlightTriggerWords(content, analysis.triggerWords);
      
      return (
        <View>
          {segments.map((segment, index) => {
            if (segment.isHighlighted && segment.word) {
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => onWordSpoken?.(segment.word!)}
                  style={styles.highlightedWordContainer}
                >
                  <Text
                    style={[
                      styles.content,
                      styles.highlightedWord,
                      {
                        color: colorTheme.text,
                        fontSize: fontSizes[settings.fontSize],
                        lineHeight: lineHeights[settings.fontSize],
                      }
                    ]}
                  >
                    {segment.text}
                  </Text>
                </TouchableOpacity>
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
                  {segment.text}
                </Text>
              );
            }
          })}
        </View>
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
  highlightedWordContainer: {
    display: 'inline-block' as any, // For web compatibility
  },
  highlightedWord: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)', // Golden highlight
    borderRadius: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  activeWord: {
    backgroundColor: 'rgba(255, 69, 0, 0.5)', // Orange for currently spoken word
    borderRadius: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
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