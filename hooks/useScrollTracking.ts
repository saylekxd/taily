import { useState, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';

interface UseScrollTrackingResult {
  contentHeight: number;
  scrollViewHeight: number;
  scrollViewRef: React.RefObject<ScrollView | null>;
  handleScroll: (event: any) => void;
  handleContentSizeChange: (contentWidth: number, contentHeight: number) => void;
  handleScrollViewLayout: (event: any) => void;
}

export function useScrollTracking(
  progress: number,
  setProgress: (progress: number) => void,
  shouldScrollToProgress: boolean,
  setShouldScrollToProgress: (should: boolean) => void,
  isMountedRef: React.MutableRefObject<boolean>
): UseScrollTrackingResult {
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to saved progress when content is ready
  useEffect(() => {
    if (shouldScrollToProgress && contentHeight > 0 && scrollViewHeight > 0 && progress > 0) {
      const scrollPosition = progress * (contentHeight - scrollViewHeight);
      
      console.log('Auto-scroll conditions met:', {
        shouldScrollToProgress,
        contentHeight,
        scrollViewHeight,
        progress: progress.toFixed(2),
        calculatedScrollPosition: scrollPosition.toFixed(0)
      });
      
      setTimeout(() => {
        if (isMountedRef.current) {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, scrollPosition),
            animated: true,
          });
          setShouldScrollToProgress(false);
          console.log('✅ Auto-scrolled to saved progress:', { 
            progress: `${(progress * 100).toFixed(1)}%`, 
            scrollPosition: scrollPosition.toFixed(0) 
          });
        }
      }, 1000); // Increased delay to ensure content is fully rendered
    }
  }, [shouldScrollToProgress, contentHeight, scrollViewHeight, progress, setShouldScrollToProgress, isMountedRef]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    const contentHeight = event.nativeEvent.contentSize.height;
    
    // Update dimensions for auto-scroll calculation
    setScrollViewHeight(scrollViewHeight);
    setContentHeight(contentHeight);
    
    // Calculate progress as percentage scrolled
    const currentProgress = Math.min(
      scrollPosition / (contentHeight - scrollViewHeight),
      1
    );
    
    if (isMountedRef.current) {
      setProgress(currentProgress);
    }
  };

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    setContentHeight(contentHeight);
    console.log('Content size changed:', { contentWidth, contentHeight });
  };

  const handleScrollViewLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight(height);
    console.log('ScrollView layout changed:', { height });
  };

  return {
    contentHeight,
    scrollViewHeight,
    scrollViewRef,
    handleScroll,
    handleContentSizeChange,
    handleScrollViewLayout,
  };
} 