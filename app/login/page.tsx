'use client';
import { useState } from 'react';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleLogin = async (e) => { e.preventDefault(); };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold mb-6">Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col space-y-4 w-80">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2 border border-gray-300 rounded text-black" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="p-2 border border-gray-300 rounded text-black" />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">Login</button>
        </form>
      </main>
    </div>
  );
}