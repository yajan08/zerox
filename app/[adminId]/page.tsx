'use client';
import { useState, use } from 'react';
export default function ShopDropBoxPage({ params }: { params: Promise<{ adminId: string }> }) {
  const [file, setFile] = useState<File | null>(null);
  const resolvedParams = use(params);
  const handleUpload = async (e: React.FormEvent) => { e.preventDefault(); };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold mb-6">Upload Document</h1>
        <p className="mb-4">Shop ID: {resolvedParams.adminId}</p>
        <form onSubmit={handleUpload} className="flex flex-col space-y-4 w-80">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="p-2 border border-gray-300 rounded text-black" />
          <button type="submit" className="bg-purple-500 text-white p-2 rounded">Upload & Print</button>
        </form>
      </main>
    </div>
  );
}