import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Input } from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { emailSchema, passwordSchema } from '@/utils/validate';

const schema = z.object({ email: emailSchema, password: passwordSchema });

type Mode = 'login' | 'register';

export default function AuthForm({ mode = 'login' }: { mode?: Mode }) {
  const navigate = useNavigate();
  const auth = useAuthStore();
  const [form, set] = useState({ email: '', password: '' });
  const [err, setErr] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handle = async () => {
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
      mode === 'login' ? await auth.login(form.email, form.password) : await auth.register(form.email, form.password);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Input placeholder="E‑mail" value={form.email} error={err.email} onChange={(e) => set({ ...form, email: e.target.value })} />
      <Input placeholder="Пароль" type="password" value={form.password} error={err.password} onChange={(e) => set({ ...form, password: e.target.value })} />
      <Button variant="primary" loading={loading} onClick={handle}>
        {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
      </Button>
    </div>
  );
}