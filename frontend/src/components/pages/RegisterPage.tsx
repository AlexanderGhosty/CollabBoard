import AuthTemplate from '@/components/templates/AuthTemplate';
import AuthForm from '@/components/molecules/AuthForm';

export default function RegisterPage() {
  return (
    <AuthTemplate>
      <AuthForm mode="register" />
    </AuthTemplate>
  );
}