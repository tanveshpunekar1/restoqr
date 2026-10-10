'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface LoginProps {
  onNavigate: (path: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMsg, setForgotMsg] = useState(false);

  const setDemoCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  const handleQuickLogin = async (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
    setLoading(true);
    try {
      const redirectUrl = await login(roleEmail, rolePass);
      onNavigate(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const redirectUrl = await login(email, password);
      onNavigate(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or restaurant suspended');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#ff4d2e] flex items-center justify-center text-white shadow-md shadow-[#ff4d2e]/30">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-xl text-slate-900 tracking-tight">Resto<span className="text-[#ff4d2e]">QR</span></span>
            <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ff4d2e]/10 text-[#ff4d2e] border border-[#ff4d2e]/20">Cloud POS & QR SaaS</span>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/60 relative overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#ff4d2e]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#ff4d2e]/10 text-[#ff4d2e] mb-3 border border-[#ff4d2e]/20">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-xs text-slate-500 font-medium mt-1.5">Sign in to manage your restaurant & POS terminal</p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ff4d2e] focus:border-[#ff4d2e] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotMsg(!forgotMsg)}
                  className="text-xs font-bold text-[#ff4d2e] hover:text-[#e03d1e] transition cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              {forgotMsg && (
                <div className="mb-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex flex-col gap-1">
                  <div className="font-bold text-amber-900">Credentials Help:</div>
                  <p>For password resets, contact super admin at <span className="font-mono font-bold text-slate-800">tanveshpunekar296@gmail.com</span>.</p>
                  <p className="text-slate-600">Or use one of the quick demo credentials below.</p>
                </div>
              )}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ff4d2e] focus:border-[#ff4d2e] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#ff4d2e] focus:ring-[#ff4d2e]"
              />
              <label htmlFor="remember" className="ml-2 text-xs font-medium text-slate-500 cursor-pointer select-none">
                Remember my session
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-black text-xs tracking-wide shadow-md shadow-[#ff4d2e]/30 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN TO DASHBOARD</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              ⚡ Quick Demo 1-Click Access
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('owner@urbanbites.com', 'Owner@12345')}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-left transition group cursor-pointer"
              >
                <div className="font-black text-amber-600 text-[11px]">Owner</div>
                <div className="text-[10px] text-slate-500 truncate">POS Admin</div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('kitchen@urbanbites.com', 'Kitchen@12345')}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-left transition group cursor-pointer"
              >
                <div className="font-black text-emerald-600 text-[11px]">Kitchen</div>
                <div className="text-[10px] text-slate-500 truncate">Live KDS</div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('waiter@urbanbites.com', 'Waiter@12345')}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-left transition group cursor-pointer"
              >
                <div className="font-black text-sky-600 text-[11px]">Waiter</div>
                <div className="text-[10px] text-slate-500 truncate">Floor Calls</div>
              </button>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => onNavigate('/menu/urban-bites-cafe/table/1')}
                className="w-full py-2.5 px-3 rounded-2xl bg-[#ff4d2e]/10 hover:bg-[#ff4d2e]/15 border border-[#ff4d2e]/30 text-[#ff4d2e] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>📱 Preview Customer QR Menu (Table 1)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center py-2 text-xs text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} RestoQR Platform. End-to-end multi-tenant restaurant QR ordering.
      </div>
    </div>
  );
};
