import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { audioService } from '@/services/audioService';

export interface AudioPlayerState {
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  position: number; // Current position in milliseconds
  duration: number; // Total duration in milliseconds
  error: string | null;
}

export interface UseAudioPlayerProps {
  storyId?: string;
  personalizedStoryId?: string;
  language?: 'en' | 'pl';
}

export function useAudioPlayer({ storyId, personalizedStoryId, language = 'en' }: UseAudioPlayerProps) {
  const [state, setState] = useState<AudioPlayerState>({
    isLoading: false,
    isPlaying: false,
    isPaused: false,
    position: 0,
    duration: 0,
    error: null,
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio session
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };

    setupAudio();

    // Cleanup on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Load audio when story changes
  useEffect(() => {
    if (storyId || personalizedStoryId) {
      loadAudio();
    }
  }, [storyId, personalizedStoryId, language]);

  const loadAudio = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Unload previous audio
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      let audioUrl: string | null = null;
      let audioDuration: number | null = null;

      // Get audio URL based on story type
      if (personalizedStoryId) {
        audioUrl = await audioService.getPersonalizedStoryAudioUrl(personalizedStoryId);
        audioDuration = await audioService.getPersonalizedStoryAudioDuration(personalizedStoryId);
      } else if (storyId) {
        audioUrl = await audioService.getStoryAudioUrl(storyId, language);
        audioDuration = await audioService.getStoryAudioDuration(storyId, language);
      }

      if (!audioUrl) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Audio not available for this story' 
        }));
        return;
      }

      // Load the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false }
      );

      soundRef.current = sound;

      // Get actual duration from loaded audio or use estimated duration
      const status = await sound.getStatusAsync();
      const actualDuration = status.isLoaded ? status.durationMillis || 0 : (audioDuration || 0) * 1000;

      setState(prev => ({
        ...prev,
        isLoading: false,
        duration: actualDuration,
      }));

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setState(prev => ({
            ...prev,
            position: status.positionMillis || 0,
            isPlaying: status.isPlaying || false,
            isPaused: !status.isPlaying && prev.position > 0,
          }));

          // Auto-pause when finished
          if (status.didJustFinish) {
            setState(prev => ({
              ...prev,
              isPlaying: false,
              isPaused: false,
            }));
          }
        }
      });

    } catch (error) {
      console.error('Error loading audio:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load audio',
      }));
    }
  };

  const play = async () => {
    if (!soundRef.current) {
      await loadAudio();
      return;
    }

    try {
      await soundRef.current.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to play audio',
      }));
    }
  };

  const pause = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.pauseAsync();
    } catch (error) {
      console.error('Error pausing audio:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to pause audio',
      }));
    }
  };

  const stop = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.stopAsync();
      setState(prev => ({
        ...prev,
        position: 0,
        isPlaying: false,
        isPaused: false,
      }));
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const seekTo = async (positionMillis: number) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(positionMillis);
    } catch (error) {
      console.error('Error seeking audio:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to seek audio',
      }));
    }
  };

  const setPlaybackRate = async (rate: number) => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.setRateAsync(rate, true);
    } catch (error) {
      console.error('Error setting playback rate:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to set playback rate',
      }));
    }
  };

  const togglePlayPause = async () => {
    if (state.isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const isAudioAvailable = async (): Promise<boolean> => {
    if (personalizedStoryId) {
      return await audioService.hasPersonalizedStoryAudio(personalizedStoryId);
    } else if (storyId) {
      return await audioService.hasStoryAudio(storyId, language);
    }
    return false;
  };

  return {
    ...state,
    play,
    pause,
    stop,
    seekTo,
    setPlaybackRate,
    togglePlayPause,
    loadAudio,
    isAudioAvailable,
  };
} 