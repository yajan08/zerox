'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleLogin = async (e) => { e.preventDefault(); };
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-extrabold mb-6 tracking-tight">Shop Owner Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col space-y-4 w-80 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" />
          <button type="submit" className="bg-slate-900 text-white font-medium p-3 rounded-xl hover:bg-slate-800 transition-colors">Login</button>
        </form>
        <div className="mt-6">
          <Link href="/?" className="text-sm text-slate-500 hover:text-slate-900">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}