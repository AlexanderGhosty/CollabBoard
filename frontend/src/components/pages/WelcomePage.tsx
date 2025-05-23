import { Link } from 'react-router-dom';
import WelcomeTemplate from '@/components/templates/WelcomeTemplate';
import Button from '@/components/atoms/Button';

export default function WelcomePage() {
  return (
    <WelcomeTemplate>
      <div className="bg-white shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-800 mb-2">Добро пожаловать в CollabBoard</h2>
          <p className="text-blue-600">
            Мгновенная совместная работа в едином пространстве. Организуйте задачи и проекты со своей командой в режиме реального времени.
          </p>
        </div>

        <div className="space-y-4">
          <Link to="/login" className="block w-full">
            <Button variant="primary" className="w-full py-3">
              Войти
            </Button>
          </Link>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-indigo-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-blue-600">В первый раз на CollabBoard?</span>
            </div>
          </div>

          <Link to="/register" className="block w-full">
            <Button variant="secondary" className="w-full py-3">
              Создать аккаунт
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-blue-500">
          <p>
            Регистрируясь, вы соглашаетесь с нашими Условиями предоставления услуг и Политикой конфиденциальности.
          </p>
        </div>
      </div>
    </WelcomeTemplate>
  );
}
