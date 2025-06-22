import { FontSize, ColorTheme } from '@/types';
import { RefObject } from 'react';
import { ScrollView } from 'react-native';

export interface DetailedReaderViewProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  title: string;
  progress: number;
  onProgressChange?: (progress: number) => void;
  // Story identification for sound effects
  storyId?: string;
  personalizedStoryId?: string;
}

export interface ReaderSettings {
  fontSize: FontSize;
  colorTheme: ColorTheme;
  isFullscreen: boolean;
}

export interface ColorThemeStyle {
  background: string;
  text: string;
  card: string;
}

export interface ScrollState {
  scrollViewHeight: number;
  contentHeight: number;
  isUserScrolling: boolean;
  hasInitialScroll: boolean;
}

export interface ReaderHeaderProps {
  title: string;
  onClose: () => void;
  onSettingsToggle: () => void;
  colorTheme: ColorThemeStyle;
  isFullscreen: boolean;
  // Interactive Reading props
  interactiveState?: InteractiveReadingState;
  onToggleListening?: () => void;
  onToggleInteractiveMode?: () => void;
  onEnableAndStartListening?: () => void;
  isInteractiveAvailable?: boolean;
}

export interface SettingsPanelProps {
  settings: ReaderSettings;
  colorTheme: ColorThemeStyle;
  onFontSizeIncrease: () => void;
  onFontSizeDecrease: () => void;
  onColorThemeChange: (theme: ColorTheme) => void;
  onFullscreenToggle: () => void;
  // Interactive Reading props
  interactiveState: InteractiveReadingState;
  onToggleListening: () => void;
  onToggleInteractiveMode: () => void;
  onToggleSoundEffects: () => void;
  isInteractiveAvailable?: boolean;
}

export interface ReaderContentProps {
  content: string;
  settings: ReaderSettings;
  colorTheme: ColorThemeStyle;
  progress: number;
  onProgressChange?: (progress: number) => void;
  scrollState: ScrollState;
  onScrollStateChange: (state: Partial<ScrollState>) => void;
  isFullscreen: boolean;
  scrollViewRef: RefObject<ScrollView | null>;
  // Feature 3 props
  isInteractiveMode?: boolean;
  highlightedWords?: string[];
  onWordSpoken?: (word: string) => void;
  // Story identification for sound effects
  storyId?: string;
  personalizedStoryId?: string;
}

export interface FullscreenControlsProps {
  colorTheme: ColorThemeStyle;
  onToggleFullscreen: () => void;
  onClose: () => void;
  // Interactive Reading props
  interactiveState?: InteractiveReadingState;
  onToggleListening?: () => void;
  onToggleInteractiveMode?: () => void;
  onEnableAndStartListening?: () => void;
  isInteractiveAvailable?: boolean;
}

// Feature 3 types
export interface InteractiveReadingState {
  isListening: boolean;
  isEnabled: boolean;
  recognizedWords: string[];
  currentWord: string | null;
  soundEffectsEnabled: boolean;
}

export interface InteractiveControlsProps {
  state: InteractiveReadingState;
  onToggleListening: () => void;
  onToggleInteractiveMode: () => void;
  onToggleSoundEffects: () => void;
  colorTheme: ColorThemeStyle;
  error?: string | null;
  isAvailable?: boolean;
  onClearError?: () => void;
}

export interface WordHighlight {
  word: string;
  position: number;
  soundEffect?: string;
}