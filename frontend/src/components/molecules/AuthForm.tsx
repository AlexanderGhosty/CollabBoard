import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Input } from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { emailSchema, passwordSchema, nameSchema } from '@/utils/validate';

// Different schemas for login and registration
const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema });

type Mode = 'login' | 'register';

export default function AuthForm({ mode = 'login' }: { mode?: Mode }) {
  const navigate = useNavigate();
  const auth = useAuthStore();
  const [form, set] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState<{ name?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    // Use the appropriate schema based on mode
    const schema = mode === 'login' ? loginSchema : registerSchema;
    const res = schema.safeParse(form);

    if (!res.success) {
      const zErr: any = {};
      res.error.errors.forEach((e) => (zErr[e.path[0]] = e.message));
      setErr(zErr);
      return;
    }

    setErr({});
    setLoading(true);
    try {
      if (mode === 'login') {
        await auth.login(form.email, form.password);
      } else {
        await auth.register(form.name, form.email, form.password);
      }
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handle();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {mode === 'register' && (
        <Input
          placeholder="Имя"
          value={form.name}
          error={err.name}
          autoComplete="name"
          onChange={(e) => set({ ...form, name: e.target.value })}
        />
      )}
      <Input
        placeholder="E‑mail"
        type="email"
        value={form.email}
        error={err.email}
        autoComplete={mode === 'login' ? 'username' : 'email'}
        onChange={(e) => set({ ...form, email: e.target.value })}
      />
      <Input
        placeholder="Пароль"
        type="password"
        value={form.password}
        error={err.password}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        onChange={(e) => set({ ...form, password: e.target.value })}
      />
      <Button type="submit" variant="primary" loading={loading}>
        {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
      </Button>
    </form>
  );
}