import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw, X } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';

interface SpeechRecognitionErrorHandlerProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  colorTheme: any;
  autoRetryInterval?: number; // milliseconds
  maxAutoRetries?: number;
}

export default function SpeechRecognitionErrorHandler({
  error,
  onRetry,
  onDismiss,
  colorTheme,
  autoRetryInterval = 5000, // 5 seconds
  maxAutoRetries = 3,
}: SpeechRecognitionErrorHandlerProps) {
  const { t } = useI18n();
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);

  // Check if this is a retriable error (like 203/Retry)
  const isRetriableError = error?.includes('203') || error?.includes('Retry') || error?.includes('recognition_fail');

  // Auto-retry logic for retriable errors
  useEffect(() => {
    if (!error || !isRetriableError || !onRetry) return;
    if (autoRetryCount >= maxAutoRetries) return;

    const timer = setTimeout(() => {
      setIsAutoRetrying(true);
      setAutoRetryCount(prev => prev + 1);
      onRetry();
      
      // Reset auto-retry state after a moment
      setTimeout(() => setIsAutoRetrying(false), 1000);
    }, autoRetryInterval);

    return () => clearTimeout(timer);
  }, [error, autoRetryCount, maxAutoRetries, autoRetryInterval, onRetry, isRetriableError]);

  // Reset retry count when error changes or is cleared
  useEffect(() => {
    if (!error) {
      setAutoRetryCount(0);
      setIsAutoRetrying(false);
    }
  }, [error]);

  if (!error) return null;

  const handleManualRetry = () => {
    setAutoRetryCount(0);
    setIsAutoRetrying(true);
    onRetry?.();
    setTimeout(() => setIsAutoRetrying(false), 1000);
  };

  const getErrorMessage = () => {
    if (isRetriableError) {
      if (isAutoRetrying) {
        return t('error.speechRecognitionRetrying');
      }
      if (autoRetryCount > 0) {
        return t('error.speechRecognitionRetryFailed', { attempt: autoRetryCount, max: maxAutoRetries });
      }
      return t('error.speechRecognitionTemporary');
    }
    
    // For non-retriable errors, show a more generic message
    if (error.includes('permission')) {
      return t('error.speechRecognitionPermission');
    }
    if (error.includes('not supported') || error.includes('unavailable')) {
      return t('error.speechRecognitionUnsupported');
    }
    
    return t('error.speechRecognitionGeneric');
  };

  const showRetryButton = isRetriableError && !isAutoRetrying && autoRetryCount < maxAutoRetries;
  const showAutoRetryInfo = isRetriableError && autoRetryCount < maxAutoRetries;

  return (
    <View style={[styles.container, { backgroundColor: colorTheme.card, borderColor: colors.warning + '30' }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={20} color={colors.warning} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colorTheme.text }]}>
            {t('error.speechRecognitionTitle')}
          </Text>
          <Text style={[styles.message, { color: colorTheme.text + 'CC' }]}>
            {getErrorMessage()}
          </Text>
          
          {showAutoRetryInfo && (
            <Text style={[styles.autoRetryInfo, { color: colors.textSecondary }]}>
              {isAutoRetrying 
                ? t('error.autoRetrying')
                : t('error.autoRetryIn', { seconds: Math.ceil(autoRetryInterval / 1000) })
              }
            </Text>
          )}
        </View>
        
        <View style={styles.actions}>
          {showRetryButton && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={handleManualRetry}
              disabled={isAutoRetrying}
            >
              <RefreshCw size={16} color={colors.white} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: colorTheme.text + '20' }]}
            onPress={onDismiss}
          >
            <X size={16} color={colorTheme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  message: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  autoRetryInfo: {
    fontFamily: 'Nunito-Regular',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 