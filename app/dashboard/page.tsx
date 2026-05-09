'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [shopName, setShopName] = useState('Loading...');
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
      
      // Fetch shop details
      const { data: shopData } = await supabase
        .from('shops')
        .select('store_name')
        .eq('id', session.user.id)
        .single();
        
      if (shopData) {
        setShopName(shopData.store_name);
      }
    };
    
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl">{shopName} Dashboard</div>
        <div className="flex items-center space-x-6">
          <button onClick={() => router.push('/dashboard/profile')} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Shop Profile & QR
          </button>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Print Queue</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
          {orders.length === 0 ? (
            <p>No orders in the queue right now.</p>
          ) : (
            <div>List of orders will go here</div>
          )}
        </div>
      </main>
    </div>
  );
}
