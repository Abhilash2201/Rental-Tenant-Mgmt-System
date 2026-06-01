/**
 * @file pages/RegisterPage.jsx
 * @description Public registration page for new property owners.
 * Registers the account, then immediately auto-logs in and redirects
 * to the dashboard so the user doesn't have to sign in twice.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Phone, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/**
 * RegisterPage — dark centered layout matching LoginPage aesthetics.
 * After a successful registration the server returns a token + owner
 * object so we auto-login without a second round-trip.
 */
const RegisterPage = () => {
  const navigate  = useNavigate();
  const { register } = useAuth();

  // Controlled form fields
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /** Generic change handler for all inputs */
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /** Submit: register → auto-login → navigate to dashboard */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validations
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Name, email and password are required.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Create Firebase Auth account — onAuthStateChanged will auto-create
      // the DB profile and PublicRoute will redirect to dashboard automatically
      await register(form.email, form.password, form.name);
      toast.success(`Account created! Welcome, ${form.name}!`);
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-8">
      {/* Card container — slightly wider to accommodate all fields */}
      <div className="w-full max-w-md">

        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/40">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">RentManager</h1>
          <p className="text-slate-400 mt-1 text-sm">Create your owner account</p>
        </div>

        {/* Registration Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl"
        >

          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                autoComplete="name"
                required
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500
                           rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Email */}
          <div className="mb-4">
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

          {/* Phone */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Phone number <span className="text-slate-500">(optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500
                           rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Password */}
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
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                required
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500
                           rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent transition"
              />
              {/* Toggle visibility */}
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
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
