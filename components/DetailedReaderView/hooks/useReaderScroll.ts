import { useState, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { ScrollState } from '../types';

interface UseReaderScrollParams {
  isModalVisible: boolean;
  progress: number;
  onProgressChange?: (progress: number) => void;
}

export function useReaderScroll({ isModalVisible, progress, onProgressChange }: UseReaderScrollParams) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollViewHeight: 0,
    contentHeight: 0,
    isUserScrolling: false,
    hasInitialScroll: false,
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to progress position on initial load
  useEffect(() => {
    if (isModalVisible && progress > 0 && scrollState.contentHeight > 0 && 
        scrollState.scrollViewHeight > 0 && !scrollState.hasInitialScroll) {
      const maxScrollY = Math.max(0, scrollState.contentHeight - scrollState.scrollViewHeight);
      const scrollY = maxScrollY * progress;
      scrollViewRef.current?.scrollTo({ y: scrollY, animated: false });
      setScrollState(prev => ({ ...prev, hasInitialScroll: true }));
    }
  }, [isModalVisible, progress, scrollState.contentHeight, scrollState.scrollViewHeight, scrollState.hasInitialScroll]);

  // Reset initial scroll flag when modal becomes visible
  useEffect(() => {
    if (isModalVisible) {
      setScrollState(prev => ({ ...prev, hasInitialScroll: false }));
    }
  }, [isModalVisible]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleScrollBegin = () => {
    setScrollState(prev => ({ ...prev, isUserScrolling: true }));
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };

  const handleScrollEnd = () => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a timeout to reset user scrolling flag
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollState(prev => ({ ...prev, isUserScrolling: false }));
    }, 150);
  };

  const handleScroll = (event: any) => {
    if (!scrollState.isUserScrolling || scrollState.contentHeight <= scrollState.scrollViewHeight) return;
    
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScrollY = contentSize.height - layoutMeasurement.height;
    
    if (maxScrollY > 0) {
      const newProgress = Math.max(0, Math.min(1, contentOffset.y / maxScrollY));
      onProgressChange?.(newProgress);
    }
  };

  const handleContentSizeChange = (contentWidth: number, newContentHeight: number) => {
    setScrollState(prev => ({ ...prev, contentHeight: newContentHeight }));
  };

  const handleLayoutChange = (event: any) => {
    setScrollState(prev => ({ ...prev, scrollViewHeight: event.nativeEvent.layout.height }));
  };

  const updateScrollState = (updates: Partial<ScrollState>) => {
    setScrollState(prev => ({ ...prev, ...updates }));
  };

  return {
    scrollState,
    scrollViewRef,
    handleScrollBegin,
    handleScrollEnd,
    handleScroll,
    handleContentSizeChange,
    handleLayoutChange,
    updateScrollState,
  };
} 