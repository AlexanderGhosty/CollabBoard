import { authApi } from '@/services/api';
import { handleApiError } from '@/utils/api/errorHandling';

export const authService = {
  /**
   * Change the user's password
   * @param currentPassword The user's current password
   * @param newPassword The new password to set
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await authApi.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
    } catch (error) {
      throw handleApiError(error);
    }
  }
};
