/**
 * @file pages/LoginPage.jsx
 * @description Public login page for the RentManager app.
 * Handles email/password authentication, stores JWT via AuthContext,
 * and redirects to the dashboard on success.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

/**
 * LoginPage — full-screen centered form on a dark background.
 * On successful login the JWT token and owner profile are persisted
 * via AuthContext.login(), then the user is routed to the dashboard.
 */
const LoginPage = () => {
  const navigate        = useNavigate();
  const { login }       = useAuth();

  // Controlled form state
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /** Generic change handler for all inputs */
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /** Submit handler — calls authAPI.login and stores token */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!form.email.trim() || !form.password.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login({ email: form.email, password: form.password });
      const { token, owner } = res.data;

      // Persist token + owner in context and localStorage
      login(token, owner);

      toast.success(`Welcome back, ${owner.name}!`);
      navigate('/');
    } catch (err) {
      // Show the server error message or a fallback
      const message = err?.response?.data?.message || 'Invalid email or password.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      {/* Card container */}
      <div className="w-full max-w-md">

        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/40">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">RentManager</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to your account</p>
        </div>

        {/* Login Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl"
        >
          {/* Email Field */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500
                           rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500
                           rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent transition"
              />
              {/* Toggle password visibility */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed
                       text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center
                       justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
