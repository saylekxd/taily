import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ReaderContentProps } from '../types';
import { fontSizes, lineHeights } from '../constants';

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
  // Future Feature 3 props
  isInteractiveMode = false,
  highlightedWords = [],
  onWordSpoken,
}: ReaderContentProps) {
  
  // This function will be enhanced for Feature 3 to highlight specific words
  const renderContent = () => {
    if (isInteractiveMode && highlightedWords.length > 0) {
      // TODO: Implement word highlighting for Feature 3
      // This will split content into words and highlight trigger words
      return (
        <Text style={[styles.content, {
          color: colorTheme.text,
          fontSize: fontSizes[settings.fontSize],
          lineHeight: lineHeights[settings.fontSize],
        }]}>
          {content}
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
  // Future styles for Feature 3
  highlightedWord: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)', // Golden highlight
    borderRadius: 2,
    paddingHorizontal: 1,
  },
  activeWord: {
    backgroundColor: 'rgba(255, 69, 0, 0.5)', // Orange for currently spoken word
    borderRadius: 2,
    paddingHorizontal: 1,
  },
  endSpacer: {
    height: 60,
  },
}); 