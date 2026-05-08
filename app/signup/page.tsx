'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          store_name: shopName,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user && data.session) {
      router.push('/dashboard');
    } else {
      setSuccessMsg('Registration successful! Please check your email to verify your account.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20 text-center">
        <h1 className="text-4xl font-extrabold mb-6 tracking-tight">Register Your Shop</h1>
        
        <form onSubmit={handleSignup} className="flex flex-col space-y-4 w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-left">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-2">{error}</div>}
          {successMsg && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm mb-2">{successMsg}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name</label>
            <input 
              type="text" 
              placeholder="e.g. Bob's Quick Print" 
              value={shopName} 
              onChange={(e) => setShopName(e.target.value)} 
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" 
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              placeholder="Password (min 6 chars)" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" 
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !!successMsg}
            className="bg-emerald-600 text-white font-medium p-3 rounded-xl mt-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-6 flex flex-col items-center space-y-4">
           <p className="text-sm text-slate-600">
             Already registered? <Link href="/login" className="text-slate-900 font-semibold hover:underline">Log in</Link>
           </p>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
