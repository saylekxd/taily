import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { accountDeletionService } from '@/services/accountDeletionService';
import { useI18n } from '@/hooks/useI18n';
import { colors } from '@/constants/colors';

interface CancelDeletionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CancelDeletionModal({ visible, onClose, onSuccess }: CancelDeletionModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  const handleCancelDeletion = async () => {
    if (!accountDeletionService.isValidConfirmationCode(confirmationCode)) {
      Alert.alert(
        t('common.error'),
        t('profile.accountDeletion.invalidConfirmationCode')
      );
      return;
    }

    setLoading(true);
    try {
      const result = await accountDeletionService.cancelAccountDeletion(confirmationCode);
      
      if (result.success) {
        Alert.alert(
          t('profile.accountDeletion.cancelSuccess'),
          result.message,
          [
            {
              text: t('common.ok'),
              onPress: () => {
                setConfirmationCode('');
                onSuccess();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          t('common.error'),
          result.error || t('profile.accountDeletion.cancelFailed')
        );
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        t('profile.accountDeletion.cancelFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmationCode('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {t('profile.accountDeletion.cancelRequest')}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalDescription}>
            {t('profile.accountDeletion.cancelModalDescription')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('profile.accountDeletion.confirmationCode')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={confirmationCode}
              onChangeText={(text) => setConfirmationCode(text.toUpperCase())}
              placeholder="XXXXXXXX"
              maxLength={8}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelModalButtonText}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successButton}
              onPress={handleCancelDeletion}
              disabled={loading || !confirmationCode}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <AlertTriangle size={16} color="white" />
                  <Text style={styles.successButtonText}>
                    {t('profile.accountDeletion.cancelDeletion')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.white,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.white,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.white,
    backgroundColor: colors.card,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontFamily: 'Nunito-SemiBold',
    color: colors.white,
  },
  successButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  successButtonText: {
    fontFamily: 'Nunito-Bold',
    color: 'white',
  },
}); 