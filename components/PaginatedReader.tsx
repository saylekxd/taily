import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  Modal,
  StatusBar,
  Platform
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  useAnimatedGestureHandler
} from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/hooks/useI18n';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PaginatedReaderProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onProgressUpdate?: (progress: number) => void;
}

interface Page {
  type: 'title' | 'content';
  content: string;
  pageNumber: number;
}

// Reduced words per page for better readability
const WORDS_PER_PAGE = 80;

export default function PaginatedReader({
  visible,
  onClose,
  title,
  content,
  onProgressUpdate
}: PaginatedReaderProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const translateX = useSharedValue(0);

  // Split content into pages with better formatting
  useEffect(() => {
    if (!content) return;

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const contentPages: Page[] = [];
    
    // Add title page
    contentPages.push({
      type: 'title',
      content: title,
      pageNumber: 1
    });

    // Group sentences into pages
    let currentPageContent = '';
    let wordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(' ').length;
      
      if (wordCount + sentenceWords > WORDS_PER_PAGE && currentPageContent.length > 0) {
        // Create a new page
        contentPages.push({
          type: 'content',
          content: currentPageContent.trim(),
          pageNumber: contentPages.length + 1
        });
        currentPageContent = sentence.trim() + '.';
        wordCount = sentenceWords;
      } else {
        currentPageContent += (currentPageContent ? ' ' : '') + sentence.trim() + '.';
        wordCount += sentenceWords;
      }
    }

    // Add the last page if there's remaining content
    if (currentPageContent.trim().length > 0) {
      contentPages.push({
        type: 'content',
        content: currentPageContent.trim(),
        pageNumber: contentPages.length + 1
      });
    }

    setPages(contentPages);
  }, [content, title]);

  // Update progress when page changes
  useEffect(() => {
    if (pages.length > 0 && onProgressUpdate) {
      const progress = currentPageIndex / (pages.length - 1);
      onProgressUpdate(Math.min(progress, 1));
    }
  }, [currentPageIndex, pages.length, onProgressUpdate]);

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      translateX.value = 0;
    },
    onActive: (event) => {
      translateX.value = event.translationX;
    },
    onEnd: (event) => {
      const threshold = screenWidth * 0.3;
      
      if (event.translationX > threshold) {
        // Swipe right - go to previous page
        runOnJS(goToPreviousPage)();
      } else if (event.translationX < -threshold) {
        // Swipe left - go to next page
        runOnJS(goToNextPage)();
      }
      
      translateX.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const formatContentWithParagraphs = (text: string) => {
    // Split into paragraphs and format with proper spacing
    const paragraphs = text.split(/\n\n|\. [A-Z]/).filter(p => p.trim().length > 0);
    
    return paragraphs.map((paragraph, index) => {
      // Add period back if it was removed during split
      const formattedParagraph = paragraph.trim();
      const needsPeriod = !formattedParagraph.endsWith('.') && !formattedParagraph.endsWith('!') && !formattedParagraph.endsWith('?');
      
      return (
        <Text key={index} style={styles.paragraph}>
          {index > 0 && formattedParagraph.match(/^[A-Z]/) ? formattedParagraph : formattedParagraph}
          {needsPeriod ? '.' : ''}
        </Text>
      );
    });
  };

  const renderPage = (page: Page) => {
    if (page.type === 'title') {
      return (
        <View style={styles.titlePage}>
          <View style={styles.decorativeLine} />
          <Text style={styles.titleText}>{page.content}</Text>
          <View style={styles.decorativeLine} />
          <Text style={styles.swipeHint}>{t('reader.swipeToStart')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentPage}>
        <View style={styles.contentContainer}>
          {formatContentWithParagraphs(page.content)}
        </View>
      </View>
    );
  };

  if (!visible || pages.length === 0) {
    return null;
  }

  const currentPage = pages[currentPageIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 0 : insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          
          <Text style={styles.pageCounter}>
            {currentPageIndex + 1} / {pages.length}
          </Text>
          
          <TouchableOpacity style={styles.recordButton}>
            <Text style={styles.recordButtonText}>NAGRYWAJ</Text>
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            <View style={styles.micIcon}>
              <View style={styles.micDot} />
            </View>
            <Text style={styles.fontSizeButton}>A A</Text>
          </View>
        </View>

        {/* Content */}
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.pageContainer, animatedStyle]}>
            {renderPage(currentPage)}
          </Animated.View>
        </PanGestureHandler>

        {/* Navigation Arrows */}
        {currentPageIndex > 0 && (
          <TouchableOpacity 
            style={[styles.navButton, styles.leftNavButton]}
            onPress={goToPreviousPage}
          >
            <ChevronLeft size={32} color={colors.white} />
          </TouchableOpacity>
        )}

        {currentPageIndex < pages.length - 1 && (
          <TouchableOpacity 
            style={[styles.navButton, styles.rightNavButton]}
            onPress={goToNextPage}
          >
            <ChevronRight size={32} color={colors.white} />
          </TouchableOpacity>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentPageIndex + 1) / pages.length) * 100}%` }
              ]} 
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  closeButton: {
    padding: 8,
  },
  pageCounter: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.white,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  micDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  fontSizeButton: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  titlePage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  decorativeLine: {
    width: 200,
    height: 2,
    backgroundColor: colors.primary,
    marginVertical: 20,
  },
  titleText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 48,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 56,
  },
  swipeHint: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
  },
  contentPage: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingBottom: 80,
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  paragraph: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 24,
    color: colors.white,
    lineHeight: 38,
    textAlign: 'left',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftNavButton: {
    left: 16,
  },
  rightNavButton: {
    right: 16,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});