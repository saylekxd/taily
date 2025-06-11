import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
  PanGestureHandler,
  State,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '@/constants/colors';
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
  text: string;
  pageNumber: number;
}

export default function PaginatedReader({
  visible,
  onClose,
  title,
  content,
  onProgressUpdate,
}: PaginatedReaderProps) {
  const { t } = useI18n();
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const translateX = useSharedValue(0);

  // Split content into pages
  useEffect(() => {
    if (!content || !title) return;

    const wordsPerPage = 150; // Adjust based on screen size and font
    const words = content.split(' ');
    const contentPages: Page[] = [];

    // Add title page
    contentPages.push({
      type: 'title',
      text: title,
      pageNumber: 1,
    });

    // Split content into chunks
    for (let i = 0; i < words.length; i += wordsPerPage) {
      const pageWords = words.slice(i, i + wordsPerPage);
      const pageText = pageWords.join(' ');
      
      contentPages.push({
        type: 'content',
        text: pageText,
        pageNumber: contentPages.length + 1,
      });
    }

    setPages(contentPages);
    setCurrentPageIndex(0);
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

  // Gesture handler for swipe navigation
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
    },
    onEnd: (event) => {
      const shouldGoNext = event.translationX < -screenWidth * 0.3 && event.velocityX < -500;
      const shouldGoPrevious = event.translationX > screenWidth * 0.3 && event.velocityX > 500;

      if (shouldGoNext) {
        runOnJS(goToNextPage)();
      } else if (shouldGoPrevious) {
        runOnJS(goToPreviousPage)();
      }

      translateX.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const renderPage = (page: Page) => {
    if (page.type === 'title') {
      return (
        <View style={styles.titlePage}>
          <View style={styles.titleDecorationTop} />
          <Text style={styles.titleText}>{page.text}</Text>
          <View style={styles.titleDecorationBottom} />
          <Text style={styles.swipeHint}>
            {t('reader.swipeToStart')}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.contentPage}>
        <Text style={styles.contentText}>{page.text}</Text>
      </View>
    );
  };

  if (!visible || pages.length === 0) return null;

  const currentPage = pages[currentPageIndex];
  const totalPages = pages.length;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.background}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.white} />
            </TouchableOpacity>
            
            <View style={styles.pageIndicator}>
              <Text style={styles.pageText}>
                {currentPageIndex + 1} / {totalPages}
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.pageContainer, animatedStyle]}>
              {renderPage(currentPage)}
            </Animated.View>
          </PanGestureHandler>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentPageIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={goToPreviousPage}
              disabled={currentPageIndex === 0}
            >
              <ChevronLeft 
                size={24} 
                color={currentPageIndex === 0 ? colors.textSecondary : colors.white} 
              />
            </TouchableOpacity>

            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentPageIndex + 1) / totalPages) * 100}%` }
                ]} 
              />
            </View>

            <TouchableOpacity
              style={[
                styles.navButton,
                currentPageIndex === pages.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={goToNextPage}
              disabled={currentPageIndex === pages.length - 1}
            >
              <ChevronRight 
                size={24} 
                color={currentPageIndex === pages.length - 1 ? colors.textSecondary : colors.white} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  pageIndicator: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  pageText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  pageContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titlePage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  titleDecorationTop: {
    width: 200,
    height: 2,
    backgroundColor: colors.primary,
    marginBottom: 40,
    borderRadius: 1,
  },
  titleText: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 36,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 40,
  },
  titleDecorationBottom: {
    width: 200,
    height: 2,
    backgroundColor: colors.primary,
    marginBottom: 60,
    borderRadius: 1,
  },
  swipeHint: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  contentPage: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  contentText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 20,
    color: colors.white,
    lineHeight: 32,
    textAlign: 'left',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  navButton: {
    padding: 12,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.cardLight,
    borderRadius: 2,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});