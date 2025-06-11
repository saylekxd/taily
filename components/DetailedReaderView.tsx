import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  StatusBar,
  SafeAreaView,
  Modal,
  Pressable
} from 'react-native';
import { 
  X, 
  Type, 
  Maximize2, 
  Minimize2, 
  Settings,
  Eye,
  Moon,
  Sun
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { useUser } from '@/hooks/useUser';
import { FontSize, ColorTheme } from '@/types';
import { 
  getUserReadingSettings,
  updateReadingSetting,
  getNextFontSize,
  getPreviousFontSize,
  DEFAULT_READING_SETTINGS
} from '@/services/readingSettingsService';

interface DetailedReaderViewProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  title: string;
  progress: number;
  onProgressChange?: (progress: number) => void;
}

const fontSizes: Record<FontSize, number> = {
  small: 16,
  medium: 20,
  large: 24,
  xlarge: 28,
  xxlarge: 32,
};

const lineHeights: Record<FontSize, number> = {
  small: 24,
  medium: 30,
  large: 36,
  xlarge: 42,
  xxlarge: 48,
};

const colorThemes: Record<ColorTheme, { background: string; text: string; card: string }> = {
  dark: {
    background: colors.background,
    text: colors.white,
    card: colors.card,
  },
  light: {
    background: '#FFFFFF',
    text: '#000000',
    card: '#F5F5F5',
  },
  sepia: {
    background: '#F4F1E8',
    text: '#5D4037',
    card: '#EFEBE0',
  },
  'high-contrast': {
    background: '#000000',
    text: '#FFFFFF',
    card: '#333333',
  },
};

