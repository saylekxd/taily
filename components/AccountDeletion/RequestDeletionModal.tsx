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
import { Trash2 } from 'lucide-react-native';
import { accountDeletionService } from '@/services/accountDeletionService';
import { useI18n } from '@/hooks/useI18n';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface RequestDeletionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestDeletionModal({ visible, onClose, onSuccess }: RequestDeletionModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleRequestDeletion = async () => {
    setLoading(true);
    try {
      const result = await accountDeletionService.requestAccountDeletion(reason);
      
      if (result.success) {
        Alert.alert(
          t('profile.accountDeletion.requestSuccess'),
          `${result.message}\n\n${t('profile.accountDeletion.confirmationCode')}: ${result.confirmation_code}`,
          [
            {
              text: t('common.ok'),
              onPress: async () => {
                setReason('');
                onSuccess();
                // Log out the user after successful deletion request
                await supabase.auth.signOut();
                router.replace('/auth/sign-in');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          t('common.error'),
          result.error || t('profile.accountDeletion.requestFailed')
        );
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        t('profile.accountDeletion.requestFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
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
            {t('profile.accountDeletion.requestDeletion')}
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
            {t('profile.accountDeletion.requestModalDescription')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('profile.accountDeletion.reasonOptional')}
            </Text>
            <TextInput
              style={styles.textInput}
              value={reason}
              onChangeText={setReason}
              placeholder={t('profile.accountDeletion.reasonPlaceholder')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
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
              style={styles.confirmButton}
              onPress={handleRequestDeletion}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Trash2 size={16} color="white" />
                  <Text style={styles.confirmButtonText}>
                    {t('profile.accountDeletion.confirmDeletion')}
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
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmButtonText: {
    fontFamily: 'Nunito-Bold',
    color: 'white',
  },
}); 