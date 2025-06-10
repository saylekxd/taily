import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';

interface StoryContentProps {
  content: string;
  scrollViewRef: React.RefObject<ScrollView | null>;
  onScroll: (event: any) => void;
  onContentSizeChange: (contentWidth: number, contentHeight: number) => void;
  onLayout: (event: any) => void;
}

export default function StoryContent({
  content,
  scrollViewRef,
  onScroll,
  onContentSizeChange,
  onLayout,
}: StoryContentProps) {
  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.contentContainer}
      onScroll={onScroll}
      onContentSizeChange={onContentSizeChange}
      onLayout={onLayout}
      scrollEventThrottle={16}
    >
      <Text style={styles.storyContent}>{content}</Text>
      
      {/* End of story spacer */}
      <View style={styles.endSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  storyContent: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 18,
    color: colors.white,
    lineHeight: 28,
  },
  endSpacer: {
    height: 100,
  },
}); 