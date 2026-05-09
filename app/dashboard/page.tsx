'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Printer, FileText, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [shopName, setShopName] = useState('Loading...');
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let subscription: any;

    const loadDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
      
      const { data: shopData } = await supabase
        .from('shops')
        .select('store_name')
        .eq('id', session.user.id)
        .single();
        
      if (shopData) {
        setShopName(shopData.store_name);
      }

      // 1. Fetch initial orders
      fetchOrders(session.user.id);

      // 2. Subscribe to real-time changes on the orders table
      subscription = supabase
        .channel(`orders_changes_${Date.now()}`)
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${session.user.id}` }, 
          (payload) => {
            console.log('Live update received!', payload);
            fetchOrders(session.user.id);
          }
        )
        .subscribe();
    };
    
    loadDashboard();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [router]);

  const fetchOrders = async (shopId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }); // Oldest first (first in, first out)
    
    if (data) setOrders(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handlePrint = async (order: any) => {
    try {
      // 1. Securely download the PDF blob from Supabase
      const { data, error } = await supabase.storage
        .from('xerox-files')
        .download(order.file_path);

      if (error) throw error;

      // 2. Create a temporary local URL for the blob (force application/pdf type)
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      
      // 3. Create a hidden iframe to bypass popup blockers and print flawlessly
      const iframe = document.createElement('iframe');
      // FIX 1: Don't use display: none! It prevents the browser from rendering the PDF.
      iframe.style.visibility = 'hidden';
      iframe.style.position = 'absolute';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      
      iframe.src = url;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        // Add a tiny delay to ensure the browser's PDF viewer has completely rendered the file
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          // FIX 2: Move the confirm box to trigger AFTER the print window closes
          // (The .print() function execution usually halts until the print dialog is closed)
          setTimeout(async () => {
            const didPrint = window.confirm("Did the document print successfully?\n\nClick OK to mark as completed and remove it from the queue.");
            
            if (didPrint) {
              await supabase
                .from('orders')
                .update({ status: 'completed' })
                .eq('id', order.id);

              if (userId) fetchOrders(userId);
            }

            // Cleanup
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 500);

        }, 200);
      };

    } catch (err) {
      console.error('Print failed:', err);
      alert('Failed to securely fetch the document for printing.');
    }
  };

  // Helper to make the filename pretty
  const formatFilename = (path: string) => {
    const parts = path.split('_');
    // Remove the timestamp prefix to get the original name
    return parts.slice(1).join('_') || path;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl">{shopName} Dashboard</div>
        <div className="flex items-center space-x-6">
          <Link href="/dashboard/profile" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Shop Profile & QR
          </Link>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 mt-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Active Print Queue</h1>
          <div className="flex items-center space-x-2 text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span>Live Sync On</span>
          </div>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">The queue is completely empty!</p>
              <p className="text-sm">Waiting for customers to scan your QR code...</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                
                <div className="flex items-center space-x-5">
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                    <FileText className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 truncate max-w-[300px]" title={formatFilename(order.file_path)}>
                      {formatFilename(order.file_path)}
                    </h3>
                    <div className="flex items-center space-x-3 mt-1 text-sm text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">Qty: {order.quantity}</span>
                      <span className={`px-2 py-0.5 rounded font-medium uppercase text-xs ${order.color_mode === 'color' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-800'}`}>
                        {order.color_mode}
                      </span>
                      <span>•</span>
                      <span>Arrived {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => handlePrint(order)}
                    className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
                  >
                    <Printer className="w-5 h-5" />
                    <span>Print Now</span>
                  </button>
                </div>

              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
