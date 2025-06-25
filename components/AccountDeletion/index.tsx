import React, { useState, useEffect } from 'react';
import { View, Text, Alert, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Trash2, Clock } from 'lucide-react-native';
import { accountDeletionService, AccountDeletionStatus } from '@/services/accountDeletionService';
import { useI18n } from '@/hooks/useI18n';
import { colors } from '@/constants/colors';
import RequestDeletionModal from '@/components/AccountDeletion/RequestDeletionModal';
import CancelDeletionModal from '@/components/AccountDeletion/CancelDeletionModal';

interface AccountDeletionProps {
  onDeletionStatusChange?: (hasPendingDeletion: boolean) => void;
}

export default function AccountDeletion({ onDeletionStatusChange }: AccountDeletionProps) {
  const { t } = useI18n();
  const [deletionStatus, setDeletionStatus] = useState<AccountDeletionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    loadDeletionStatus();
  }, []);

  const loadDeletionStatus = async () => {
    setLoading(true);
    try {
      const status = await accountDeletionService.getAccountDeletionStatus();
      setDeletionStatus(status);
      onDeletionStatusChange?.(status.has_pending_deletion);
    } catch (error) {
      console.error('Error loading deletion status:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeletionRequest = () => {
    Alert.alert(
      t('profile.accountDeletion.confirmRequest'),
      t('profile.accountDeletion.confirmRequestMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('profile.accountDeletion.deleteAccount'), 
          style: 'destructive',
          onPress: () => setShowRequestModal(true)
        }
      ]
    );
  };

  const handleRequestSuccess = () => {
    setShowRequestModal(false);
    loadDeletionStatus();
  };

  const handleCancelSuccess = () => {
    setShowCancelModal(false);
    loadDeletionStatus();
  };

  if (loading && !deletionStatus) {
    return (
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={styles.settingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.settingSection}>
      <Text style={styles.sectionTitle}>{t('profile.accountDeletion.title')}</Text>
      
      {deletionStatus?.has_pending_deletion ? (
        <View style={styles.pendingContainer}>
          {/* Pending Status */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Clock size={20} color={colors.warning} />
              <View style={styles.textContainer}>
                <Text style={[styles.settingText, { color: colors.warning }]}>
                  {t('profile.accountDeletion.pendingDeletion')}
                </Text>
                <Text style={styles.subText}>
                  {deletionStatus.scheduled_deletion_date && 
                    `${accountDeletionService.getDaysUntilDeletion(deletionStatus.scheduled_deletion_date)} ${t('profile.accountDeletion.days')} ${t('profile.accountDeletion.daysRemaining').toLowerCase()}`
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => setShowCancelModal(true)}
            disabled={loading}
          >
            <Text style={[styles.settingButtonText, { color: colors.success }]}>
              {t('profile.accountDeletion.cancelRequest')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.settingItem}
          onPress={confirmDeletionRequest}
          disabled={loading}
        >
          <View style={styles.settingLeft}>
            <Trash2 size={20} color={colors.error} />
            <Text style={[styles.settingText, { color: colors.error }]}>
              {t('profile.accountDeletion.requestDeletion')}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <RequestDeletionModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={handleRequestSuccess}
      />

      <CancelDeletionModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={handleCancelSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: colors.white,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.white,
    marginLeft: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  subText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pendingContainer: {
    gap: 8,
  },
  settingButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: 8,
  },
  settingButtonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
  },
}); 