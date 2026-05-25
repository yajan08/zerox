'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Printer, FileText, CheckCircle, Edit2 } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function DashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [shopName, setShopName] = useState('Loading...');
  const [pricingBwSingle, setPricingBwSingle] = useState('0');
  const [pricingBwDouble, setPricingBwDouble] = useState('0');
  const [pricingColorSingle, setPricingColorSingle] = useState('0');
  const [pricingColorDouble, setPricingColorDouble] = useState('0');
  
  const [initialData, setInitialData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    
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
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (shopData) {
        setShopName(shopData.store_name);
        if (shopData.pricing_bw !== null) setPricingBwSingle(shopData.pricing_bw.toString());
        // Pull double prices directly from DB if the columns exist, otherwise fallback to 0
        if (shopData.pricing_bw_double !== undefined && shopData.pricing_bw_double !== null) {
          setPricingBwDouble(shopData.pricing_bw_double.toString());
        }
        
        if (shopData.pricing_color !== null) setPricingColorSingle(shopData.pricing_color.toString());
        if (shopData.pricing_color_double !== undefined && shopData.pricing_color_double !== null) {
          setPricingColorDouble(shopData.pricing_color_double.toString());
        }

        // Store a snapshot of what came from the DB to compare later
        setInitialData({
          store_name: shopData.store_name,
          pricing_bw: shopData.pricing_bw !== null ? shopData.pricing_bw.toString() : '0',
          pricing_bw_double: shopData.pricing_bw_double !== null && shopData.pricing_bw_double !== undefined ? shopData.pricing_bw_double.toString() : '0',
          pricing_color: shopData.pricing_color !== null ? shopData.pricing_color.toString() : '0',
          pricing_color_double: shopData.pricing_color_double !== null && shopData.pricing_color_double !== undefined ? shopData.pricing_color_double.toString() : '0',
        });
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

  useEffect(() => {
    if (initialData) {
      const isChanged = 
        shopName !== initialData.store_name ||
        pricingBwSingle !== initialData.pricing_bw ||
        pricingBwDouble !== initialData.pricing_bw_double ||
        pricingColorSingle !== initialData.pricing_color ||
        pricingColorDouble !== initialData.pricing_color_double;

      setHasChanges(isChanged);
    }
  }, [shopName, pricingBwSingle, pricingBwDouble, pricingColorSingle, pricingColorDouble, initialData]);

  const fetchOrders = async (shopId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }); // Newest first (latest on top)
    
    if (data) setOrders(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSavePricing = async () => {
    if (!hasChanges) return;
    
    setSaving(true);
    if (!userId) return;

    try {
      await supabase
        .from('shops')
        .update({ 
          store_name: shopName,
          pricing_bw: parseFloat(pricingBwSingle),
          pricing_bw_double: parseFloat(pricingBwDouble),
          pricing_color: parseFloat(pricingColorSingle),
          pricing_color_double: parseFloat(pricingColorDouble)
        })
        .eq('id', userId);
        
      setIsEditingName(false);
      
      // Update our snapshot to match what we just saved to the DB
      setInitialData({
        store_name: shopName,
        pricing_bw: pricingBwSingle,
        pricing_bw_double: pricingBwDouble,
        pricing_color: pricingColorSingle,
        pricing_color_double: pricingColorDouble,
      });
      setHasChanges(false);
      
      alert('Shop details saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    }
    setSaving(false);
  };

  const handlePrintQR = () => {
    // Print specifically the QR code avoiding the rest of the dashboard
    window.print();
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex print:bg-white print:block">
      {/* Printable QR Code Overlay specifically for printing */}
      <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:fixed print:inset-0 print:w-full print:h-full print:bg-white text-center">
        <h1 className="text-6xl font-extrabold mb-12 tracking-tight text-slate-900">
          {shopName || 'Your Shop'}
        </h1>
        <div className="scale-150 mb-16">
          {userId && origin && (
            <QRCode value={`${origin}/shop/${userId}`} size={300} level="H" />
          )}
        </div>
        <p className="text-4xl text-slate-800 font-bold mt-8">Scan to Print 🖨️</p>
        <p className="text-xl text-slate-500 mt-4">Send your PDFs securely directly to our queue</p>
      </div>

      {/* Left Sidebar */}
      <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col hidden md:flex print:hidden">
        <div className="p-6 border-b border-slate-200 flex items-center space-x-3">
          <div className="bg-slate-900 p-2 rounded-xl">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">XeroxFlow</span>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {/* QR Code Section */}
          <div className="mb-8 flex flex-col items-center">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 inline-block">
              {userId && origin ? (
                <QRCode value={`${origin}/shop/${userId}`} size={120} level="H" />
              ) : (
                <div className="w-[120px] h-[120px] bg-slate-200 rounded animate-pulse" />
              )}
            </div>
            
            <button 
              onClick={handlePrintQR}
              className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print / Download QR
            </button>
          </div>

          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Shop & Pricing</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Shop Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  readOnly={!isEditingName}
                  className={`w-full p-2.5 text-sm border rounded-lg focus:outline-none transition-colors ${isEditingName ? 'border-slate-800 bg-white ring-1 ring-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`} 
                />
                {!isEditingName && (
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">B&W Single (₹)</label>
                <input type="number" step="0.5" value={pricingBwSingle} onChange={(e) => {
                  setPricingBwSingle(e.target.value);
                }} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-colors text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">B&W Double (₹)</label>
                <input type="number" step="0.5" value={pricingBwDouble} onChange={(e) => setPricingBwDouble(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-colors text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Color Single (₹)</label>
                <input type="number" step="0.5" value={pricingColorSingle} onChange={(e) => {
                  setPricingColorSingle(e.target.value);
                }} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-colors text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Color Double (₹)</label>
                <input type="number" step="0.5" value={pricingColorDouble} onChange={(e) => setPricingColorDouble(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:border-slate-800 focus:ring-1 focus:ring-slate-800 focus:outline-none transition-colors text-slate-900" />
              </div>
            </div>
            
            <button 
              onClick={handleSavePricing}
              disabled={!hasChanges || saving}
              className="w-full bg-slate-900 text-white text-sm font-medium p-3 rounded-lg hover:bg-slate-800 mt-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
           <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors">
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto w-full max-w-5xl print:hidden">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Live Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time incoming print requests</p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Receiving updates</span>
          </div>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Printer className="w-6 h-6 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Queue is fully clear</h2>
              <p className="text-slate-500">New print orders will appear here instantly when<br/>customers upload them.</p>
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
