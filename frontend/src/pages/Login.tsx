import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SmokeyBackground } from '@/components/ui/smokey-background';
import { User, Lock, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.jpeg';

function getRedirectForRole(role: 'admin' | 'supplier'): string {
  return role === 'admin' ? '/admin' : '/dashboard';
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={getRedirectForRole(user.role)} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        navigate(getRedirectForRole(payload.role), { replace: true });
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        setError(axiosErr.response?.data?.error?.message || 'Invalid email or password');
      } else {
        setError('Unable to connect. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative w-screen h-screen bg-brand-darker overflow-hidden">
      <SmokeyBackground color="#8B6F1A" className="absolute inset-0" />

      <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
        <div className="w-full max-w-sm p-8 space-y-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
          {/* Logo & Header */}
          <div className="text-center">
            <img
              src={logo}
              alt="Aajil"
              className="mx-auto h-12 w-auto mb-4 rounded-lg"
            />
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="mt-1 text-sm text-gray-400">Sign in to your partner portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Email */}
            <div className="relative z-0">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-500 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer"
                placeholder=" "
                required
                autoComplete="email"
              />
              <label
                htmlFor="email"
                className="absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
              >
                <User className="inline-block mr-2 -mt-1" size={14} />
                Email Address
              </label>
            </div>

            {/* Password */}
            <div className="relative z-0">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-500 appearance-none focus:outline-none focus:ring-0 focus:border-brand-gold peer"
                placeholder=" "
                required
                autoComplete="current-password"
              />
              <label
                htmlFor="password"
                className="absolute text-sm text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-brand-gold peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
              >
                <Lock className="inline-block mr-2 -mt-1" size={14} />
                Password
              </label>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center py-3 px-4 bg-brand-gold hover:bg-brand-gold-light rounded-xl text-brand-darker font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && (
                <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500">
            Partner Referral Portal — Aajil
          </p>
        </div>
      </div>
    </main>
  );
}
