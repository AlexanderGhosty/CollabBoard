import AuthTemplate from '@/components/templates/AuthTemplate';
import AuthForm from '@/components/molecules/AuthForm';

export default function LoginPage() {
  return (
    <AuthTemplate>
      <AuthForm mode="login" />
    </AuthTemplate>
  );
}