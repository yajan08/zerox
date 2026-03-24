'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const adminId = userCredential.user.uid;
      await setDoc(doc(db, 'admins', adminId, 'settings', 'config'), {
        shopName,
        priceBWSingle: 2,
        priceBWDouble: 3,
        priceColorSingle: 10,
        priceColorDouble: 15,
      });
      toast.success('Shop registered successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register shop');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900 font-sans relative overflow-hidden">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-100 blur-3xl opacity-70 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <form
          onSubmit={handleSignup}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="bg-slate-900 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Register Shop</h1>
            <p className="text-slate-500 text-sm">
              Create an account to start accepting print jobs
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">
                Shop Name
              </label>
              <input
                type="text"
                placeholder="Xerox Point"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition text-sm outline-none placeholder:text-slate-400"
                required
              />
            </div>
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
                placeholder="Minimum 6 characters"
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register'}
          </button>

          <p className="text-center text-sm text-slate-500 pt-2">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-slate-900 hover:text-slate-700 font-medium"
            >
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
