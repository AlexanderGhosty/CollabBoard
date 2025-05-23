import { useState } from 'react';
import { z } from 'zod';
import Header from '@/components/organisms/Header';
import { Input } from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { passwordSchema } from '@/utils/validate';
import { authService } from '@/services/authService';

// Schema for password change form
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Требуется текущий пароль'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Пожалуйста, подтвердите свой пароль'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ['confirmPassword'],
});

export default function AccountSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const { success, error: showError } = useToastStore();

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const result = passwordChangeSchema.safeParse(passwordForm);

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        formattedErrors[err.path[0] as string] = err.message;
      });
      setErrors(formattedErrors);
      return;
    }

    // Clear previous errors
    setErrors({});
    setIsSubmitting(true);

    try {
      await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      // Reset form on success
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      success('Пароль успешно изменен', 5000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password';
      showError(errorMessage, 5000);

      // Set specific error for incorrect current password
      if (errorMessage.includes('current password is incorrect')) {
        setErrors({
          currentPassword: 'Текущий пароль неверен',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-dark-blue-300 dark:to-dark-blue-200 transition-colors duration-300">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-dark-blue-50 rounded-2xl shadow-md dark:shadow-dark-card p-6 mb-8 transition-colors duration-300">
          <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-300 mb-6 transition-colors duration-300">Настройка аккаунта</h1>

          {/* User Information Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-4 transition-colors duration-300">Информация об аккаунте</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 transition-colors duration-300">Имя пользователя</label>
                <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2.5 rounded-2xl border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300 transition-colors duration-300">
                  {user?.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 transition-colors duration-300">Email адрес</label>
                <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2.5 rounded-2xl border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300 transition-colors duration-300">
                  {user?.email}
                </div>
              </div>
            </div>
          </section>

          {/* Change Password Section */}
          <section>
            <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-4 transition-colors duration-300">Изменение пароля</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 transition-colors duration-300">
                  Текущий пароль
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  error={errors.currentPassword}
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 transition-colors duration-300">
                  Новый пароль
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  error={errors.newPassword}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 transition-colors duration-300">
                  Подтвердите новый пароль
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Изменить пароль
                </Button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
