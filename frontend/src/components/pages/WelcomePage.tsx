import { Link } from 'react-router-dom';
import WelcomeTemplate from '@/components/templates/WelcomeTemplate';
import Button from '@/components/atoms/Button';

export default function WelcomePage() {
  return (
    <WelcomeTemplate>
      <div className="bg-white shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-800 mb-2">Welcome to CollabBoard</h2>
          <p className="text-blue-600">
            Instant collaboration in a single space. Organize tasks and projects with your team in real-time.
          </p>
        </div>

        <div className="space-y-4">
          <Link to="/login" className="block w-full">
            <Button variant="primary" className="w-full py-3">
              Log In
            </Button>
          </Link>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-indigo-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-blue-600">New to CollabBoard?</span>
            </div>
          </div>

          <Link to="/register" className="block w-full">
            <Button variant="secondary" className="w-full py-3">
              Create an Account
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-blue-500">
          <p>
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </WelcomeTemplate>
  );
}
