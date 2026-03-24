'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900 font-sans relative overflow-hidden">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-100 blur-3xl opacity-70 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <form
          onSubmit={handleLogin}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="bg-slate-900 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-slate-500 text-sm">
              Log in to manage your shop queue
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">
                Email
              </label>
              <input
                type="email"
                placeholder="shop@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition text-sm outline-none placeholder:text-slate-400"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">
                Password
              </label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition text-sm outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white p-3.5 rounded-xl font-medium hover:bg-slate-800 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
          </button>

          <p className="text-center text-sm text-slate-500 pt-2">
            Don&apos;t have a shop yet?{' '}
            <Link
              href="/signup"
              className="text-slate-900 hover:text-slate-700 font-medium"
            >
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