export default function DetailedReaderView({
  visible,
  onClose,
  content,
  title,
  progress,
  onProgressChange,
}: DetailedReaderViewProps) {
  const { t } = useI18n();
  const { user } = useUser();
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [hasInitialScroll, setHasInitialScroll] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [showInstructionsBanner, setShowInstructionsBanner] = useState(true);
  
  const { width, height } = Dimensions.get('window');
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instructionsBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user's reading settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) {
        setIsLoadingSettings(false);
        return;
      }

      try {
        const settings = await getUserReadingSettings(user.id);
        setFontSize(settings.font_size);
        setColorTheme(settings.color_theme);
        setIsFullscreen(settings.fullscreen_mode);
      } catch (error) {
        console.error('Error loading reading settings:', error);
        // Use default settings on error
        const defaults = DEFAULT_READING_SETTINGS;
        setFontSize(defaults.font_size);
        setColorTheme(defaults.color_theme);
        setIsFullscreen(defaults.fullscreen_mode);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    if (visible) {
      loadSettings();
      // Show instructions banner for 2 seconds when modal opens
      setShowInstructionsBanner(true);
      instructionsBannerTimeoutRef.current = setTimeout(() => {
        setShowInstructionsBanner(false);
      }, 2000);
    } else {
      // Clear timeout if modal is closed before 2 seconds
      if (instructionsBannerTimeoutRef.current) {
        clearTimeout(instructionsBannerTimeoutRef.current);
      }
    }
  }, [visible, user?.id]);

  // Save settings when they change
  const saveSettingToDatabase = async (key: keyof typeof DEFAULT_READING_SETTINGS, value: any) => {
    if (!user?.id) return;

    try {
      await updateReadingSetting(user.id, key, value);
    } catch (error) {
      console.error(`Error saving ${key} setting:`, error);
    }
  };

  // Only auto-scroll on initial load, not during user interaction
  useEffect(() => {
    if (visible && progress > 0 && contentHeight > 0 && scrollViewHeight > 0 && !hasInitialScroll) {
      // Scroll to the current progress position on initial load
      const maxScrollY = Math.max(0, contentHeight - scrollViewHeight);
      const scrollY = maxScrollY * progress;
      scrollViewRef.current?.scrollTo({ y: scrollY, animated: false });
      setHasInitialScroll(true);
    }
  }, [visible, progress, contentHeight, scrollViewHeight, hasInitialScroll]);

  // Reset initial scroll flag when modal becomes visible
  useEffect(() => {
    if (visible) {
      setHasInitialScroll(false);
    }
  }, [visible]);

  const handleScrollBegin = () => {
    setIsUserScrolling(true);
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
      setIsUserScrolling(false);
    }, 150);
  };

  const handleScroll = (event: any) => {
    if (!isUserScrolling || contentHeight <= scrollViewHeight) return;
    
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScrollY = contentSize.height - layoutMeasurement.height;
    
    if (maxScrollY > 0) {
      const newProgress = Math.max(0, Math.min(1, contentOffset.y / maxScrollY));
      onProgressChange?.(newProgress);
    }
  };

  const handleContentSizeChange = (contentWidth: number, newContentHeight: number) => {
    setContentHeight(newContentHeight);
  };

  const handleLayoutChange = (event: any) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (instructionsBannerTimeoutRef.current) {
        clearTimeout(instructionsBannerTimeoutRef.current);
      }
    };
  }, []);

  const increaseFontSize = async () => {
    const nextSize = getNextFontSize(fontSize);
    if (nextSize !== fontSize) {
      setFontSize(nextSize);
      await saveSettingToDatabase('font_size', nextSize);
    }
  };

  const decreaseFontSize = async () => {
    const prevSize = getPreviousFontSize(fontSize);
    if (prevSize !== fontSize) {
      setFontSize(prevSize);
      await saveSettingToDatabase('font_size', prevSize);
    }
  };

  const toggleFullscreen = async () => {
    const newFullscreen = !isFullscreen;
    setIsFullscreen(newFullscreen);
    await saveSettingToDatabase('fullscreen_mode', newFullscreen);
    
    // Close settings panel when entering fullscreen mode
    if (newFullscreen) {
      setShowSettings(false);
    }
  };

  const handleColorThemeChange = async (theme: ColorTheme) => {
    setColorTheme(theme);
    await saveSettingToDatabase('color_theme', theme);
  };

  const currentTheme = colorThemes[colorTheme];

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: currentTheme.background,
    },
    text: {
      color: currentTheme.text,
      fontSize: fontSizes[fontSize],
      lineHeight: lineHeights[fontSize],
    },
    settingsCard: {
      backgroundColor: currentTheme.card,
    },
    header: {
      backgroundColor: currentTheme.background,
      borderBottomColor: currentTheme.text + '20',
    },
  });

  const SettingsPanel = () => (
    <View style={[styles.settingsPanel, dynamicStyles.settingsCard]}>
      {/* Font Size Controls */}
      <View style={styles.settingSection}>
        <Text style={[styles.settingTitle, { color: currentTheme.text }]}>{t('story.textSize')}</Text>
        <View style={styles.fontControls}>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: currentTheme.text + '30' }]}
            onPress={decreaseFontSize}
            disabled={fontSize === 'small'}
          >
            <Text style={[styles.controlButtonText, { color: currentTheme.text }]}>A</Text>
          </TouchableOpacity>
          <Text style={[styles.currentFontSize, { color: currentTheme.text }]}>
            {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
          </Text>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: currentTheme.text + '30' }]}
            onPress={increaseFontSize}
            disabled={fontSize === 'xxlarge'}
          >
            <Text style={[styles.controlButtonText, { color: currentTheme.text, fontSize: 20 }]}>A</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Theme Controls */}
      <View style={styles.settingSection}>
        <Text style={[styles.settingTitle, { color: currentTheme.text }]}>{t('story.theme')}</Text>
        <View style={styles.themeControls}>
          {(Object.keys(colorThemes) as ColorTheme[]).map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[
                styles.themeButton,
                { backgroundColor: colorThemes[theme].background },
                colorTheme === theme && { borderColor: colors.primary, borderWidth: 3 }
              ]}
              onPress={() => handleColorThemeChange(theme)}
            >
              <View style={[styles.themePreview, { backgroundColor: colorThemes[theme].text }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Fullscreen Toggle */}
      <TouchableOpacity
        style={[styles.settingButton, { borderColor: currentTheme.text + '30' }]}
        onPress={toggleFullscreen}
      >
        {isFullscreen ? (
          <Minimize2 size={20} color={currentTheme.text} />
        ) : (
          <Maximize2 size={20} color={currentTheme.text} />
        )}
        <Text style={[styles.settingButtonText, { color: currentTheme.text }]}>
          {isFullscreen ? t('story.exitFullscreen') : t('story.fullscreenMode')}
        </Text>
      </TouchableOpacity>
    </View>
  );

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
      presentationStyle={isFullscreen ? "fullScreen" : "pageSheet"}
    >
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <StatusBar 
          barStyle={colorTheme === 'light' ? 'dark-content' : 'light-content'} 
          hidden={isFullscreen}
        />
        
        {/* Header */}
        {!isFullscreen && (
          <View style={[styles.header, dynamicStyles.header]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <X size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.headerTitle, { color: currentTheme.text }]} numberOfLines={1}>
              {title}
            </Text>
            
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={() => setShowSettings(!showSettings)}
              >
                <Settings size={24} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Settings Panel */}
        {showSettings && !isFullscreen && <SettingsPanel />}

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.contentScrollView}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingTop: isFullscreen ? 60 : 20 }
          ]}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBegin}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          onLayout={handleLayoutChange}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          <Text style={[styles.content, dynamicStyles.text]}>
            {content}
          </Text>
          
          <View style={styles.endSpacer} />
        </ScrollView>

        {/* Fullscreen controls - positioned absolutely to stay sticky */}
        {isFullscreen && (
          <View style={[styles.fullscreenControls, { backgroundColor: currentTheme.card + 'CC' }]}>
            <TouchableOpacity style={styles.fullscreenButton} onPress={toggleFullscreen}>
              <Minimize2 size={16} color={currentTheme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.fullscreenButton} onPress={onClose}>
              <X size={16} color={currentTheme.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Reading Instructions */}
        {!showSettings && !isFullscreen && showInstructionsBanner && (
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 44,
  },
  headerRight: {
    width: 44,
    alignItems: 'flex-end',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    textAlign: 'center',
  },
  settingsPanel: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
  },
  currentFontSize: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    marginHorizontal: 20,
    minWidth: 60,
    textAlign: 'center',
  },
  themeControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeButton: {
    width: 60,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themePreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  settingButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
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
  fullscreenControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    borderRadius: 20,
    padding: 6,
    zIndex: 1000,
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fullscreenButton: {
    padding: 8,
    marginHorizontal: 1,
    borderRadius: 16,
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
  endSpacer: {
    height: 60,
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
}); 