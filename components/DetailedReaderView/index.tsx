import React, { useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Modal,
  StatusBar,
  SafeAreaView,
  Text,
  TouchableOpacity
} from 'react-native';
import { Eye } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';

// Import types
import { DetailedReaderViewProps } from './types';

// Import constants
import { colorThemes } from './constants';

// Import hooks
import { useReaderSettings } from './hooks/useReaderSettings';
import { useReaderScroll } from './hooks/useReaderScroll';
import { useInteractiveReadingWithErrorHandling } from './hooks/useInteractiveReadingWithErrorHandling';

// Import components
import ReaderHeader from './components/ReaderHeader';
import SettingsPanel from './components/SettingsPanel';
import ReaderContent from './components/ReaderContent';
import FullscreenControls from './components/FullscreenControls';
import SpeechRecognitionErrorHandler from '@/components/ErrorHandling/SpeechRecognitionErrorHandler';

export default function DetailedReaderView({
  visible,
  onClose,
  content,
  title,
  progress,
  onProgressChange,
  storyId,
  personalizedStoryId,
}: DetailedReaderViewProps) {
  const { t } = useI18n();
  
  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [showInstructionsBanner, setShowInstructionsBanner] = useState(true);
  const instructionsBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom hooks
  const {
    settings,
    isLoadingSettings,
    increaseFontSize,
    decreaseFontSize,
    toggleFullscreen: handleToggleFullscreen,
    handleColorThemeChange,
  } = useReaderSettings(visible);

  const {
    scrollState,
    scrollViewRef,
    handleScrollBegin,
    handleScrollEnd,
    handleScroll,
    handleContentSizeChange,
    handleLayoutChange,
    updateScrollState,
  } = useReaderScroll({ isModalVisible: visible, progress, onProgressChange });

  const {
    interactiveState,
    triggerWords,
    error: interactiveError,
    isAvailable: isInteractiveAvailable,
    toggleListening,
    toggleInteractiveMode,
    toggleSoundEffects,
    onWordRecognized,
    clearError,
    manualRetry,
    enableAndStartListening,
  } = useInteractiveReadingWithErrorHandling(content, storyId, personalizedStoryId);

  // Handle instructions banner
  React.useEffect(() => {
    if (visible) {
      setShowInstructionsBanner(true);
      instructionsBannerTimeoutRef.current = setTimeout(() => {
        setShowInstructionsBanner(false);
      }, 2000);
      
      // Debug: Log when modal opens to check if services are working
      console.log('DetailedReaderView opened - Interactive features available:', isInteractiveAvailable);
      if (interactiveError) {
        console.error('Interactive reading error:', interactiveError);
      }
    } else {
      if (instructionsBannerTimeoutRef.current) {
        clearTimeout(instructionsBannerTimeoutRef.current);
      }
    }
  }, [visible, isInteractiveAvailable, interactiveError]);

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (instructionsBannerTimeoutRef.current) {
        clearTimeout(instructionsBannerTimeoutRef.current);
      }
    };
  }, []);

  const toggleFullscreen = () => {
    handleToggleFullscreen();
    // Close settings panel when entering fullscreen mode
    if (!settings.isFullscreen) {
      setShowSettings(false);
    }
  };

  // Get current theme
  const currentTheme = colorThemes[settings.colorTheme];

  // Show loading state while settings are being loaded
  if (isLoadingSettings) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.white }]}>
              {t('common.loading')}...
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={settings.isFullscreen ? "fullScreen" : "pageSheet"}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <StatusBar 
          barStyle={settings.colorTheme === 'light' ? 'dark-content' : 'light-content'} 
          hidden={settings.isFullscreen}
        />
        
        {/* Header */}
        <ReaderHeader
          title={title}
          onClose={onClose}
          onSettingsToggle={() => setShowSettings(!showSettings)}
          colorTheme={currentTheme}
          isFullscreen={settings.isFullscreen}
          interactiveState={interactiveState}
          onToggleListening={toggleListening}
          onToggleInteractiveMode={toggleInteractiveMode}
          onEnableAndStartListening={enableAndStartListening}
          isInteractiveAvailable={isInteractiveAvailable}
        />

        {/* Settings Panel */}
        {showSettings && !settings.isFullscreen && (
          <SettingsPanel
            settings={settings}
            colorTheme={currentTheme}
            onFontSizeIncrease={increaseFontSize}
            onFontSizeDecrease={decreaseFontSize}
            onColorThemeChange={handleColorThemeChange}
            onFullscreenToggle={toggleFullscreen}
            interactiveState={interactiveState}
            onToggleListening={toggleListening}
            onToggleInteractiveMode={toggleInteractiveMode}
            onToggleSoundEffects={toggleSoundEffects}
            isInteractiveAvailable={isInteractiveAvailable}
          />
        )}

        {/* Speech Recognition Error Handler */}
        <SpeechRecognitionErrorHandler
          error={interactiveError}
          onRetry={manualRetry}
          onDismiss={clearError}
          colorTheme={currentTheme}
        />



        {/* Content */}
        <ReaderContent
          content={content}
          settings={settings}
          colorTheme={currentTheme}
          progress={progress}
          onProgressChange={onProgressChange}
          scrollState={scrollState}
          onScrollStateChange={updateScrollState}
          isFullscreen={settings.isFullscreen}
          scrollViewRef={scrollViewRef}
          isInteractiveMode={interactiveState.isEnabled}
          highlightedWords={interactiveState.recognizedWords}
          onWordSpoken={onWordRecognized}
          storyId={storyId}
          personalizedStoryId={personalizedStoryId}
        />

        {/* Fullscreen controls - positioned absolutely to stay sticky */}
        {settings.isFullscreen && (
          <FullscreenControls
            colorTheme={currentTheme}
            onToggleFullscreen={toggleFullscreen}
            onClose={onClose}
            interactiveState={interactiveState}
            onToggleListening={toggleListening}
            onToggleInteractiveMode={toggleInteractiveMode}
            onEnableAndStartListening={enableAndStartListening}
            isInteractiveAvailable={isInteractiveAvailable}
          />
        )}

        {/* Reading Instructions */}
        {!showSettings && !settings.isFullscreen && showInstructionsBanner && (
          <View style={[styles.instructionsBanner, { backgroundColor: currentTheme.card }]}>
            <Eye size={16} color={currentTheme.text} />
            <Text style={[styles.instructionsText, { color: currentTheme.text }]}>
              {t('story.adjustTextAndTheme')}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
  },
  instructionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  instructionsText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});