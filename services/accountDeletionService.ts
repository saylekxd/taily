import { supabase } from '@/lib/supabase';

export interface AccountDeletionStatus {
  success: boolean;
  has_pending_deletion: boolean;
  scheduled_deletion_date?: string;
  confirmation_code?: string;
  requested_at?: string;
  reason?: string;
  error?: string;
}

export interface AccountDeletionRequest {
  success: boolean;
  confirmation_code?: string;
  scheduled_deletion_date?: string;
  message?: string;
  error?: string;
}

export interface AccountDeletionCancellation {
  success: boolean;
  message?: string;
  error?: string;
}

class AccountDeletionService {
  /**
   * Request account deletion with optional reason
   */
  async requestAccountDeletion(reason?: string): Promise<AccountDeletionRequest> {
    try {
      const { data, error } = await supabase.rpc('request_account_deletion', {
        deletion_reason: reason || null
      });

      if (error) {
        console.error('Error requesting account deletion:', error);
        return {
          success: false,
          error: error.message || 'Failed to request account deletion'
        };
      }

      return data as AccountDeletionRequest;
    } catch (error) {
      console.error('Error in requestAccountDeletion:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while requesting account deletion'
      };
    }
  }

  /**
   * Cancel account deletion request using confirmation code
   */
  async cancelAccountDeletion(confirmationCode: string): Promise<AccountDeletionCancellation> {
    try {
      const { data, error } = await supabase.rpc('cancel_account_deletion', {
        confirmation_code_input: confirmationCode
      });

      if (error) {
        console.error('Error cancelling account deletion:', error);
        return {
          success: false,
          error: error.message || 'Failed to cancel account deletion'
        };
      }

      return data as AccountDeletionCancellation;
    } catch (error) {
      console.error('Error in cancelAccountDeletion:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while cancelling account deletion'
      };
    }
  }

  /**
   * Get current account deletion status
   */
  async getAccountDeletionStatus(): Promise<AccountDeletionStatus> {
    try {
      const { data, error } = await supabase.rpc('get_account_deletion_status');

      if (error) {
        console.error('Error getting account deletion status:', error);
        return {
          success: false,
          has_pending_deletion: false,
          error: error.message || 'Failed to get account deletion status'
        };
      }

      return data as AccountDeletionStatus;
    } catch (error) {
      console.error('Error in getAccountDeletionStatus:', error);
      return {
        success: false,
        has_pending_deletion: false,
        error: 'An unexpected error occurred while checking account deletion status'
      };
    }
  }

  /**
   * Format deletion date for display
   */
  formatDeletionDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Calculate days remaining until deletion
   */
  getDaysUntilDeletion(dateString: string): number {
    try {
      const deletionDate = new Date(dateString);
      const now = new Date();
      const diffTime = deletionDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 0;
    }
  }

  /**
   * Validate confirmation code format
   */
  isValidConfirmationCode(code: string): boolean {
    // Confirmation codes are 8 character uppercase alphanumeric strings
    return /^[A-Z0-9]{8}$/.test(code);
  }
}

export const accountDeletionService = new AccountDeletionService(); 